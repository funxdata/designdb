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

async function bench(label: string, n: number, fn: (i: number) => Promise<unknown>) {
  const t0 = performance.now();
  for (let i = 0; i < n; i++) {
    await fn(i);
  }
  const dt = performance.now() - t0;
  const qps = (n / (dt / 1000)).toFixed(1);
  console.log(`⏱  ${label}: ${n} 次 / ${dt.toFixed(1)}ms  →  ${qps} ops/s`);
  return dt;
}

const path = `perf_insert_${Date.now()}`;

// 1. 串行插入 100 条
await bench("串行插入 100 条", 100, (i) =>
  db_insert(path, "users", { name: `u${i}`, age: 20 + (i % 50) }),
);

// 2. 串行插入 500 条（同 path，观察线性度）
await bench("串行插入 500 条", 500, (i) =>
  db_insert(path, "users", { name: `v${i}`, age: 20 + (i % 50) }),
);

// 3. 大一点文档
const padding = "x".repeat(1000);
await bench("插入 1KB 文档 100 条", 100, (i) =>
  db_insert(path, "big", { name: `b${i}`, data: padding }),
);


