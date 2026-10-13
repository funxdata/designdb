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

const db_create = (path: string, collection: string) =>
  callFfi("db_create", { path, collection });

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

const path = `test_create_${Date.now()}`;

await runCase("create: 基本创建", async () => {
  const r = await db_create(path, "users");
  // 成功时 data 是 {}，不抛错就说明通了
  assertEq(
      typeof r === "object" && r !== null && !Array.isArray(r),
      true,
      "返回值应是对象（{}）",
  );
});

await runCase("create: 多个 collection", async () => {
  for (const c of ["a", "b", "c"]) {
    await db_create(path, c);
  }
});

await runCase("create: 缺 collection 报错", async () => {
  let caught = false;
  try {
    // @ts-ignore 故意传错，验证后端返回 400102
    await callFfi("db_create", { path });
  } catch (e) {
    caught = true;
    const msg = (e as Error).message;
    if (!msg.includes("400102")) {
      throw new Error(`期望 400102，实际: ${msg}`);
    }
  }
  if (!caught) throw new Error("应该抛错但没有");
});

await runCase("create: 空 body 报错", async () => {
  let caught = false;
  try {
    await callFfi("db_create", {});
  } catch (e) {
    caught = true;
    const msg = (e as Error).message;
    if (!msg.includes("400101")) {
      throw new Error(`期望 400101，实际: ${msg}`);
    }
  }
  if (!caught) throw new Error("应该抛错但没有");
});

