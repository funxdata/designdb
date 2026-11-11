use serde_json::{json, Value};
use serde::de::DeserializeOwned;
use std::ffi::{CStr, c_char};
use std::os::raw::c_int;

/// FFI 单次响应上限：16 MiB（JSON 正文，不含结尾 NUL）。
///
/// 调用方必须分配至少 `MAX_RESPONSE_BYTES + 1` 字节的出参缓冲区。
pub const MAX_RESPONSE_BYTES: usize = 16 * 1024 * 1024;

pub fn write_json_out(json_out: *mut c_char, value: Value) -> c_int {
    if json_out.is_null() {
        return -1;
    }
    let out_str = value.to_string();
    let bytes = out_str.as_bytes();
    if bytes.len() > MAX_RESPONSE_BYTES {
        let err = r#"{"code":500999,"data":{},"msg":"response exceeds 16MB buffer"}"#;
        let eb = err.as_bytes();
        unsafe {
            std::ptr::copy_nonoverlapping(eb.as_ptr(), json_out as *mut u8, eb.len());
            *json_out.add(eb.len()) = 0;
        }
        return -2;
    }
    unsafe {
        std::ptr::copy_nonoverlapping(bytes.as_ptr(), json_out as *mut u8, bytes.len());
        *json_out.add(bytes.len()) = 0;
    }
    0
}

/// 返回错误 JSON
pub fn write_error(json_out: *mut c_char, code: i32, msg: &str) -> c_int {
    write_json_out(
        json_out,
        json!({
            "code": code,
            "data": {},
            "msg": msg
        }),
    )
}

/// 返回成功 JSON
pub fn write_success(json_out: *mut c_char, msg: &str, data: Value) -> c_int {
    write_json_out(
        json_out,
        json!({
            "code": 200,
            "data": data,
            "msg": msg
        }),
    )
}

/// 解析 JSON
pub fn parse_json<T>(
    json_in: *const c_char,
) -> Result<T, String>
where
    T: DeserializeOwned,
{
    if json_in.is_null() {
        return Err("json_in is null".into());
    }

    let body = unsafe {
        CStr::from_ptr(json_in)
            .to_str()
            .map_err(|e| e.to_string())?
    };

    serde_json::from_str(body)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 用足够大的缓冲区调用 write_json_out，返回 (返回码, 实际写入的 JSON)
    fn call(value: Value, cap: usize) -> (c_int, String) {
        let mut buf = vec![0u8; cap + 1];
        let rc = write_json_out(buf.as_mut_ptr() as *mut c_char, value);
        let out = unsafe { CStr::from_ptr(buf.as_ptr() as *const c_char) }
            .to_string_lossy()
            .into_owned();
        (rc, out)
    }

    #[test]
    fn null_out_returns_minus_one() {
        assert_eq!(write_json_out(std::ptr::null_mut(), json!({})), -1);
    }

    #[test]
    fn response_exactly_at_limit_succeeds() {
        // JSON 字符串正文 = 引号(2) + 内容，正好等于上限。
        let value = Value::String("x".repeat(MAX_RESPONSE_BYTES - 2));
        let (rc, out) = call(value, MAX_RESPONSE_BYTES);
        assert_eq!(rc, 0);
        assert_eq!(out.len(), MAX_RESPONSE_BYTES);
    }

    #[test]
    fn response_over_limit_returns_minus_two() {
        let value = Value::String("x".repeat(MAX_RESPONSE_BYTES - 1));
        let (rc, out) = call(value, MAX_RESPONSE_BYTES);
        assert_eq!(rc, -2);
        let parsed: Value = serde_json::from_str(&out).unwrap();
        assert_eq!(parsed["code"], json!(500999));
        assert!(parsed["msg"].as_str().unwrap().contains("16MB"));
    }
}
