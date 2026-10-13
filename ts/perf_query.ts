const BASE_URL = "http://127.0.0.1:44944/libdesigndb";

async function callFfi(symbol: string, payload: Record<string, unknown>) {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/libary",
      "FFI-Symbol": symbol,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`HTTP 错误: ${response.status}`);
  }
  const data = await response.json();
  if (data.code === 200) return data.data;
  throw new Error(`err info: ${data.msg} (code=${data.code})`);
}

const db_insert = (path: string, collection: string, doc: Record<string, unknown>) =>
  callFfi("db_insert", { path, collection, doc });

const db_query = (
  path: string,
  collection: string,
  options?: {
    filter?: Record<string, unknown>;
    limit?: number;
    skip?: number;
    sort?: Record<string, number>;
  },
) => callFfi("db_query", { path, collection, ...options });

async function timeIt<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now();
  const r = await fn();
  const dt = performance.now() - t0;
  console.log(`⏱  ${label}: ${dt.toFixed(1)}ms`);
  return r;
}

const path = `perf_query_${Date.now()}`;
const collection = "users";

// 预置 500 条
console.log("预置 500 条数据...");
for (let i = 0; i < 500; i++) {
  await db_insert(path, collection, { name: `u${i}`, age: 20 + (i % 50) });
}

// 1. 全表查询
const all = (await timeIt("全表查询 500 条", () => db_query(path, collection))) as any[];
console.log(`   结果: ${all.length} 条`);

// 2. 带 filter 查询
const filtered = (await timeIt("filter eq 查询", () =>
  db_query(path, collection, { filter: { name: "u250" } })
)) as any[];
console.log(`   结果: ${filtered.length} 条`);

// 3. 带 sort
const sorted = (await timeIt("sort 查询", () =>
  db_query(path, collection, { sort: { age: -1 } })
)) as any[];
console.log(`   结果: ${sorted.length} 条`);

// 4. 带 limit
const limited = (await timeIt("limit 10 查询", () =>
  db_query(path, collection, { limit: 10 })
)) as any[];
console.log(`   结果: ${limited.length} 条`);

// 5. skip 深翻页
const skipped = (await timeIt("skip 400 查询", () =>
  db_query(path, collection, { skip: 400 })
)) as any[];
console.log(`   结果: ${skipped.length} 条`);

// 6. 连续 50 次小查询
console.log("\n连续 50 次 limit 10 查询...");
{
  const t0 = performance.now();
  for (let i = 0; i < 50; i++) {
    await db_query(path, collection, { limit: 10 });
  }
  const dt = performance.now() - t0;
  console.log(`⏱  50 次: ${dt.toFixed(1)}ms  →  ${(50 / (dt / 1000)).toFixed(1)} ops/s`);
}


