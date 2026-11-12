/**
 * Deno FFI 客户端：直接加载 designdb 动态库，不经过 cytrron / HTTP。
 *
 * 运行前先 `cargo build --release`，或用 DESIGNDB_LIB 指定库路径。
 * 测试代码仍按 cyctron 的逻辑符号名（db_create / db_query / ...）调用，
 * 本模块内部映射为导出符号 `post_db_*`。
 */

export type DesigndbSymbol =
  | "db_create"
  | "db_insert"
  | "db_query"
  | "db_update"
  | "db_delete";

/** 与 src/utils/cjson.rs 的 MAX_RESPONSE_BYTES 一致，出参再留 1 字节给 NUL。 */
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;

function resolveLibPath(): string | URL {
  const override = Deno.env.get("DESIGNDB_LIB");
  if (override) return override;

  const file = Deno.build.os === "windows"
    ? "designdb.dll"
    : Deno.build.os === "darwin"
    ? "libdesigndb.dylib"
    : "libdesigndb.so";

  return new URL(`../../target/release/${file}`, import.meta.url);
}

const lib = Deno.dlopen(resolveLibPath(), {
  post_db_create: { parameters: ["buffer", "buffer"], result: "i32" },
  post_db_insert: { parameters: ["buffer", "buffer"], result: "i32" },
  post_db_query: { parameters: ["buffer", "buffer"], result: "i32" },
  post_db_update: { parameters: ["buffer", "buffer"], result: "i32" },
  post_db_delete: { parameters: ["buffer", "buffer"], result: "i32" },
});

const symbols = lib.symbols as unknown as Record<
  `post_${DesigndbSymbol}`,
  (input: Uint8Array, output: Uint8Array) => number
>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function decodeCString(bytes: Uint8Array): string {
  const end = bytes.indexOf(0);
  return decoder.decode(end === -1 ? bytes : bytes.subarray(0, end));
}

/** 调用一个导出符号，返回响应封套中的 `data`。 */
export function callFfi<T = unknown>(
  symbol: DesigndbSymbol,
  payload: Record<string, unknown>,
): T {
  const encoded = encoder.encode(JSON.stringify(payload));
  const input = new Uint8Array(encoded.length + 1);
  input.set(encoded);
  input[encoded.length] = 0;

  const output = new Uint8Array(MAX_RESPONSE_BYTES + 1);
  const rc = symbols[`post_${symbol}`](input, output);

  if (rc === -1) throw new Error(`${symbol}: json_out 为空指针`);
  if (rc === -2) {
    throw new Error(`${symbol}: 响应超过 ${MAX_RESPONSE_BYTES} 字节`);
  }

  const text = decodeCString(output);
  if (!text) throw new Error(`${symbol}: 库未写入输出（rc=${rc}）`);

  const data = JSON.parse(text) as { code: number; data: unknown; msg: string };
  if (data.code === 200) return data.data as T;
  throw new Error(`err info: ${data.msg} (code=${data.code})`);
}

export function closeLib(): void {
  lib.close();
}
