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

const db_delete = (
  path: string,
  collection: string,
  filter?: Record<string, unknown>,
) => callFfi("db_delete", { path, collection, filter });

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

async function seed(path: string, collection: string) {
  for (const n of ["a", "b", "c"]) {
    await db_insert(path, collection, { name: n, age: 18 });
  }
}

await runCase("delete: 按 filter 删", async () => {
  const path = `test_delete_${Date.now()}_1`;
  const c = "users";
  await seed(path, c);
  await db_delete(path, c, { name: "b" });
  const arr = (await db_query(path, c)) as any[];
  assertEq(arr.length, 2, "count");
  if (arr.some((d) => d.name === "b")) throw new Error("b 没删掉");
});

await runCase("delete: 全部删除", async () => {
  const path = `test_delete_${Date.now()}_2`;
  const c = "users";
  await seed(path, c);
  await db_delete(path, c);
  const arr = (await db_query(path, c)) as any[];
  assertEq(arr.length, 0, "count");
});

await runCase("delete: 无匹配 no-op", async () => {
  const path = `test_delete_${Date.now()}_3`;
  const c = "users";
  await seed(path, c);
  await db_delete(path, c, { name: "zzz" });
  const arr = (await db_query(path, c)) as any[];
  assertEq(arr.length, 3, "count");
});

await runCase("delete: $gte", async () => {
  const path = `test_delete_${Date.now()}_4`;
  const c = "users";
  await db_insert(path, c, { name: "a", age: 10 });
  await db_insert(path, c, { name: "b", age: 20 });
  await db_insert(path, c, { name: "c", age: 30 });
  await db_delete(path, c, { age: { $gte: 20 } });
  const arr = (await db_query(path, c)) as any[];
  assertEq(arr.length, 1, "count");
  assertEq(arr[0].name, "a", "remaining");
});


