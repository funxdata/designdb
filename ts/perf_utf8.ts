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

const path = `perf_utf8_${Date.now()}`;
const collection = "texts";

const cases: Array<{ name: string; data: string }> = [
  { name: "纯中文", data: "你好世界，这是一个测试" },
  { name: "中英混合", data: "Hello 世界 foo 测试 bar" },
  { name: "emoji", data: "😀🎉🚀🔥💡" },
  { name: "换行制表", data: "line1\nline2\tline3\r\nline4" },
  { name: "引号反斜杠", data: `"quoted" and \\backslash\\ and 'single'` },
  { name: "长中文", data: "测".repeat(1000) },
  { name: "长emoji", data: "🎉".repeat(500) },
];

for (const c of cases) {
  try {
    await db_insert(path, collection, { name: c.name, data: c.data });
    const arr = (await db_query(path, collection, { filter: { name: c.name } })) as any[];
    if (arr.length !== 1) {
      throw new Error(`查询到 ${arr.length} 条，期望 1`);
    }
    assertEq(arr[0].data, c.data, `${c.name} 内容一致`);
    console.log(`✅ ${c.name}: ${c.data.length} 字符，往返一致`);
  } catch (e) {
    console.error(`❌ ${c.name}: ${(e as Error).message}`);
    Deno.exitCode = 1;
  }
}


