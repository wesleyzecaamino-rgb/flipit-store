# FLIP iT Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Private User Profiles (`/users/{userId}`)**: A profile document can only be read, created, or updated by the verified authenticated user whose `request.auth.uid == userId`. `uid` and `createdAt` are immutable after creation; `createdAt`/`updatedAt` must equal `request.time`; optional `emailSeasonalDrops` must be a boolean if present.
2. **Saved Bag (`/users/{userId}/cart/{itemId}`)**: Every cart line item belongs strictly to an existing `/users/{userId}` parent document (`exists(...)`), has `ownerId == request.auth.uid == userId`, bounded `quantity` (`1..20`), bounded `priceCents` (`100..500000`), valid `size`/`category` enums, and immutable `itemId`/`productId`/`ownerId`/`createdAt`.
3. **Saved Wishlist (`/users/{userId}/wishlist/{productId}`)**: Every wishlist entry belongs strictly to an existing `/users/{userId}` parent document, has `ownerId == request.auth.uid == userId`, and cannot be updated arbitrarily.
4. **Confirmed Orders (`/orders/{orderId}`)**: An order can only be created by a verified authenticated user whose `userId == request.auth.uid`, with initial `status` in `['processing', 'confirmed']`, bounded `items` (`1..20`), and `createdAt == request.time`. Orders are readable/listable ONLY where `resource.data.userId == request.auth.uid`, and immutable once created via client SDK.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Unauthenticated read/write**: Anonymous request reading `/users/userA` or writing `/orders/ord1` -> Denied by `isSignedIn()`.
2. **Unverified email write**: Authenticated user with `email_verified: false` creating an order or cart item -> Denied by `isVerified()`.
3. **IDOR / Identity spoofing on User Profile**: `userB` writing `/users/userA` or setting `uid: "userA"` -> Denied by `isOwner(userId)` & `data.uid == request.auth.uid`.
4. **Shadow / Ghost Field Injection**: Creating a profile or cart item with an extra `role: "admin"` or `isVip: true` key -> Denied by `data.keys().hasOnly(...)`.
5. **Path ID Poisoning**: Creating `/orders/` with a 500-char or `../` ID -> Denied by `isValidId(orderId)` (`<= 128` and `^[a-zA-Z0-9_\-]+$`).
6. **Client Timestamp Forgery**: Creating a cart item or order with a backdated `createdAt` (`!= request.time`) -> Denied by `incoming().createdAt == request.time`.
7. **Immutable Field Mutation**: Updating `cart/{itemId}` to change `ownerId`, `productId`, `priceCents`, or `createdAt` -> Denied by `affectedKeys().hasOnly(['quantity', 'size', 'updatedAt'])`.
8. **Value Poisoning (Negative/Excessive Quantity or Price)**: Creating/updating a cart item with `quantity: 0`, `quantity: 999`, or `priceCents: -100` -> Denied by integer boundary checks.
9. **Orphaned Subcollection Write**: Creating `/users/{uid}/cart/{id}` before `/users/{uid}` exists -> Denied by `exists(/databases/$(database)/documents/users/$(userId))`.
10. **Blanket List Scraping on Orders**: Querying `/orders` without `where('userId', '==', uid)` -> Denied by `allow list: if isSignedIn() && existing().userId == request.auth.uid`.
11. **Order State Shortcutting / Tampering**: Creating an order with `status: 'shipped'` or `status: 'delivered'`, or updating an existing order's `totalCents` -> Denied by `incoming().status in ['processing', 'confirmed']` on create and `allow update: if false`.
12. **Unbounded Array / Type Injection on Orders**: Creating an order with `items: []`, `items.size() > 20`, or `items[0]` as a string instead of a map -> Denied by `isValidOrder()`.
