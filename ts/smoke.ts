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

const path = `smoke_${Date.now()}`;

try {
  const r = await callFfi("db_create", { path, collection: "users" });
  console.log("db_create ->", r);
} catch (err) {
  console.error("db_create 失败:", err);
}
