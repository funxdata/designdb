import { callFfi } from "./lib/designdb.ts";

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

async function bench(
  label: string,
  n: number,
  fn: (i: number) => Promise<unknown>,
) {
  const t0 = performance.now();
  const tasks = Array.from({ length: n }, (_, i) => fn(i));
  const results = await Promise.allSettled(tasks);
  const dt = performance.now() - t0;
  const failed = results.filter((r) => r.status === "rejected").length;
  const qps = (n / (dt / 1000)).toFixed(1);
  const mark = failed === 0 ? "✅" : "⚠️ ";
  console.log(
    `${mark} ${label}: ${n} 并发 / ${dt.toFixed(1)}ms  →  ${qps} ops/s，失败 ${failed}`,
  );
  if (failed > 0) {
    Deno.exitCode = 1;
    for (const f of results) {
      if (f.status === "rejected") {
        console.error("   -", (f as PromiseRejectedResult).reason);
        break;
      }
    }
  }
  return failed;
}

// 1. 并发 10 插入
{
  const path = `perf_c10_${Date.now()}`;
  await bench("并发 10 插入", 10, (i) =>
    db_insert(path, "users", { name: `u${i}`, age: 20 + i }),
  );
  const arr = (await db_query(path, "users")) as any[];
  assertEq(arr.length, 10, "并发 10 插入结果数");
}

// 2. 并发 50 插入
{
  const path = `perf_c50_${Date.now()}`;
  await bench("并发 50 插入", 50, (i) =>
    db_insert(path, "users", { name: `u${i}`, age: 20 + i }),
  );
  const arr = (await db_query(path, "users")) as any[];
  assertEq(arr.length, 50, "并发 50 插入结果数");
}

// 3. 并发 100 插入
{
  const path = `perf_c100_${Date.now()}`;
  await bench("并发 100 插入", 100, (i) =>
    db_insert(path, "users", { name: `u${i}`, age: 20 + i }),
  );
  const arr = (await db_query(path, "users")) as any[];
  assertEq(arr.length, 100, "并发 100 插入结果数");
}

// 4. 并发 100 读写混合
{
  const path = `perf_mix_${Date.now()}`;
  // 先插入 50 条作为底座
  for (let i = 0; i < 50; i++) {
    await db_insert(path, "users", { name: `base${i}` });
  }
  const tasks = [
    ...Array.from({ length: 50 }, (_, i) =>
      db_insert(path, "users", { name: `w${i}` }),
    ),
    ...Array.from({ length: 50 }, () => db_query(path, "users")),
  ];
  const t0 = performance.now();
  const results = await Promise.allSettled(tasks);
  const dt = performance.now() - t0;
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(
    `${failed === 0 ? "✅" : "⚠️ "} 并发 100 读写混合: ${dt.toFixed(1)}ms，失败 ${failed}`,
  );
  const arr = (await db_query(path, "users")) as any[];
  assertEq(arr.length, 100, "混合后总数");
}

// 5. 持续 10 轮 × 并发 10 = 100 次操作
{
  const path = `perf_sustain_${Date.now()}`;
  const t0 = performance.now();
  let totalFailed = 0;
  for (let round = 0; round < 10; round++) {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        db_insert(path, "users", { name: `r${round}_${i}` }),
      ),
    );
    totalFailed += results.filter((r) => r.status === "rejected").length;
  }
  const dt = performance.now() - t0;
  console.log(
    `${totalFailed === 0 ? "✅" : "⚠️ "} 持续 10 轮 × 10 并发: ${dt.toFixed(1)}ms，失败 ${totalFailed}`,
  );
  const arr = (await db_query(path, "users")) as any[];
  assertEq(arr.length, 100, "持续后总数");
}


