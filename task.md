# iDine POS — Task List (batch of 18 requests)

Repo: /home/user/idine (github.com/tshainu/idine)
VPS: root@69.169.97.195, /var/www/idine, pm2 process "idine", port 6062
IMPORTANT: local.db is tracked in git history but is LIVE DATA on VPS — never `git checkout`/`git reset` it. Only `git merge --ff-only` for code.

## Status
1. [ ] Modify-order flow: "Place Order" while modifying should NOT create new order; should update existing order, then open KOT modal asking "Updated items only" vs "All items"; show cancelled/reduced qty with minus e.g. "-2 Lemon Juice"
2. [ ] Invoice print: reduce L/R margin, bold item/qty/price/amount header row + divider under it
3. [ ] Qty column spacing — move closer to Price, away from Item name
4. [ ] Currency: remove "Rs" prefix and ".00" trailing zeros mid-receipt; keep "LKR" only on TOTAL/Cash Given/Paid/Balance lines
5. [ ] Increase invoice header image holder size slightly
6. [ ] Darken Cancel/Draft/Quick Order/Place Order button colors
7. [ ] Category "All" tab in POS — sort by best-selling (qty sold desc) instead of default
8. [ ] BUG: Finalize Sale sometimes shows payable=0, cart details not showing — investigate & fix
9. [ ] Redesign variation-picker modal — more options, proper alignment
10. [ ] Add Export (CSV/Excel) buttons: Items, Categories, Sales list, Purchases, Expenses
11. [ ] BUG: Register "Today's Summary" — cancelled orders count always 0
12. [ ] Running-order search — include customer mobile number
13. [ ] Double-click running order → open Order Details modal
14. [ ] Button label: "Update Order" in modify mode vs "Place Order" normal
15. [ ] Add per-cart-item note field (next to Mod button) — prints only on KOT (e.g. "Low spicy")
16. [ ] Move toast/alert box to center of top bar (between iDine POS logo and Online button)
17. [ ] Combo & Promo management: new page/tabs, CRUD + suspend, sellable from POS
18. [ ] Category table: add sort icon column; new category auto-gets next sort order number

## Notes
- Deploy flow: commit+push from /home/user/idine → ssh VPS → git fetch && merge --ff-only → bun run build (packages/web) → pm2 restart idine
- Schema changes need `drizzle-kit push --force` on VPS with DATABASE_URL=file:/var/www/idine/local.db (safe — additive only, backup local.db first)
