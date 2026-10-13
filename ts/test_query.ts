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
  options?: {
    filter?: Record<string, unknown>;
    limit?: number;
    skip?: number;
    sort?: Record<string, number>;
  },
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

const path = `test_query_${Date.now()}`;
const collection = "users";

for (const u of [
  { name: "tom", age: 18 },
  { name: "jerry", age: 20 },
  { name: "spike", age: 22 },
  { name: "tyke", age: 16 },
]) {
  await db_insert(path, collection, u);
}

await runCase("query: 全部", async () => {
  const arr = (await db_query(path, collection)) as any[];
  assertEq(arr.length, 4, "count");
});

await runCase("query: filter eq", async () => {
  const arr = (await db_query(path, collection, { filter: { name: "tom" } })) as any[];
  assertEq(arr.length, 1, "count");
  assertEq(arr[0].age, 18, "age");
});

await runCase("query: filter $gt", async () => {
  const arr = (await db_query(path, collection, {
    filter: { age: { $gt: 18 } },
  })) as any[];
  assertEq(arr.length, 2, "count");
});

await runCase("query: filter $in", async () => {
  const arr = (await db_query(path, collection, {
    filter: { name: { $in: ["tom", "spike"] } },
  })) as any[];
  assertEq(arr.length, 2, "count");
});

await runCase("query: limit", async () => {
  const arr = (await db_query(path, collection, { limit: 2 })) as any[];
  assertEq(arr.length, 2, "count");
});

await runCase("query: skip", async () => {
  const arr = (await db_query(path, collection, { skip: 3 })) as any[];
  assertEq(arr.length, 1, "count");
});

await runCase("query: limit + skip", async () => {
  const arr = (await db_query(path, collection, { limit: 1, skip: 1 })) as any[];
  assertEq(arr.length, 1, "count");
});

await runCase("query: sort asc", async () => {
  const arr = (await db_query(path, collection, { sort: { age: 1 } })) as any[];
  assertEq(arr[0].name, "tyke", "first");
  assertEq(arr[3].name, "spike", "last");
});

await runCase("query: sort desc", async () => {
  const arr = (await db_query(path, collection, { sort: { age: -1 } })) as any[];
  assertEq(arr[0].name, "spike", "first");
  assertEq(arr[3].name, "tyke", "last");
});

await runCase("query: 空集合", async () => {
  const arr = (await db_query(path, "nothing")) as any[];
  assertEq(arr.length, 0, "count");
});

await runCase("query: 无匹配", async () => {
  const arr = (await db_query(path, collection, {
    filter: { name: "nobody" },
  })) as any[];
  assertEq(arr.length, 0, "count");
});

await runCase("query: 结果含 _id", async () => {
  const arr = (await db_query(path, collection, { filter: { name: "tom" } })) as any[];
  if (!arr[0]._id) throw new Error("expected _id");
});


