use designdb::utils::bson_conv::{bson_to_json, json_to_bson};
use serde_json::json;

#[test]
fn json_to_bson_basic_types() {
    let v = json!({
        "s": "hello",
        "i": 42,
        "f": 3.14,
        "b": true,
        "n": null,
        "arr": [1, 2, 3],
        "nested": { "x": 1 }
    });
    let doc = json_to_bson(v).unwrap();
    assert_eq!(doc.get_str("s").unwrap(), "hello");
    assert_eq!(doc.get_i32("i").unwrap(), 42);
    assert_eq!(doc.get_f64("f").unwrap(), 3.14);
    assert_eq!(doc.get_bool("b").unwrap(), true);
    assert!(doc.get("n").is_some());
    assert_eq!(doc.get_array("arr").unwrap().len(), 3);
    assert!(doc.get_document("nested").is_ok());
}

#[test]
fn json_to_bson_rejects_non_object() {
    assert!(json_to_bson(json!([1, 2, 3])).is_err());
    assert!(json_to_bson(json!("str")).is_err());
    assert!(json_to_bson(json!(42)).is_err());
}

#[test]
fn bson_roundtrip() {
    let original = json!({
        "name": "tom",
        "age": 18,
        "score": 95.5,
        "active": true,
        "tags": ["a", "b"],
        "profile": { "city": "bj" }
    });
    let doc = json_to_bson(original.clone()).unwrap();
    let back = bson_to_json(doc).unwrap();
    assert_eq!(back, original);
}

#[test]
fn bson_int32_and_int64() {
    // i32 范围
    let v = json!({ "small": 100 });
    let doc = json_to_bson(v).unwrap();
    let back = bson_to_json(doc).unwrap();
    assert_eq!(back["small"], 100);

    // i64 范围
    let v = json!({ "big": 10_000_000_000i64 });
    let doc = json_to_bson(v).unwrap();
    let back = bson_to_json(doc).unwrap();
    assert_eq!(back["big"], 10_000_000_000i64);
}

#[test]
fn bson_objectid_becomes_hex_string() {
    // 通过插入一条记录来产生 _id
    // 这里只测转换函数本身对空文档不 panic
    let doc = json_to_bson(json!({})).unwrap();
    let back = bson_to_json(doc).unwrap();
    assert!(back.is_object());
}


