// Stub type for hono client — avoids importing the web package (which has Node-only deps)
import type { Hono } from "hono";

export type AppType = Hono<any, any, any>;
