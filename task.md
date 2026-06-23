# QR Menu / Table Self-Ordering System

## Flow
1. **Tables page** → Download QR button per table → QR encodes `/menu?branch=1&table=T1`
2. **Customer QR Menu** (`/menu` page) → Beautiful mini POS → Customer browses + orders → POST to /api/orders with source="qr" + tableId
3. **DB** → Add `source` column to orders table (qr | pos | self)
4. **POS toolbar QR icon** → Opens "QR Orders" modal (replaces old SelfOrderQRModal logic) → shows pending qr orders with badge count
5. **QR Orders Modal** → List of incoming qr orders → assign waiter → Accept (prints KOT) or Reject
6. **Waiter notification** → If waiter is logged in, they see assignment notification → Confirm → KOT prints

## DB Changes
- orders table: ADD COLUMN source TEXT DEFAULT 'pos'  (qr | pos)
- schema.ts: add source field

## Files to create/modify
1. `packages/web/src/web/pages/menu.tsx` — Customer QR menu page (public, no auth)
2. `packages/web/src/web/pages/tables.tsx` — Add QR download button per table
3. `packages/web/src/web/components/pos-toolbar-modals.tsx` — Replace SelfOrderQRModal with QROrdersModal
4. `packages/web/src/web/pages/pos.tsx` — Change QR icon to open QROrdersModal, add badge count, poll
5. `packages/web/src/api/database/schema.ts` — add source to orders
6. `packages/web/src/api/routes/orders.ts` — filter by source=qr for notification endpoint
7. `packages/web/src/web/app.tsx` — add /menu route

## QR Orders Modal (POS)
- Polls /api/orders?source=qr&status=pending every 5s
- Shows badge count on toolbar icon
- Each order: table name, items, total, time
- Actions: Assign Waiter dropdown + Accept (prints KOT) | Reject
- Accept flow: PATCH order status→confirmed, set waiterId, create print-jobs

## Customer Menu Page (/menu?branch=1&table=T1)
- Public page (no auth needed)
- Shows restaurant name + menu categories/items
- Cart at bottom
- Name field (optional customer name)
- Place Order → creates order with source=qr, status=pending, type=dine-in
- Shows "Order placed! Your order is being prepared" confirmation

## Status
- [ ] DB migration (add source column)
- [ ] schema.ts update  
- [ ] /menu page
- [ ] tables.tsx QR download
- [ ] QROrdersModal
- [ ] POS badge + polling
- [ ] app.tsx route
- [ ] build + test
