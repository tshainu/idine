# iDine POS — Task List (batch of 18 requests)

Repo: /home/user/idine (github.com/tshainu/idine)
VPS: root@69.169.97.195, /var/www/idine, pm2 process "idine", port 6062
IMPORTANT: local.db is tracked in git history but is LIVE DATA on VPS — never `git checkout`/`git reset` it. Only `git merge --ff-only` for code.

## Status
1. [x] Modify-order flow: Place Order in modify mode now PATCHes existing order + reconciles order_items, then opens choice modal (All Items / Updated Items Only), reduced/cancelled items shown as "-N Name" + CANCEL tag
2. [x] Invoice print: reduced L/R padding, bold item header row (900 weight) + divider under it
3. [x] Qty column moved right next to Price (right-aligned, marginLeft 8), extra paddingRight on item name
4. [x] Currency: item price/amount + subtotal/discount/service charge are bare numbers now; LKR kept only on TOTAL/Cash Given/Amount Paid/Balance
5. [x] Invoice header image maxHeight 90 -> 130
6. [x] Cancel/Draft/Quick Invoice/Place Order buttons: filter brightness(0.8) applied
7. [x] Category "All" tab — sorted by best-sellers (new /api/menu-items/best-sellers endpoint)
8. [ ] BUG: Finalize Sale sometimes shows payable=0, cart details not showing — investigate & fix
9. [ ] Redesign variation-picker modal — more options, proper alignment
10. [ ] Add Export (CSV/Excel) buttons: Items, Categories, Sales list, Purchases, Expenses
11. [ ] BUG: Register "Today's Summary" — cancelled orders count always 0
12. [x] Running-order search — includes customer mobile number
13. [x] Double-click running order → opens Order Details modal
14. [x] Button label: "Update Order" in modify mode vs "Place Order" normal
15. [ ] Add per-cart-item note field (next to Mod button) — prints only on KOT
16. [x] Toast centered in top bar between logo and filter pills
17. [ ] Combo & Promo management: new page/tabs, CRUD + suspend, sellable from POS
18. [ ] Category table: add sort icon column; new category auto-gets next sort order number

## Deployed so far
Commits pushed to master: a121078 (items 1,6,7,12,13,14,16), 3c5108d (items 2,3,4,5).
NOT yet deployed to VPS this round — still batching remaining items before one deploy pass.
Remaining: 8, 9, 10, 11, 15, 17, 18 — continue from here if interrupted.
