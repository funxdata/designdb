import { callFfi } from "./lib/designdb.ts";

const db_insert = (
  path: string,
  collection: string,
  doc: Record<string, unknown>,
) => callFfi("db_insert", { path, collection, doc });

const db_query = (
  path: string,
  collection: string,
  options?: { filter?: Record<string, unknown> },
) => callFfi("db_query", { path, collection, ...options });

const path = `perf_large_${Date.now()}`;

// 大小梯度测试：1KB → 8KB → 32KB → 60KB → 80KB（均在 16MB 响应上限内）
const sizes = [1024, 8192, 32768, 60000, 80000];

for (const size of sizes) {
  const label = `${(size / 1024).toFixed(1)}KB`;
  try {
    const data = "x".repeat(size);
    const t0 = performance.now();
    await db_insert(path, "blobs", { name: label, data });
    const dt = performance.now() - t0;
    console.log(`✅ insert ${label}: ${dt.toFixed(1)}ms`);
  } catch (e) {
    console.error(`❌ insert ${label}: ${(e as Error).message}`);
    Deno.exitCode = 1;
  }
}

// 查询回来看看
try {
  const all = (await db_query(path, "blobs")) as any[];
  console.log(`\n查询全部: ${all.length} 条`);
  for (const doc of all) {
    const len = typeof doc.data === "string" ? doc.data.length : 0;
    console.log(`   ${doc.name}: data.length = ${len}`);
  }
} catch (e) {
  const msg = (e as Error).message;
  if (msg.includes("500999") || msg.includes("exceeds")) {
    console.log(`\n⚠️  查询超过 16MB 响应上限（预期行为）：${msg}`);
  } else {
    console.error(`❌ 查询失败: ${msg}`);
    Deno.exitCode = 1;
  }
}

// 数量累积：100 条 500B 文档，响应仍远低于 16MB 上限
console.log("\n插入 100 条 500B 文档...");
try {
  for (let i = 0; i < 100; i++) {
    await db_insert(path, "many", { idx: i, data: "y".repeat(500) });
  }
  const t0 = performance.now();
  const all = (await db_query(path, "many")) as any[];
  const dt = performance.now() - t0;
  const approxBytes = JSON.stringify(all).length;
  console.log(
    `⏱  查询 100 条: ${dt.toFixed(1)}ms，响应约 ${(approxBytes / 1024).toFixed(1)}KB，共 ${all.length} 条`,
  );
} catch (e) {
  console.error(`❌ 失败: ${(e as Error).message}`);
  Deno.exitCode = 1;
}
