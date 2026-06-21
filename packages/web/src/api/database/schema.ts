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
  role: text("role").notNull().default("waiter"), // superadmin | manager | waiter | kitchen
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
  printerId: integer("printer_id").references(() => printers.id), // which KOT printer
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
  name: text("name").notNull(), // e.g. "T1", "Table 5"
  capacity: integer("capacity").default(4),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

// Customers
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  phone: text("phone"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Orders
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  orderNumber: text("order_number").notNull(), // e.g. "ORD-0045"
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
  name: text("name").notNull(), // snapshot at time of order
  price: real("price").notNull(), // snapshot at time of order
  qty: integer("qty").notNull().default(1),
  printerId: integer("printer_id").references(() => printers.id), // station routing snapshot
  total: real("total").notNull().default(0),
  kotPrinted: integer("kot_printed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Print Jobs — the heart of reliable KOT printing
export const printJobs = sqliteTable("print_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  branchId: integer("branch_id").references(() => branches.id),
  orderId: integer("order_id").references(() => orders.id),
  printerId: integer("printer_id").references(() => printers.id),
  idempotencyKey: text("idempotency_key").notNull().unique(), // orderId-printerId-attempt
  type: text("type").notNull(), // kot | bill | reprint
  status: text("status").notNull().default("pending"), // pending | printing | done | failed
  payload: text("payload").notNull(), // JSON: items to print
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: integer("last_attempt_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
