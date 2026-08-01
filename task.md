# iDine POS — Task List (batch of 18 requests) — ALL DONE, deployed to VPS + GitHub

Repo: /home/user/idine (github.com/tshainu/idine), latest commit 18fbccd
VPS: root@69.169.97.195, /var/www/idine, pm2 process "idine", port 6062

IMPORTANT LESSONS FOR NEXT TIME:
- local.db is tracked in git history but is LIVE DATA on VPS — never `git checkout`/`git reset` it.
- `drizzle-kit push --force` can DROP+RECREATE a table instead of ALTER when adding multiple
  NOT NULL columns with defaults (happened to menu_items — wiped it). Prefer plain
  `sqlite3 local.db "ALTER TABLE x ADD COLUMN ..."` for schema changes on the production DB from now on.
- ALWAYS `git push` right after `git commit` — spent one whole round having committed 5x locally
  without pushing, user saw nothing live.
- Always take a fresh local.db backup to /root/ before ANY migration or destructive-looking command.

## Status — all 18 done
1. Modify-order updates in place + KOT choice (All/Updated items, cancel markers)
2-5. Invoice/Bill: margins, bold header+divider, qty near price, Rs/.00 removed except Total/Cash/Paid/Balance, bigger header image
6. Darker action buttons
7. "All" tab sorted by best-sellers
8. Fixed Finalize Sale 0-payable/empty-cart-details bug (decoupled query)
9. Redesigned variation picker (image header + aligned grid cards)
10. CSV export added: Items, Categories, Sales, Purchases, Expenses
11. Fixed cancelled-orders always-0 bug (backend was hiding cancelled orders by default)
12. Running-order search includes mobile number
13. Double-click running order opens details
14. "Update Order" vs "Place Order" label
15. Per-item kitchen note field, prints on KOT only
16. Toast centered in top bar
17. Combo & Promo management page (2 tabs, CRUD+suspend, sellable from POS) — NEW page /combo-promo
18. Category sort icon + auto next-sort-order on create

## Bonus fixes discovered along the way
- Fixed FK constraint crash when ordering items with variations (composite cart key was being
  sent as the real DB menu_item_id) — split into cartKey (UI identity) vs menuItemId (real FK).
- Fixed dead "Export CSV" button on Sales page (existed with no onClick).
- Fixed the "Combo" filter pill in POS that existed with zero matching logic.

## Incident log
- Aug 1: drizzle-kit push wiped menu_items table when adding isCombo/originalPrice columns.
  Caught within ~1 min via row-count check, restored from pre-migration backup
  (/root/idine_local_db_pre_migration_1785557973.db), zero data loss (90 orders/267 menu
  items/45 categories all intact). Re-applied the 2 columns + combo_items table via manual
  ALTER TABLE / CREATE TABLE instead. Verified live afterward.

All work pushed to GitHub master and deployed+verified live on VPS (200 OK, no new errors).
