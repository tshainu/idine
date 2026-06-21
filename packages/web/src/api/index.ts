import { Hono } from "hono";
import { cors } from "hono/cors";
import { branches } from "./routes/branches";
import { users } from "./routes/users";
import { categories } from "./routes/categories";
import { menuItems } from "./routes/menu-items";
import { tables } from "./routes/tables";
import { printers } from "./routes/printers";
import { orders } from "./routes/orders";
import { orderItems } from "./routes/order-items";
import { printJobs } from "./routes/print-jobs";
import { customers } from "./routes/customers";

const app = new Hono()
  .basePath("api")
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true, exposeHeaders: ["set-auth-token"] }))
  .get("/ping", (c) => c.json({ message: `Pong! ${Date.now()}` }, 200))
  .get("/health", (c) => c.json({ status: "ok" }, 200))
  .route("/branches", branches)
  .route("/users", users)
  .route("/categories", categories)
  .route("/menu-items", menuItems)
  .route("/tables", tables)
  .route("/printers", printers)
  .route("/orders", orders)
  .route("/order-items", orderItems)
  .route("/print-jobs", printJobs)
  .route("/customers", customers);

export type AppType = typeof app;
export default app;
