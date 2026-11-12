import { callFfi } from "./lib/designdb.ts";

const path = `smoke_${Date.now()}`;

try {
  const r = await callFfi("db_create", { path, collection: "users" });
  console.log("db_create ->", r);
} catch (err) {
  console.error("db_create 失败:", err);
}
