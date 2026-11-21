import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import {
  CartItemData,
  Product,
  SizeCode,
  computeBagTotals,
  makeCartItemId,
  validateOrderInput,
} from './catalog';
import { OperationType, db, handleFirestoreError } from './firebase';
import { OrderStage, normalizeOrderStage } from './orderProgress';

export interface WishlistEntry {
  productId: string;
  title: string;
  priceCents: number;
}

export interface UserProfileRecord {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  emailSeasonalDrops: boolean;
}

export interface OrderRecord {
  orderId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  status: OrderStage;
  totalCents: number;
  itemsCount: number;
  items: {
    productId: string;
    title: string;
    size: SizeCode;
    priceCents: number;
    quantity: number;
  }[];
  createdAtMs: number;
}

const GUEST_CART_KEY = 'flipt_guest_cart_v1';

export function loadGuestCart(): CartItemData[] {
  try {
    const raw = window.localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestCart(items: CartItemData[]) {
  try {
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

export async function ensureUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const safeName = (user.displayName || user.email?.split('@')[0] || 'FLIP iT Member').slice(0, 100);
  const safeEmail = (user.email || 'member@flipt.store').slice(0, 200);
  const safePhoto = user.photoURL && user.photoURL.length <= 500 ? user.photoURL : undefined;

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const payload: Record<string, unknown> = {
        uid: user.uid,
        displayName: safeName,
        email: safeEmail,
        emailSeasonalDrops: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (safePhoto) {
        payload.photoURL = safePhoto;
      }
      await setDoc(ref, payload);
    } else {
      const payload: Record<string, unknown> = {
        displayName: safeName,
        email: safeEmail,
        updatedAt: serverTimestamp(),
      };
      if (safePhoto) {
        payload.photoURL = safePhoto;
      }
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserSeasonalDropsPreference(
  user: User,
  emailSeasonalDrops: boolean
): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await ensureUserProfile(user);
    }
    await updateDoc(ref, {
      emailSeasonalDrops: Boolean(emailSeasonalDrops),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfileRecord | null) => void
): () => void {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data();
      onData({
        uid: String(data.uid || uid),
        displayName: String(data.displayName || 'FLIP iT Member'),
        email: String(data.email || ''),
        photoURL: typeof data.photoURL === 'string' ? data.photoURL : undefined,
        emailSeasonalDrops: Boolean(data.emailSeasonalDrops),
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function mergeGuestCartIntoFirestore(user: User, guestItems: CartItemData[]): Promise<void> {
  if (!guestItems.length) return;
  for (const item of guestItems) {
    const path = `users/${user.uid}/cart/${item.itemId}`;
    const ref = doc(db, 'users', user.uid, 'cart', item.itemId);
    try {
      const existingSnap = await getDoc(ref);
      if (existingSnap.exists()) {
        const prevQty = Number(existingSnap.data().quantity) || 1;
        const nextQty = Math.min(20, prevQty + item.quantity);
        await updateDoc(ref, {
          quantity: nextQty,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          itemId: item.itemId,
          productId: item.productId.slice(0, 64),
          title: item.title.slice(0, 120),
          category: item.category,
          colorway: item.colorway.slice(0, 60),
          size: item.size,
          priceCents: Math.max(100, Math.min(500000, Math.round(item.priceCents))),
          quantity: Math.max(1, Math.min(20, Math.round(item.quantity))),
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
  saveGuestCart([]);
}

export async function addProductToFirestoreCart(
  user: User,
  product: Product,
  size: SizeCode,
  quantity = 1
): Promise<void> {
  const itemId = makeCartItemId(product.id, size);
  const path = `users/${user.uid}/cart/${itemId}`;
  const ref = doc(db, 'users', user.uid, 'cart', itemId);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const prevQty = Number(snap.data().quantity) || 1;
      await updateDoc(ref, {
        quantity: Math.min(20, prevQty + quantity),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        itemId,
        productId: product.id.slice(0, 64),
        title: product.title.slice(0, 120),
        category: product.category,
        colorway: product.colorway.slice(0, 60),
        size,
        priceCents: product.priceCents,
        quantity: Math.max(1, Math.min(20, quantity)),
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateFirestoreCartQty(
  user: User,
  itemId: string,
  nextQty: number
): Promise<void> {
  const path = `users/${user.uid}/cart/${itemId}`;
  const ref = doc(db, 'users', user.uid, 'cart', itemId);
  try {
    if (nextQty <= 0) {
      await deleteDoc(ref);
    } else {
      await updateDoc(ref, {
        quantity: Math.min(20, Math.max(1, Math.round(nextQty))),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeFirestoreCartItem(user: User, itemId: string): Promise<void> {
  const path = `users/${user.uid}/cart/${itemId}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'cart', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function toggleFirestoreWishlist(
  user: User,
  product: Product,
  currentlySaved: boolean
): Promise<void> {
  const path = `users/${user.uid}/wishlist/${product.id}`;
  const ref = doc(db, 'users', user.uid, 'wishlist', product.id);
  try {
    if (currentlySaved) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        productId: product.id.slice(0, 64),
        title: product.title.slice(0, 120),
        priceCents: product.priceCents,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function placeFirestoreOrder(
  user: User,
  items: CartItemData[],
  shippingAddress: string
): Promise<string> {
  const validation = validateOrderInput({ shippingAddress, items });
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  const totals = computeBagTotals(items);
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const orderPath = `orders/${orderId}`;

  try {
    const batch = writeBatch(db);
    const orderRef = doc(db, 'orders', orderId);
    batch.set(orderRef, {
      orderId,
      userId: user.uid,
      customerName: (user.displayName || user.email?.split('@')[0] || 'FLIP iT Member').slice(0, 100),
      customerEmail: (user.email || 'member@flipt.store').slice(0, 200),
      shippingAddress: validation.sanitizedAddress,
      status: 'processing',
      totalCents: Math.max(100, Math.min(5000000, totals.subtotalCents)),
      itemsCount: Math.max(1, Math.min(50, totals.itemsCount)),
      items: validation.orderItems,
      createdAt: serverTimestamp(),
    });

    for (const item of items) {
      const cartRef = doc(db, 'users', user.uid, 'cart', item.itemId);
      batch.delete(cartRef);
    }

    await batch.commit();
    return orderId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, orderPath);
  }
}

export function subscribeUserCart(
  uid: string,
  onData: (items: CartItemData[]) => void
): () => void {
  const path = `users/${uid}/cart`;
  const q = query(collection(db, 'users', uid, 'cart'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: CartItemData[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          itemId: String(data.itemId || d.id),
          productId: String(data.productId || ''),
          title: String(data.title || ''),
          category: data.category,
          colorway: String(data.colorway || ''),
          size: data.size,
          priceCents: Number(data.priceCents) || 0,
          quantity: Number(data.quantity) || 1,
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserWishlist(
  uid: string,
  onData: (items: WishlistEntry[]) => void
): () => void {
  const path = `users/${uid}/wishlist`;
  const q = query(collection(db, 'users', uid, 'wishlist'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: WishlistEntry[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          productId: String(data.productId || d.id),
          title: String(data.title || ''),
          priceCents: Number(data.priceCents) || 0,
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserOrders(
  uid: string,
  onData: (orders: OrderRecord[]) => void
): () => void {
  const path = 'orders';
  const q = query(collection(db, 'orders'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: OrderRecord[] = snap.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt as Timestamp | undefined;
        return {
          orderId: String(data.orderId || d.id),
          userId: String(data.userId || uid),
          customerName: String(data.customerName || ''),
          customerEmail: String(data.customerEmail || ''),
          shippingAddress: String(data.shippingAddress || ''),
          status: normalizeOrderStage(data.status),
          totalCents: Number(data.totalCents) || 0,
          itemsCount: Number(data.itemsCount) || 1,
          items: Array.isArray(data.items) ? data.items : [],
          createdAtMs: ts && typeof ts.toMillis === 'function' ? ts.toMillis() : Date.now(),
        };
      });
      list.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
