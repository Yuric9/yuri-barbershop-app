import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: ["./db/schema.ts", "./db/product-order-schema.ts"],
  dialect: "sqlite",
});
