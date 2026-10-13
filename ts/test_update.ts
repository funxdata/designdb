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

const db_update = (
  path: string,
  collection: string,
  filter: Record<string, unknown>,
  update: Record<string, unknown>,
) => callFfi("db_update", { path, collection, filter, update });

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

const path = `test_update_${Date.now()}`;
const collection = "users";

await db_insert(path, collection, { name: "tom", age: 18 });
await db_insert(path, collection, { name: "jerry", age: 20 });

await runCase("update: $set 单字段", async () => {
  await db_update(path, collection, { name: "tom" }, { $set: { age: 20 } });
  const arr = (await db_query(path, collection, { filter: { name: "tom" } })) as any[];
  assertEq(arr[0].age, 20, "age after set");
});

await runCase("update: $inc", async () => {
  await db_update(path, collection, { name: "jerry" }, { $inc: { age: 1 } });
  const arr = (await db_query(path, collection, { filter: { name: "jerry" } })) as any[];
  assertEq(arr[0].age, 21, "age after inc");
});

await runCase("update: 无匹配 no-op", async () => {
  await db_update(path, collection, { name: "nobody" }, { $set: { age: 99 } });
  const arr = (await db_query(path, collection, { filter: { name: "nobody" } })) as any[];
  assertEq(arr.length, 0, "仍然 0 条");
});

await runCase("update: 缺 update 报错", async () => {
  let caught = false;
  try {
    await callFfi("db_update", { path, collection, filter: { name: "tom" } });
  } catch (e) {
    caught = true;
    if (!(e as Error).message.includes("400105")) {
      throw new Error(`期望 400105，实际: ${(e as Error).message}`);
    }
  }
  if (!caught) throw new Error("应该抛错但没有");
});


