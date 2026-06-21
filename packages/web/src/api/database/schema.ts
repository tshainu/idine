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
  price: real("price").notNull(),
  imageUrl: text("image_url"),
  isVeg: integer("is_veg", { mode: "boolean" }).notNull().default(false),
  isBeverage: integer("is_beverage", { mode: "boolean" }).notNull().default(false),
  isPromo: integer("is_promo", { mode: "boolean" }).notNull().default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
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

// Purchases
export const purchases = sqliteTable("purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  supplierName: text("supplier_name").notNull(),
  itemDescription: text("item_description").notNull(),
  qty: real("qty").notNull().default(1),
  unitCost: real("unit_cost").notNull().default(0),
  total: real("total").notNull().default(0),
  purchaseDate: text("purchase_date").notNull(),
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
