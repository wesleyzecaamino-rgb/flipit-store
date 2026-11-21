import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  Download,
  ExternalLink,
  Lock,
  LogOut,
  Minus,
  Pause,
  Play,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import {
  CATEGORIES,
  CartItemData,
  CategoryId,
  LOOKBOOK_FRAMES,
  PRODUCTS,
  Product,
  SizeCode,
  computeBagTotals,
  filterCatalogProducts,
  formatPrice,
  getProductById,
  isProductOnSale,
  makeCartItemId,
  parseProductShareParam,
  validateOrderInput,
} from './catalog';
import { CarrierTrackingPage } from './components/CarrierTrackingPage';
import { CroppedArt } from './components/CroppedArt';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OrderEmailToast } from './components/OrderEmailToast';
import { OrderStatusProgress } from './components/OrderStatusProgress';
import { ShareProductButton } from './components/ShareProductButton';
import { VaultRealtimeToast } from './components/VaultRealtimeToast';
import { WishlistButton } from './components/WishlistButton';
import {
  ORDER_DATE_FILTER_OPTIONS,
  OrderDateRangeFilter,
  OrderStage,
  OrderStatusAlert,
  buildCarrierTrackingHref,
  buildOrderHistoryCsv,
  buildOrderHistoryFilename,
  detectOrderStatusChanges,
  filterOrders,
  formatOrderDate,
  getOrderProgress,
  parseCarrierTrackingParams,
} from './orderProgress';
import { auth, googleProvider } from './firebase';
import {
  OrderRecord,
  WishlistEntry,
  addProductToFirestoreCart,
  ensureUserProfile,
  loadGuestCart,
  mergeGuestCartIntoFirestore,
  placeFirestoreOrder,
  removeFirestoreCartItem,
  saveGuestCart,
  subscribeUserCart,
  subscribeUserOrders,
  subscribeUserProfile,
  subscribeUserWishlist,
  toggleFirestoreWishlist,
  updateFirestoreCartQty,
  updateUserSeasonalDropsPreference,
} from './storeClient';

