# iDine Changes Batch

## Dashboard
- [x] Replace stat cards icons with provided images (sales, profit, active_table, pending_kitchen, top_selling, total_orders)
- [x] 6 stat cards: Today's Sales, Profit Today, Active Tables, Pending Kitchen Orders, Top Selling Item, Total Orders (Takeaway & Dine-in)
- [x] Revenue chart: This month (not last 7 days)
- [x] Always keep POS icon in top right of top bar

## Add Item (products.tsx)
- [x] Remove print station option
- [x] Fix image saving (imageUrl must persist on edit)
- [x] Image stays until user changes it
- [x] Category sorting: drag to change position (categories.tsx)

## Users (users.tsx)
- [x] Add roles and privileges system
- [x] Full privileges UI

## Settings (settings.tsx)
- [x] Invoice logo not showing → fix upload to save to server + show preview in form
- [x] Apply service charges to all bills/orders/invoices
- [x] Remove "Reset transaction data" from general settings
- [x] All tabs after saving → exit modal (call onBack after save success)
- [x] Remove Tax settings tab + TaxSetting component

## Status
- [ ] All files written
- [ ] Build
- [ ] Restart server
