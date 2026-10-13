const BASE_URL = "http://127.0.0.1:44944/libdesigndb";

async function callFfi<T = any>(symbol: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/libary",
      "FFI-Symbol": symbol,   // 不带 post_ 前缀
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`HTTP 错误: ${response.status} - ${response.statusText}`);
  const data = await response.json();
  if (data.code === 200) return data.data;
  throw new Error(`err info: ${data.msg} (code=${data.code})`);
}