type ActiveView =
  | { type: 'none' }
  | { type: 'catalog'; category: CategoryId }
  | { type: 'product'; product: Product }
  | { type: 'lookbook'; frameIndex: number }
  | { type: 'vault'; tab: 'bag' | 'account' };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  const [cart, setCart] = useState<CartItemData[]>(() => loadGuestCart());
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [orderStatusAlerts, setOrderStatusAlerts] = useState<OrderStatusAlert[]>([]);
  const [activeVaultToast, setActiveVaultToast] = useState<OrderStatusAlert | null>(null);
  const prevOrderStatusesRef = useRef<Map<string, OrderStage> | null>(null);
  const [emailSeasonalDrops, setEmailSeasonalDrops] = useState(false);
  const [dropsPrefBusy, setDropsPrefBusy] = useState(false);
  const [dropsPrefError, setDropsPrefError] = useState('');

  const initialSharedProduct = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    if (parseCarrierTrackingParams(window.location.search)) return undefined;
    return parseProductShareParam(window.location.search);
  }, []);

  const [view, setView] = useState<ActiveView>(() =>
    initialSharedProduct ? { type: 'product', product: initialSharedProduct } : { type: 'none' }
  );
  const [catalogSearch, setCatalogSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderDateFilter, setOrderDateFilter] = useState<OrderDateRangeFilter>('all');
  const [selectedSize, setSelectedSize] = useState<SizeCode>(() => {
    if (!initialSharedProduct) return 'M';
    return initialSharedProduct.sizes.includes('M') ? 'M' : initialSharedProduct.sizes[0];
  });
  const [addedToast, setAddedToast] = useState(false);

  const [reelPlaying, setReelPlaying] = useState(true);
  const [shippingAddress, setShippingAddress] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const trackingParams = useMemo(
    () =>
      typeof window !== 'undefined' ? parseCarrierTrackingParams(window.location.search) : null,
    []
  );

  const totals = useMemo(() => computeBagTotals(cart), [cart]);

  // Auth listener + Firestore live sync
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        try {
          await ensureUserProfile(nextUser);
          const guestItems = loadGuestCart();
          if (guestItems.length > 0) {
            await mergeGuestCartIntoFirestore(nextUser, guestItems);
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        setCart(loadGuestCart());
        setWishlist([]);
        setOrders([]);
        setOrderStatusAlerts([]);
        setActiveVaultToast(null);
        prevOrderStatusesRef.current = null;
        setOrderSearch('');
        setOrderDateFilter('all');
        setEmailSeasonalDrops(false);
        setDropsPrefError('');
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    prevOrderStatusesRef.current = null;
    const unsubProfile = subscribeUserProfile(user.uid, (profile) => {
      if (profile) {
        setEmailSeasonalDrops(profile.emailSeasonalDrops);
      }
    });
    const unsubCart = subscribeUserCart(user.uid, setCart);
    const unsubWish = subscribeUserWishlist(user.uid, setWishlist);
    const unsubOrders = subscribeUserOrders(user.uid, (nextOrders) => {
      const { nextStatuses, alerts } = detectOrderStatusChanges(
        prevOrderStatusesRef.current,
        nextOrders
      );
      prevOrderStatusesRef.current = nextStatuses;
      setOrders(nextOrders);
      if (alerts.length > 0) {
        setOrderStatusAlerts((prev) => [...alerts, ...prev].slice(0, 5));
        setActiveVaultToast(alerts[0]);
      }
    });
    return () => {
      prevOrderStatusesRef.current = null;
      unsubProfile();
      unsubCart();
      unsubWish();
      unsubOrders();
    };
  }, [authReady, user]);

  // Auto-dismiss real-time vault toast after 7 seconds
  useEffect(() => {
    if (!activeVaultToast) return;
    const timer = window.setTimeout(() => {
      setActiveVaultToast(null);
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [activeVaultToast]);

  // Reflect bag count and sign-in label on the landing page nav controls
  useEffect(() => {
    const badge = document.querySelector<HTMLElement>('[data-bag-badge]');
    if (badge) {
      if (totals.itemsCount > 0) {
        badge.textContent = String(totals.itemsCount);
        badge.style.display = 'inline-flex';
      } else {
        badge.textContent = '';
        badge.style.display = 'none';
      }
    }
    const signInPill = document.querySelector<HTMLElement>('.nav-pill');
    if (signInPill) {
      signInPill.textContent = user ? 'ACCOUNT' : 'SIGN  IN / UP';
    }
  }, [totals.itemsCount, user]);

  // Listen to landing page click events dispatched from index.html
  useEffect(() => {
    const onOpenCatalog = (e: Event) => {
      const cat = ((e as CustomEvent<{ category?: CategoryId }>).detail?.category || 'ALL') as CategoryId;
      setCatalogSearch('');
      setView({ type: 'catalog', category: cat });
    };
    const onOpenProduct = (e: Event) => {
      const pid = (e as CustomEvent<{ productId?: string }>).detail?.productId;
      const prod = pid ? getProductById(pid) : PRODUCTS[0];
      if (prod) {
        setSelectedSize(prod.sizes.includes('M') ? 'M' : prod.sizes[0]);
        setAddedToast(false);
        setView({ type: 'product', product: prod });
      }
    };
    const onOpenLookbook = () => {
      setReelPlaying(true);
      setView({ type: 'lookbook', frameIndex: 0 });
    };
    const onOpenVault = (e: Event) => {
      const tab = (e as CustomEvent<{ tab?: 'bag' | 'account' }>).detail?.tab || 'bag';
      setCheckoutError('');
      setView({ type: 'vault', tab });
    };

    window.addEventListener('flipt:open-catalog', onOpenCatalog);
    window.addEventListener('flipt:open-product', onOpenProduct);
    window.addEventListener('flipt:open-lookbook', onOpenLookbook);
    window.addEventListener('flipt:open-vault', onOpenVault);

    return () => {
      window.removeEventListener('flipt:open-catalog', onOpenCatalog);
      window.removeEventListener('flipt:open-product', onOpenProduct);
      window.removeEventListener('flipt:open-lookbook', onOpenLookbook);
      window.removeEventListener('flipt:open-vault', onOpenVault);
    };
  }, []);

  // Escape key closes active modal/drawer
  useEffect(() => {
    if (view.type === 'none') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setView({ type: 'none' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view.type]);

  // Lookbook auto-advance
  useEffect(() => {
    if (view.type !== 'lookbook' || !reelPlaying) return;
    const timer = window.setInterval(() => {
      setView((curr) =>
        curr.type === 'lookbook'
          ? { type: 'lookbook', frameIndex: (curr.frameIndex + 1) % LOOKBOOK_FRAMES.length }
          : curr
      );
    }, 3200);
    return () => window.clearInterval(timer);
  }, [view.type, reelPlaying]);

  const handleSignIn = useCallback(async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to complete Google sign-in.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setAuthBusy(true);
    try {
      await signOut(auth);
      setLastOrderId(null);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleToggleSeasonalDrops = useCallback(async () => {
    if (!user || dropsPrefBusy) return;
    const nextValue = !emailSeasonalDrops;
    setDropsPrefBusy(true);
    setDropsPrefError('');
    setEmailSeasonalDrops(nextValue);
    try {
      await updateUserSeasonalDropsPreference(user, nextValue);
    } catch (err) {
      setEmailSeasonalDrops(!nextValue);
      setDropsPrefError(
        err instanceof Error ? err.message : 'Unable to save notification preference.'
      );
    } finally {
      setDropsPrefBusy(false);
    }
  }, [user, dropsPrefBusy, emailSeasonalDrops]);

  const handleAddToBag = useCallback(
    async (product: Product, size: SizeCode) => {
      const itemId = makeCartItemId(product.id, size);
      if (user) {
        await addProductToFirestoreCart(user, product, size, 1);
      } else {
        setCart((prev) => {
          const existing = prev.find((i) => i.itemId === itemId);
          const next = existing
            ? prev.map((i) =>
                i.itemId === itemId ? { ...i, quantity: Math.min(20, i.quantity + 1) } : i
              )
            : [
                ...prev,
                {
                  itemId,
                  productId: product.id,
                  title: product.title,
                  category: product.category,
                  colorway: product.colorway,
                  size,
                  priceCents: product.priceCents,
                  quantity: 1,
                },
              ];
          saveGuestCart(next);
          return next;
        });
      }
      setAddedToast(true);
    },
    [user]
  );

  const handleUpdateQty = useCallback(
    async (itemId: string, nextQty: number) => {
      if (user) {
        await updateFirestoreCartQty(user, itemId, nextQty);
      } else {
        setCart((prev) => {
          const next =
            nextQty <= 0
              ? prev.filter((i) => i.itemId !== itemId)
              : prev.map((i) =>
                  i.itemId === itemId ? { ...i, quantity: Math.min(20, nextQty) } : i
                );
          saveGuestCart(next);
          return next;
        });
      }
    },
    [user]
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      if (user) {
        await removeFirestoreCartItem(user, itemId);
      } else {
        setCart((prev) => {
          const next = prev.filter((i) => i.itemId !== itemId);
          saveGuestCart(next);
          return next;
        });
      }
    },
    [user]
  );

  const handleToggleWishlist = useCallback(
    async (product: Product) => {
      if (!user) {
        setAuthBusy(true);
        setAuthError('');
        try {
          const cred = await signInWithPopup(auth, googleProvider);
          await ensureUserProfile(cred.user);
          await toggleFirestoreWishlist(cred.user, product, false);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unable to complete Google sign-in.';
          if (!msg.includes('popup-closed-by-user')) {
            setAuthError(msg);
          }
        } finally {
          setAuthBusy(false);
        }
        return;
      }
      const saved = wishlist.some((w) => w.productId === product.id);
      await toggleFirestoreWishlist(user, product, saved);
    },
    [user, wishlist]
  );

  const handlePlaceOrder = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setCheckoutError('');
      if (!user) {
        await handleSignIn();
        return;
      }
      const check = validateOrderInput({ shippingAddress, items: cart });
      if (!check.ok) {
        setCheckoutError(check.error);
        return;
      }
      setCheckoutBusy(true);
      try {
        const orderId = await placeFirestoreOrder(user, cart, shippingAddress);
        setLastOrderId(orderId);
        setShippingAddress('');
        setView({ type: 'vault', tab: 'account' });
      } catch (err) {
        setCheckoutError(err instanceof Error ? err.message : 'Order failed. Please try again.');
      } finally {
        setCheckoutBusy(false);
      }
    },
    [user, cart, shippingAddress, handleSignIn]
  );

  const openProductModal = (product: Product) => {
    setSelectedSize(product.sizes.includes('M') ? 'M' : product.sizes[0]);
    setAddedToast(false);
    setView({ type: 'product', product });
  };

  const handleDownloadOrderHistory = useCallback(() => {
    if (!user || orders.length === 0) return;
    const csv = buildOrderHistoryCsv(orders);
    const filename = buildOrderHistoryFilename();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1000);
  }, [user, orders]);

  if (trackingParams) {
    return (
      <ErrorBoundary>
        <CarrierTrackingPage params={trackingParams} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {view.type !== 'none' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#26132A]/45 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setView({ type: 'none' });
          }}
        >
          {/* 1. CATALOG DRAWER */}
          {view.type === 'catalog' && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="FLIP iT Shop Catalog"
              className="fixed inset-y-0 right-0 flex w-full max-w-3xl flex-col bg-[#F4EEF6] text-[#26132A] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#C9B6CF]/60 px-6 py-5">
                <div>
                  <span className="inline-flex h-6 items-center rounded-full bg-[#2D1833] px-3 text-[11px] font-medium tracking-wide text-[#F3E6F6]">
                    WINTER DROP CATALOG
                  </span>
                  <h2 className="mt-2 text-2xl font-bold uppercase tracking-tight">
                    FLIP iT Knitwear & Fleece
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView({ type: 'vault', tab: 'bag' })}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[#2D1833] px-4 text-xs font-medium text-white hover:opacity-90"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    BAG ({totals.itemsCount})
                  </button>
                  <button
                    type="button"
                    aria-label="Close catalog"
                    onClick={() => setView({ type: 'none' })}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#C9B6CF] bg-white text-[#26132A] hover:bg-[#EFE6F1]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 border-b border-[#C9B6CF]/40 bg-[#EFE6F1]/70 px-6 py-3">
                <div className="relative flex items-center">
                  <label htmlFor="catalog-search" className="sr-only">
                    Search products by title
                  </label>
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#6E5873]"
                  />
                  <input
                    id="catalog-search"
                    type="text"
                    role="searchbox"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search knitwear & fleece by title..."
                    className="h-10 w-full rounded-full border border-[#C9B6CF] bg-white pl-10 pr-10 text-xs font-medium text-[#26132A] placeholder:text-[#6E5873]/75 focus:border-[#2D1833] focus:outline-none"
                  />
                  {catalogSearch.trim().length > 0 && (
                    <button
                      type="button"
                      aria-label="Clear search query"
                      onClick={() => setCatalogSearch('')}
                      className="absolute right-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-[#6E5873] hover:bg-[#EFE6F1] hover:text-[#26132A]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {CATEGORIES.map((cat) => {
                    const active = view.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setView({ type: 'catalog', category: cat.id })}
                        className={`h-8 rounded-full px-4 text-xs font-medium transition ${
                          active
                            ? 'bg-[#2D1833] text-white'
                            : 'bg-white text-[#26132A] hover:bg-[#E4D0EA]/60'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {(() => {
                  const visibleProducts = filterCatalogProducts(view.category, catalogSearch);
                  if (visibleProducts.length === 0) {
                    return (
                      <div className="rounded-2xl border border-[#C9B6CF]/60 bg-[#F8F1F9] p-8 text-center">
                        <p className="text-sm font-bold uppercase tracking-tight text-[#26132A]">
                          No pieces found
                        </p>
                        <p className="mt-1.5 text-xs text-[#6E5873]">
                          No items match &ldquo;{catalogSearch.trim()}&rdquo;
                          {view.category !== 'ALL' ? ` in ${view.category}` : ''}.
                        </p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                          {catalogSearch.trim().length > 0 && (
                            <button
                              type="button"
                              onClick={() => setCatalogSearch('')}
                              className="h-9 rounded-full bg-[#2D1833] px-5 text-xs font-medium text-white hover:opacity-90"
                            >
                              Clear search
                            </button>
                          )}
                          {view.category !== 'ALL' && (
                            <button
                              type="button"
                              onClick={() => setView({ type: 'catalog', category: 'ALL' })}
                              className="h-9 rounded-full border border-[#C9B6CF] bg-white px-5 text-xs font-medium text-[#26132A] hover:bg-[#EFE6F1]"
                            >
                              Show all categories
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {visibleProducts.map((product) => {
                        const onSale = isProductOnSale(product);
                        return (
                          <article
                            key={product.id}
                            className="group flex flex-col overflow-hidden rounded-2xl border border-[#C9B6CF]/60 bg-[#F8F1F9] transition hover:border-[#8E6A99]"
                          >
                            <button
                              type="button"
                              onClick={() => openProductModal(product)}
                              className="relative aspect-[4/4.4] w-full shrink-0 overflow-hidden text-left"
                            >
                              <CroppedArt
                                crop={product.image}
                                alt={product.title}
                                className="h-full w-full transition duration-300 group-hover:scale-[1.03]"
                              />
                              <span className="absolute left-3 top-3 rounded-full bg-[#2D1833]/85 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
                                {product.category}
                              </span>
                              {onSale && (
                                <span
                                  data-testid="sale-tag"
                                  className="absolute right-3 top-3 rounded-full bg-[#9F1239] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm"
                                >
                                  Sale
                                </span>
                              )}
                            </button>
                            <div className="flex flex-1 flex-col justify-between p-4">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="text-sm font-semibold leading-snug text-[#26132A]">
                                    {product.title}
                                  </h3>
                                  <div className="flex shrink-0 flex-col items-end text-right">
                                    <span
                                      className={`text-sm font-bold ${
                                        onSale ? 'text-[#9F1239]' : 'text-[#26132A]'
                                      }`}
                                    >
                                      {formatPrice(product.priceCents)}
                                    </span>
                                    {onSale && product.msrpCents !== undefined && (
                                      <span className="text-[11px] font-medium text-[#6E5873] line-through">
                                        {formatPrice(product.msrpCents)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="mt-1 text-xs text-[#6E5873]">{product.colorway}</p>
                              </div>
                            <div className="mt-4 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openProductModal(product)}
                                className="h-9 flex-1 rounded-full border border-[#C9B6CF] bg-white text-xs font-medium text-[#26132A] hover:bg-[#EFE6F1]"
                              >
                                Open Item
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const defaultSize = product.sizes.includes('M')
                                    ? 'M'
                                    : product.sizes[0];
                                  void handleAddToBag(product, defaultSize);
                                }}
                                className="h-9 rounded-full bg-[#2D1833] px-4 text-xs font-medium text-white hover:opacity-90"
                              >
                                + Bag
                              </button>
                            </div>
                          </div>
                        </article>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 2. PRODUCT QUICK-VIEW MODAL */}
          {view.type === 'product' && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={view.product.title}
              className="relative mx-4 grid w-full max-w-3xl grid-cols-1 overflow-hidden rounded-[28px] border border-[#C9B6CF] bg-[#F8F1F9] text-[#26132A] shadow-2xl md:grid-cols-2"
            >
              <button
                type="button"
                aria-label="Close item details"
                onClick={() => setView({ type: 'none' })}
                className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#26132A] shadow hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative min-h-[280px] bg-[#E4D0EA] md:min-h-[460px]">
                <CroppedArt
                  crop={view.product.image}
                  alt={view.product.title}
                  className="h-full w-full"
                />
              </div>

              <div className="flex flex-col justify-between p-6 md:p-8">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-6 items-center rounded-full bg-[#2D1833] px-3 text-[11px] font-medium uppercase tracking-wide text-[#F3E6F6]">
                      {view.product.category}
                    </span>
                    {isProductOnSale(view.product) && (
                      <span className="inline-flex h-6 items-center rounded-full bg-[#9F1239] px-2.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                        Sale
                      </span>
                    )}
                    <span className="text-xs font-medium text-[#6E5873]">
                      {view.product.colorway}
                    </span>
                  </div>

                  <h2 className="mt-3 text-2xl font-bold uppercase leading-tight tracking-tight">
                    {view.product.title}
                  </h2>
                  <div className="mt-1 flex items-baseline gap-2.5">
                    <p
                      className={`text-lg font-semibold ${
                        isProductOnSale(view.product) ? 'text-[#9F1239]' : 'text-[#26132A]'
                      }`}
                    >
                      {formatPrice(view.product.priceCents)}
                    </p>
                    {isProductOnSale(view.product) && view.product.msrpCents !== undefined && (
                      <span className="text-sm font-medium text-[#6E5873] line-through">
                        {formatPrice(view.product.msrpCents)}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[#6E5873]">
                    {view.product.description}
                  </p>
                  <p className="mt-2 text-xs text-[#6E5873]">{view.product.fabricNote}</p>

                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#26132A]">
                        Select Size
                      </span>
                      <span className="text-xs text-[#6E5873]">Relaxed Studio Cut</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {view.product.sizes.map((sz) => {
                        const active = selectedSize === sz;
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => {
                              setSelectedSize(sz);
                              setAddedToast(false);
                            }}
                            className={`h-9 min-w-[44px] rounded-full border px-3 text-xs font-semibold transition ${
                              active
                                ? 'border-[#2D1833] bg-[#2D1833] text-white'
                                : 'border-[#C9B6CF] bg-white text-[#26132A] hover:bg-[#EFE6F1]'
                            }`}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleAddToBag(view.product, selectedSize)}
                      className="h-11 flex-1 rounded-full bg-[#2D1833] px-5 text-xs font-semibold uppercase tracking-wide text-white hover:opacity-90"
                    >
                      {addedToast
                        ? `Added (${selectedSize}) — Add Another`
                        : `Add to Bag — ${formatPrice(view.product.priceCents)}`}
                    </button>
                    <WishlistButton
                      productId={view.product.id}
                      saved={wishlist.some((w) => w.productId === view.product.id)}
                      onToggle={() => void handleToggleWishlist(view.product)}
                    />
                  </div>

                  <ShareProductButton
                    productId={view.product.id}
                    productTitle={view.product.title}
                  />

                  {addedToast && (
                    <button
                      type="button"
                      onClick={() => setView({ type: 'vault', tab: 'bag' })}
                      className="h-10 w-full rounded-full border border-[#2D1833] bg-white text-xs font-semibold uppercase tracking-wide text-[#26132A] hover:bg-[#EFE6F1]"
                    >
                      View Bag ({totals.itemsCount}) & Checkout
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setView({ type: 'catalog', category: 'ALL' })}
                    className="w-full py-1 text-center text-xs font-medium text-[#6E5873] underline-offset-2 hover:underline"
                  >
                    Browse Full Winter Collection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. LOOKBOOK REEL MODAL */}
          {view.type === 'lookbook' && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="FLIP iT Winter Lookbook Reel"
              className="relative mx-4 w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#C9B6CF] bg-[#26132A] text-white shadow-2xl"
            >
              {(() => {
                const frame = LOOKBOOK_FRAMES[view.frameIndex] || LOOKBOOK_FRAMES[0];
                const linkedProduct = getProductById(frame.productId);
                return (
                  <>
                    <div className="relative aspect-[16/11] w-full overflow-hidden">
                      <CroppedArt crop={frame.image} alt={frame.label} className="h-full w-full" />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#26132A] via-transparent to-[#26132A]/40" />

                      <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
                        <span className="rounded-full bg-[#2D1833]/80 px-3 py-1 text-[11px] font-medium tracking-wider text-[#F3E6F6] backdrop-blur">
                          {frame.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={reelPlaying ? 'Pause reel' : 'Play reel'}
                            onClick={() => setReelPlaying((p) => !p)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
                          >
                            {reelPlaying ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            aria-label="Close lookbook"
                            onClick={() => setView({ type: 'none' })}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-4">
                        <p className="max-w-md text-sm leading-relaxed text-[#F3E6F6]">
                          {frame.caption}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            aria-label="Previous look"
                            onClick={() =>
                              setView({
                                type: 'lookbook',
                                frameIndex:
                                  (view.frameIndex - 1 + LOOKBOOK_FRAMES.length) %
                                  LOOKBOOK_FRAMES.length,
                              })
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Next look"
                            onClick={() =>
                              setView({
                                type: 'lookbook',
                                frameIndex: (view.frameIndex + 1) % LOOKBOOK_FRAMES.length,
                              })
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#2D1833] px-5 py-4">
                      <div className="flex gap-1.5">
                        {LOOKBOOK_FRAMES.map((f, idx) => (
                          <button
                            key={f.id}
                            type="button"
                            aria-label={`Jump to frame ${idx + 1}`}
                            onClick={() => setView({ type: 'lookbook', frameIndex: idx })}
                            className={`h-1.5 rounded-full transition-all ${
                              idx === view.frameIndex ? 'w-8 bg-white' : 'w-3 bg-white/35'
                            }`}
                          />
                        ))}
                      </div>
                      {linkedProduct && (
                        <button
                          type="button"
                          onClick={() => openProductModal(linkedProduct)}
                          className="h-9 rounded-full bg-white px-4 text-xs font-semibold uppercase tracking-wide text-[#26132A] hover:bg-[#EFE6F1]"
                        >
                          Shop {linkedProduct.title} — {formatPrice(linkedProduct.priceCents)}
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* 4. MEMBER VAULT / BAG & ORDERS DRAWER */}
          {view.type === 'vault' && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="FLIP iT Bag and Member Vault"
              className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col bg-[#F4EEF6] text-[#26132A] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#C9B6CF]/60 px-6 py-5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2D1833] text-white">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold uppercase tracking-tight">Member Vault</h2>
                    <p className="text-xs text-[#6E5873]">
                      {user ? user.email : 'Sign in to sync bag & orders'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close vault"
                  onClick={() => setView({ type: 'none' })}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#C9B6CF] bg-white text-[#26132A] hover:bg-[#EFE6F1]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Tabs */}
              <div className="grid grid-cols-2 gap-2 border-b border-[#C9B6CF]/50 bg-[#EFE6F1] px-6 py-2.5">
                <button
                  type="button"
                  onClick={() => setView({ type: 'vault', tab: 'bag' })}
                  className={`h-9 rounded-full text-xs font-semibold uppercase tracking-wide transition ${
                    view.tab === 'bag'
                      ? 'bg-[#2D1833] text-white'
                      : 'bg-white text-[#26132A] hover:bg-[#E4D0EA]/50'
                  }`}
                >
                  Bag ({totals.itemsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setView({ type: 'vault', tab: 'account' })}
                  className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition ${
                    view.tab === 'account'
                      ? 'bg-[#2D1833] text-white'
                      : 'bg-white text-[#26132A] hover:bg-[#E4D0EA]/50'
                  }`}
                >
                  <span>Account &amp; Orders</span>
                  {orderStatusAlerts.length > 0 && (
                    <span
                      aria-hidden="true"
                      className={`inline-block h-2 w-2 rounded-full ${
                        view.tab === 'account' ? 'bg-[#E4D0EA]' : 'bg-[#2D1833]'
                      }`}
                    />
                  )}
                </button>
              </div>

              {/* Drawer Body + Floating Real-Time Toast */}
              <div className="relative flex flex-1 flex-col overflow-hidden">
                {user && (
                  <VaultRealtimeToast
                    alert={activeVaultToast}
                    onDismiss={() => setActiveVaultToast(null)}
                    onViewOrder={(orderId) => {
                      setActiveVaultToast(null);
                      setOrderSearch('');
                      setOrderDateFilter('all');
                      setView({ type: 'vault', tab: 'account' });
                      window.requestAnimationFrame(() => {
                        const el = document.querySelector<HTMLElement>(
                          `[data-testid="order-card-${orderId}"]`
                        );
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      });
                    }}
                  />
                )}

              {/* TAB 1: BAG */}
              {view.tab === 'bag' && (
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex-1 space-y-3 overflow-y-auto p-6">
                    {cart.length === 0 ? (
                      <div className="rounded-2xl border border-[#C9B6CF]/60 bg-[#F8F1F9] p-6 text-center">
                        <p className="text-sm font-semibold text-[#26132A]">Your bag is empty</p>
                        <p className="mt-1 text-xs text-[#6E5873]">
                          Explore the winter orchid drop or click any look on the page to add pieces.
                        </p>
                        <button
                          type="button"
                          onClick={() => setView({ type: 'catalog', category: 'ALL' })}
                          className="mt-4 h-9 rounded-full bg-[#2D1833] px-5 text-xs font-medium text-white hover:opacity-90"
                        >
                          Shop Winter Drop
                        </button>
                      </div>
                    ) : (
                      cart.map((item) => {
                        const prod = getProductById(item.productId);
                        return (
                          <div
                            key={item.itemId}
                            className="flex gap-3 rounded-2xl border border-[#C9B6CF]/60 bg-[#F8F1F9] p-3"
                          >
                            <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-[#CDB4D6]">
                              {prod && (
                                <CroppedArt
                                  crop={prod.image}
                                  alt={item.title}
                                  className="h-full w-full"
                                />
                              )}
                            </div>
                            <div className="flex flex-1 flex-col justify-between">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-semibold text-[#26132A]">
                                    {item.title}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-[#6E5873]">
                                    Size {item.size} • {item.colorway}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  aria-label={`Remove ${item.title}`}
                                  onClick={() => void handleRemoveItem(item.itemId)}
                                  className="text-[#6E5873] hover:text-[#26132A]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="mt-2 flex items-center justify-between">
                                <div className="inline-flex items-center rounded-full border border-[#C9B6CF] bg-white">
                                  <button
                                    type="button"
                                    aria-label={`Decrease quantity for ${item.title}`}
                                    onClick={() =>
                                      void handleUpdateQty(item.itemId, item.quantity - 1)
                                    }
                                    className="inline-flex h-7 w-7 items-center justify-center text-[#26132A]"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="min-w-[20px] text-center text-xs font-semibold">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={`Increase quantity for ${item.title}`}
                                    onClick={() =>
                                      void handleUpdateQty(item.itemId, item.quantity + 1)
                                    }
                                    className="inline-flex h-7 w-7 items-center justify-center text-[#26132A]"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                <span className="text-xs font-bold text-[#26132A]">
                                  {formatPrice(item.priceCents * item.quantity)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {cart.length > 0 && (
                    <form
                      onSubmit={(e) => void handlePlaceOrder(e)}
                      className="border-t border-[#C9B6CF]/60 bg-[#F8F1F9] p-6"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6E5873]">Subtotal (Free Winter Shipping)</span>
                        <span className="text-base font-bold text-[#26132A]">
                          {totals.formattedSubtotal}
                        </span>
                      </div>

                      {user ? (
                        <>
                          <label
                            htmlFor="checkout-address"
                            className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-[#6E5873]"
                          >
                            Shipping Address
                          </label>
                          <input
                            id="checkout-address"
                            type="text"
                            value={shippingAddress}
                            onChange={(e) => setShippingAddress(e.target.value)}
                            placeholder="Street, City, Postal Code"
                            maxLength={240}
                            className="mt-1.5 h-10 w-full rounded-xl border border-[#C9B6CF] bg-white px-3 text-xs text-[#26132A] placeholder:text-[#6E5873]/70 focus:border-[#2D1833] focus:outline-none"
                          />
                          {checkoutError && (
                            <p role="alert" className="mt-2 text-xs font-medium text-rose-700">
                              {checkoutError}
                            </p>
                          )}
                          <button
                            type="submit"
                            disabled={checkoutBusy}
                            className="mt-3 h-11 w-full rounded-full bg-[#2D1833] text-xs font-semibold uppercase tracking-wide text-white hover:opacity-90 disabled:opacity-60"
                          >
                            {checkoutBusy
                              ? 'Placing Order...'
                              : `Place Order — ${totals.formattedSubtotal}`}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={authBusy}
                          onClick={() => void handleSignIn()}
                          className="mt-4 h-11 w-full rounded-full bg-[#2D1833] text-xs font-semibold uppercase tracking-wide text-white hover:opacity-90 disabled:opacity-60"
                        >
                          {authBusy ? 'Signing In...' : 'Sign In with Google to Checkout'}
                        </button>
                      )}
                    </form>
                  )}
                </div>
              )}

              {/* TAB 2: ACCOUNT & ORDERS */}
              {view.tab === 'account' && (
                <div className="flex-1 space-y-5 overflow-y-auto p-6">
                  {user && orderStatusAlerts.length > 0 && (
                    <OrderEmailToast
                      alerts={orderStatusAlerts}
                      userEmail={user.email || 'member@flipt.store'}
                      onDismiss={(alertId) =>
                        setOrderStatusAlerts((prev) => prev.filter((a) => a.id !== alertId))
                      }
                      onJumpToOrder={(orderId) => {
                        setOrderSearch('');
                        setOrderDateFilter('all');
                        window.requestAnimationFrame(() => {
                          const el = document.querySelector<HTMLElement>(
                            `[data-testid="order-card-${orderId}"]`
                          );
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        });
                      }}
                    />
                  )}

                  {lastOrderId && (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-[#8E6A99]/50 bg-white p-4">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2D1833]" />
                      <div>
                        <p className="text-xs font-bold uppercase text-[#26132A]">
                          Order Confirmed
                        </p>
                        <p className="mt-0.5 text-xs text-[#6E5873]">
                          Receipt <span className="font-mono">{lastOrderId}</span> saved to your
                          account.
                        </p>
                      </div>
                    </div>
                  )}

                  {!user ? (
                    <div className="rounded-2xl border border-[#C9B6CF]/60 bg-[#F8F1F9] p-6 text-center">
                      <p className="text-sm font-bold uppercase text-[#26132A]">
                        FLIP iT Member Access
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#6E5873]">
                        Sign in with Google to sync your shopping bag across devices, save wishlist
                        pieces, and track winter drop orders.
                      </p>
                      {authError && (
                        <p role="alert" className="mt-3 text-xs font-medium text-rose-700">
                          {authError}
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={authBusy}
                        onClick={() => void handleSignIn()}
                        className="mt-4 h-11 w-full rounded-full bg-[#2D1833] text-xs font-semibold uppercase tracking-wide text-white hover:opacity-90 disabled:opacity-60"
                      >
                        {authBusy ? 'Connecting...' : 'Sign In / Up with Google'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between rounded-2xl border border-[#C9B6CF]/60 bg-[#F8F1F9] p-4">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName || 'Member avatar'}
                              className="h-10 w-10 rounded-full border border-[#C9B6CF] object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2D1833] text-xs font-bold text-white">
                              {(user.displayName || 'F')[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-[#26132A]">
                              {user.displayName || 'FLIP iT Member'}
                            </p>
                            <p className="text-xs text-[#6E5873]">{user.email}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Sign out"
                          onClick={() => void handleSignOut()}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#C9B6CF] bg-white px-3 text-xs font-medium text-[#26132A] hover:bg-[#EFE6F1]"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Out
                        </button>
                      </div>

                      {/* Seasonal Drops Email Preference */}
                      <div className="rounded-2xl border border-[#C9B6CF]/60 bg-[#F8F1F9] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span
                              id="seasonal-drops-label"
                              className="block text-xs font-semibold text-[#26132A]"
                            >
                              Email me about new seasonal drops
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-snug text-[#6E5873]">
                              Early studio alerts when new orchid knitwear &amp; fleece capsules launch.
                            </span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={emailSeasonalDrops}
                            aria-labelledby="seasonal-drops-label"
                            disabled={dropsPrefBusy}
                            onClick={() => void handleToggleSeasonalDrops()}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-60 ${
                              emailSeasonalDrops ? 'bg-[#2D1833]' : 'bg-[#C9B6CF]'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                emailSeasonalDrops ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        {dropsPrefError && (
                          <p role="alert" className="mt-2 text-[11px] font-medium text-rose-700">
                            {dropsPrefError}
                          </p>
                        )}
                      </div>

                      {/* Saved Wishlist */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#6E5873]">
                          Saved Pieces ({wishlist.length})
                        </h3>
                        {wishlist.length === 0 ? (
                          <p className="mt-2 rounded-2xl border border-[#C9B6CF]/40 bg-[#F8F1F9] p-4 text-xs text-[#6E5873]">
                            Tap the heart on any item to save it for later.
                          </p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {wishlist.map((w) => {
                              const prod = getProductById(w.productId);
                              return (
                                <div
                                  key={w.productId}
                                  className="flex items-center justify-between rounded-2xl border border-[#C9B6CF]/60 bg-[#F8F1F9] p-3"
                                >
                                  <div>
                                    <p className="text-xs font-semibold text-[#26132A]">
                                      {w.title}
                                    </p>
                                    <p className="text-[11px] text-[#6E5873]">
                                      {formatPrice(w.priceCents)}
                                    </p>
                                  </div>
                                  {prod && (
                                    <button
                                      type="button"
                                      onClick={() => openProductModal(prod)}
                                      className="h-8 rounded-full bg-[#2D1833] px-3 text-[11px] font-medium text-white"
                                    >
                                      Open
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Confirmed Orders */}
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6E5873]">
                            Order History ({orders.length})
                          </h3>
                          <button
                            type="button"
                            onClick={handleDownloadOrderHistory}
                            disabled={orders.length === 0}
                            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#C9B6CF] bg-white px-3 text-[11px] font-semibold text-[#2D1833] transition hover:bg-[#EFE6F1] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Download Order History</span>
                          </button>
                        </div>
                        {orders.length === 0 ? (
                          <p className="mt-2 rounded-2xl border border-[#C9B6CF]/40 bg-[#F8F1F9] p-4 text-xs text-[#6E5873]">
                            No orders placed yet.
                          </p>
                        ) : (
                          <>
                            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                              <div className="relative flex flex-1 items-center">
                                <label htmlFor="order-history-search" className="sr-only">
                                  Search orders by ID or date
                                </label>
                                <Search
                                  aria-hidden="true"
                                  className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#6E5873]"
                                />
                                <input
                                  id="order-history-search"
                                  type="text"
                                  role="searchbox"
                                  value={orderSearch}
                                  onChange={(e) => setOrderSearch(e.target.value)}
                                  placeholder="Order ID or date..."
                                  className="h-9 w-full rounded-xl border border-[#C9B6CF] bg-white pl-8 pr-8 text-xs text-[#26132A] placeholder:text-[#6E5873]/75 focus:border-[#2D1833] focus:outline-none"
                                />
                                {orderSearch.trim().length > 0 && (
                                  <button
                                    type="button"
                                    aria-label="Clear order search"
                                    onClick={() => setOrderSearch('')}
                                    className="absolute right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-[#6E5873] hover:bg-[#EFE6F1] hover:text-[#26132A]"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              <div>
                                <label htmlFor="order-date-filter" className="sr-only">
                                  Filter orders by date range
                                </label>
                                <select
                                  id="order-date-filter"
                                  aria-label="Filter orders by date range"
                                  value={orderDateFilter}
                                  onChange={(e) =>
                                    setOrderDateFilter(e.target.value as OrderDateRangeFilter)
                                  }
                                  className="h-9 w-full rounded-xl border border-[#C9B6CF] bg-white px-2.5 text-xs font-medium text-[#26132A] focus:border-[#2D1833] focus:outline-none sm:w-auto"
                                >
                                  {ORDER_DATE_FILTER_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {(() => {
                              const filteredOrders = filterOrders(orders, {
                                query: orderSearch,
                                dateRange: orderDateFilter,
                              });
                              if (filteredOrders.length === 0) {
                                return (
                                  <div className="mt-3 rounded-2xl border border-[#C9B6CF]/60 bg-[#F8F1F9] p-5 text-center">
                                    <p className="text-xs font-semibold text-[#26132A]">
                                      No matching orders
                                    </p>
                                    <p className="mt-1 text-[11px] text-[#6E5873]">
                                      No orders match your current ID or date filter.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOrderSearch('');
                                        setOrderDateFilter('all');
                                      }}
                                      className="mt-3 h-8 rounded-full bg-[#2D1833] px-4 text-[11px] font-medium text-white hover:opacity-90"
                                    >
                                      Reset filters
                                    </button>
                                  </div>
                                );
                              }
                              return (
                                <div className="mt-3 space-y-3">
                                  {filteredOrders.map((ord) => {
                                    const progress = getOrderProgress(ord.status);
                                    return (
                                      <article
                                        key={ord.orderId}
                                        data-testid={`order-card-${ord.orderId}`}
                                        className="rounded-2xl border border-[#C9B6CF]/60 bg-[#F8F1F9] p-4"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <span className="block truncate font-mono text-[11px] text-[#6E5873]">
                                              {ord.orderId}
                                            </span>
                                            <span className="mt-0.5 block text-[11px] font-medium text-[#6E5873]">
                                              Placed {formatOrderDate(ord.createdAtMs)}
                                            </span>
                                          </div>
                                          <span
                                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                              progress.stage === 'delivered'
                                                ? 'bg-[#2D1833] text-white'
                                                : progress.stage === 'shipped'
                                                  ? 'bg-[#6E5873] text-white'
                                                  : 'border border-[#8E6A99]/60 bg-white text-[#2D1833]'
                                            }`}
                                          >
                                            {progress.stageLabel}
                                          </span>
                                        </div>

                                        <OrderStatusProgress orderId={ord.orderId} status={ord.status} />

                                        <div className="mt-3 space-y-1">
                                          {ord.items.map((line, i) => (
                                            <p key={i} className="text-xs text-[#26132A]">
                                              {line.quantity}× {line.title} ({line.size})
                                            </p>
                                          ))}
                                        </div>
                                        <div className="mt-2.5 flex items-center justify-between border-t border-[#C9B6CF]/40 pt-2 text-xs">
                                          <span className="truncate pr-2 text-[#6E5873]">
                                            {ord.shippingAddress}
                                          </span>
                                          <span className="shrink-0 font-bold text-[#26132A]">
                                            {formatPrice(ord.totalCents)}
                                          </span>
                                        </div>

                                        <div className="mt-3">
                                          <a
                                            href={buildCarrierTrackingHref(ord)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full border border-[#C9B6CF] bg-white px-3 text-[11px] font-semibold uppercase tracking-wide text-[#2D1833] transition hover:bg-[#EFE6F1]"
                                          >
                                            <span>View Shipping Details</span>
                                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                          </a>
                                        </div>
                                      </article>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              </div>
            </div>
          )}
        </div>
      )}
    </ErrorBoundary>
  );
}
