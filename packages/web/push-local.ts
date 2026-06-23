import { createClient } from "@libsql/client";

const client = createClient({ url: "file:///home/user/idine/local.db" });

const stmts = [
  `CREATE TABLE IF NOT EXISTS branches (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT, phone TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER REFERENCES branches(id), name TEXT NOT NULL, pin TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'waiter', is_active INTEGER NOT NULL DEFAULT 1, created_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER REFERENCES branches(id), name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS printers (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER REFERENCES branches(id), name TEXT NOT NULL, type TEXT NOT NULL, connection TEXT NOT NULL, ip_address TEXT, port INTEGER DEFAULT 9100, is_active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS menu_items (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER REFERENCES branches(id), category_id INTEGER REFERENCES categories(id), printer_id INTEGER REFERENCES printers(id), name TEXT NOT NULL, code TEXT, price REAL NOT NULL DEFAULT 0, price_dine_in REAL NOT NULL DEFAULT 0, price_takeaway REAL NOT NULL DEFAULT 0, price_delivery REAL NOT NULL DEFAULT 0, description TEXT, image_url TEXT, loyalty_point REAL NOT NULL DEFAULT 0, is_veg INTEGER NOT NULL DEFAULT 0, is_beverage INTEGER NOT NULL DEFAULT 0, is_promo INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS menu_item_variations (id INTEGER PRIMARY KEY AUTOINCREMENT, menu_item_id INTEGER NOT NULL REFERENCES menu_items(id), name TEXT NOT NULL, code TEXT, price_dine_in REAL NOT NULL DEFAULT 0, price_takeaway REAL NOT NULL DEFAULT 0, price_delivery REAL NOT NULL DEFAULT 0, loyalty_point REAL NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS tables (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER REFERENCES branches(id), name TEXT NOT NULL, capacity INTEGER DEFAULT 4, is_active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER REFERENCES branches(id), name TEXT NOT NULL, phone TEXT, address TEXT, created_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER REFERENCES branches(id), order_number TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'dine-in', status TEXT NOT NULL DEFAULT 'pending', table_id INTEGER REFERENCES tables(id), waiter_id INTEGER REFERENCES users(id), customer_id INTEGER REFERENCES customers(id), customer_name TEXT DEFAULT 'Walk-in Customer', notes TEXT, subtotal REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, kot_printed INTEGER NOT NULL DEFAULT 0, created_at INTEGER, updated_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER REFERENCES orders(id), menu_item_id INTEGER REFERENCES menu_items(id), name TEXT NOT NULL, price REAL NOT NULL, qty INTEGER NOT NULL DEFAULT 1, printer_id INTEGER REFERENCES printers(id), total REAL NOT NULL DEFAULT 0, kot_printed INTEGER NOT NULL DEFAULT 0, created_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS print_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER REFERENCES branches(id), order_id INTEGER REFERENCES orders(id), printer_id INTEGER REFERENCES printers(id), idempotency_key TEXT NOT NULL UNIQUE, type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', payload TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_attempt_at INTEGER, completed_at INTEGER, created_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS purchases (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER REFERENCES branches(id), supplier_name TEXT NOT NULL, item_description TEXT NOT NULL, qty REAL NOT NULL DEFAULT 1, unit_cost REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, purchase_date TEXT NOT NULL, notes TEXT, created_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER REFERENCES branches(id), category TEXT NOT NULL DEFAULT 'General', amount REAL NOT NULL DEFAULT 0, expense_date TEXT NOT NULL, notes TEXT, created_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS ingredients (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER REFERENCES branches(id), name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT 'kg', stock_qty REAL NOT NULL DEFAULT 0, min_stock_qty REAL NOT NULL DEFAULT 0, cost_per_unit REAL NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, created_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS modifiers (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER REFERENCES branches(id), name TEXT NOT NULL, group_name TEXT NOT NULL DEFAULT 'General', price REAL NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, created_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS branch_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER NOT NULL REFERENCES branches(id), key TEXT NOT NULL, value TEXT)`,
  `CREATE TABLE IF NOT EXISTS promotions (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER REFERENCES branches(id), name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'percent', value REAL NOT NULL DEFAULT 0, min_order_amount REAL NOT NULL DEFAULT 0, start_date TEXT, end_date TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at INTEGER)`,
];

for (const stmt of stmts) {
  await client.execute(stmt);
}
console.log("Schema created!");
client.close();
