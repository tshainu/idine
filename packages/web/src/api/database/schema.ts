import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Branches (multi-branch support)
export const branches = sqliteTable("branches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Users
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  pin: text("pin").notNull(),
  role: text("role").notNull().default("waiter"), // superadmin | admin | waiter | cashier | kitchen
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Categories
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

// Printers
export const printers = sqliteTable("printers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // kot | bill
  connection: text("connection").notNull(), // lan | usb
  ipAddress: text("ip_address"),
  port: integer("port").default(9100),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

// Menu Items
export const menuItems = sqliteTable("menu_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  categoryId: integer("category_id").references(() => categories.id),
  printerId: integer("printer_id").references(() => printers.id),
  name: text("name").notNull(),
  code: text("code"),
  price: real("price").notNull().default(0),          // base / dine-in price (legacy compat)
  priceDineIn: real("price_dine_in").notNull().default(0),
  priceTakeaway: real("price_takeaway").notNull().default(0),
  priceDelivery: real("price_delivery").notNull().default(0),
  description: text("description"),
  imageUrl: text("image_url"),
  loyaltyPoint: real("loyalty_point").notNull().default(0),
  isVeg: integer("is_veg", { mode: "boolean" }).notNull().default(false),
  isBeverage: integer("is_beverage", { mode: "boolean" }).notNull().default(false),
  isPromo: integer("is_promo", { mode: "boolean" }).notNull().default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Menu item variations (e.g. Small / Medium / Large)
export const menuItemVariations = sqliteTable("menu_item_variations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  menuItemId: integer("menu_item_id").references(() => menuItems.id).notNull(),
  name: text("name").notNull(),
  code: text("code"),
  priceDineIn: real("price_dine_in").notNull().default(0),
  priceTakeaway: real("price_takeaway").notNull().default(0),
  priceDelivery: real("price_delivery").notNull().default(0),
  loyaltyPoint: real("loyalty_point").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

// Tables (restaurant floor tables)
export const tables = sqliteTable("tables", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  capacity: integer("capacity").default(4),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

// Customers
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Orders
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  orderNumber: text("order_number").notNull(),
  type: text("type").notNull().default("dine-in"), // dine-in | takeaway | delivery
  status: text("status").notNull().default("pending"), // pending | confirmed | served | paid | cancelled | draft
  tableId: integer("table_id").references(() => tables.id),
  waiterId: integer("waiter_id").references(() => users.id),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name").default("Walk-in Customer"),
  notes: text("notes"),
  subtotal: real("subtotal").notNull().default(0),
  total: real("total").notNull().default(0),
  kotPrinted: integer("kot_printed", { mode: "boolean" }).notNull().default(false),
  source: text("source").notNull().default("pos"), // pos | qr
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Order Items
export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").references(() => orders.id),
  menuItemId: integer("menu_item_id").references(() => menuItems.id),
  name: text("name").notNull(),
  price: real("price").notNull(),
  qty: integer("qty").notNull().default(1),
  printerId: integer("printer_id").references(() => printers.id),
  total: real("total").notNull().default(0),
  kotPrinted: integer("kot_printed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Print Jobs
export const printJobs = sqliteTable("print_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  orderId: integer("order_id").references(() => orders.id),
  printerId: integer("printer_id").references(() => printers.id),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  type: text("type").notNull(), // kot | bill | reprint
  status: text("status").notNull().default("pending"), // pending | printing | done | failed
  payload: text("payload").notNull(),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: integer("last_attempt_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Suppliers
export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Purchase Items (catalog of purchasable items, separate from menu items)
export const purchaseItems = sqliteTable("purchase_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("pcs"), // kg | g | litre | ml | pcs | dozen | box | bag
  lastCost: real("last_cost").notNull().default(0),
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Purchases
export const purchases = sqliteTable("purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  supplierName: text("supplier_name").notNull(),
  purchaseItemId: integer("purchase_item_id").references(() => purchaseItems.id),
  itemDescription: text("item_description").notNull(),
  invoiceNumber: text("invoice_number"),
  qty: real("qty").notNull().default(1),
  unitCost: real("unit_cost").notNull().default(0),
  total: real("total").notNull().default(0),
  amountPaid: real("amount_paid").notNull().default(0),
  dueAmount: real("due_amount").notNull().default(0),
  status: text("status").notNull().default("due"), // paid | partial | due
  purchaseDate: text("purchase_date").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Purchase Payments
export const purchasePayments = sqliteTable("purchase_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  purchaseId: integer("purchase_id").references(() => purchases.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  amount: real("amount").notNull().default(0),
  paymentDate: text("payment_date").notNull(),
  method: text("method").notNull().default("cash"), // cash | bank | cheque | card
  reference: text("reference"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Expenses
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  category: text("category").notNull().default("General"),
  amount: real("amount").notNull().default(0),
  expenseDate: text("expense_date").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Ingredients (raw materials / stock items)
export const ingredients = sqliteTable("ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("kg"), // kg | g | litre | ml | pcs | dozen
  stockQty: real("stock_qty").notNull().default(0),
  minStockQty: real("min_stock_qty").notNull().default(0),
  costPerUnit: real("cost_per_unit").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Modifiers (add-ons / customizations for menu items)
export const modifiers = sqliteTable("modifiers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),           // e.g. "Extra Cheese", "No Onion"
  groupName: text("group_name").notNull().default("General"), // e.g. "Toppings", "Preferences"
  price: real("price").notNull().default(0), // 0 = free modifier
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Branch settings (key-value store per branch)
export const branchSettings = sqliteTable("branch_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  key: text("key").notNull(),
  value: text("value"),
});

// Promotions (discount rules)
export const promotions = sqliteTable("promotions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  type: text("type").notNull().default("percent"), // percent | flat | bogo
  value: real("value").notNull().default(0),       // % or flat LKR amount
  minOrderAmount: real("min_order_amount").notNull().default(0),
  startDate: text("start_date"),
  endDate: text("end_date"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Outbox — change events buffered for cloud sync
export const outbox = sqliteTable("outbox", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  table: text("table").notNull(),         // which table changed
  operation: text("operation").notNull(), // insert | update | delete
  recordId: integer("record_id").notNull(),
  payload: text("payload").notNull(),     // JSON snapshot
  synced: integer("synced", { mode: "boolean" }).notNull().default(false),
  syncedAt: integer("synced_at", { mode: "timestamp" }),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
