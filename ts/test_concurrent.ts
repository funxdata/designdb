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
    throw new Error(`HTTP 错误: ${response.status} - ${response.statusText}`);
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
  options?: { filter?: Record<string, unknown> },
) => callFfi("db_query", { path, collection, ...options });

function assertEq<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(
      `ASSERT FAILED: ${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`,
    );
  }
}

async function runCase(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    console.error(`❌ ${name}`);
    console.error(e);
    Deno.exitCode = 1;
  }
}

// 同一 path，并发插入 10 条
await runCase("concurrent: 同库并发插入 10 条", async () => {
  const path = `test_concurrent_${Date.now()}_1`;
  const tasks = Array.from({ length: 10 }, (_, i) =>
    db_insert(path, "users", { name: `c${i}`, idx: i }),
  );
  const results = await Promise.allSettled(tasks);
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error("失败数:", failed.length);
    for (const f of failed) console.error(" -", (f as PromiseRejectedResult).reason);
  }
  const arr = (await db_query(path, "users")) as any[];
  assertEq(arr.length, 10, "查询到 10 条");
});

// 不同 path，并发插入
await runCase("concurrent: 不同库并发插入", async () => {
  const base = `test_concurrent_${Date.now()}_2`;
  const tasks = Array.from({ length: 5 }, (_, i) =>
    db_insert(`${base}_${i}`, "users", { name: `x${i}` }),
  );
  const results = await Promise.allSettled(tasks);
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error("失败数:", failed.length);
    for (const f of failed) console.error(" -", (f as PromiseRejectedResult).reason);
  }
  for (let i = 0; i < 5; i++) {
    const arr = (await db_query(`${base}_${i}`, "users")) as any[];
    assertEq(arr.length, 1, `库 ${i} 有 1 条`);
  }
});

// 同库并发混合读写
await runCase("concurrent: 同库并发读写", async () => {
  const path = `test_concurrent_${Date.now()}_3`;
  const tasks = [
    ...Array.from({ length: 5 }, (_, i) =>
      db_insert(path, "users", { name: `w${i}` }),
    ),
    ...Array.from({ length: 5 }, () => db_query(path, "users")),
  ];
  const results = await Promise.allSettled(tasks);
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error("失败数:", failed.length);
    for (const f of failed) console.error(" -", (f as PromiseRejectedResult).reason);
  }
  const arr = (await db_query(path, "users")) as any[];
  assertEq(arr.length, 5, "最终 5 条");
});

