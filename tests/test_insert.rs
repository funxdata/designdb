mod common;

use designdb::db::polodb::FunxDB;
use serde_json::json;

#[test]
fn insert_single_document() {
    let name = common::unique_db_name("insert_one");
    let db = FunxDB::open(&name).expect("open db");
    db.insert("users", json!({ "name": "tom", "age": 18 }))
        .expect("insert");

    let result = db
        .query("users", None, None, None, None)
        .expect("query");
    let arr = result.as_array().expect("array");
    assert_eq!(arr.len(), 1);
    assert_eq!(arr[0]["name"], "tom");
    assert_eq!(arr[0]["age"], 18);
    common::cleanup_db(&name);
}

#[test]
fn insert_multiple_documents() {
    let name = common::unique_db_name("insert_many");
    let db = FunxDB::open(&name).expect("open db");
    for i in 0..10 {
        db.insert("users", json!({ "name": format!("u{}", i), "age": 20 + i }))
            .expect("insert");
    }
    let result = db.query("users", None, None, None, None).expect("query");
    assert_eq!(result.as_array().unwrap().len(), 10);
    common::cleanup_db(&name);
}

#[test]
fn insert_nested_document() {
    let name = common::unique_db_name("insert_nested");
    let db = FunxDB::open(&name).expect("open db");
    db.insert(
        "users",
        json!({
            "name": "tom",
            "address": { "city": "beijing", "zip": "100000" },
            "tags": ["a", "b", "c"]
        }),
    )
    .expect("insert");

    let result = db.query("users", None, None, None, None).expect("query");
    let doc = &result.as_array().unwrap()[0];
    assert_eq!(doc["address"]["city"], "beijing");
    assert_eq!(doc["tags"][2], "c");
    common::cleanup_db(&name);
}

#[test]
fn insert_null_and_bool() {
    let name = common::unique_db_name("insert_null");
    let db = FunxDB::open(&name).expect("open db");
    db.insert("t", json!({ "a": null, "b": true, "c": false }))
        .expect("insert");
    let result = db.query("t", None, None, None, None).expect("query");
    let doc = &result.as_array().unwrap()[0];
    assert!(doc["a"].is_null());
    assert_eq!(doc["b"], true);
    assert_eq!(doc["c"], false);
    common::cleanup_db(&name);
}

#[test]
fn insert_float() {
    let name = common::unique_db_name("insert_float");
    let db = FunxDB::open(&name).expect("open db");
    db.insert("t", json!({ "pi": 3.14, "neg": -0.5 }))
        .expect("insert");
    let result = db.query("t", None, None, None, None).expect("query");
    let doc = &result.as_array().unwrap()[0];
    assert_eq!(doc["pi"], 3.14);
    assert_eq!(doc["neg"], -0.5);
    common::cleanup_db(&name);
}

#[test]
fn insert_to_nonexistent_collection_autocreates() {
    let name = common::unique_db_name("insert_auto");
    let db = FunxDB::open(&name).expect("open db");
    // 不调用 create_collection，直接 insert
    db.insert("brand_new", json!({ "x": 1 })).expect("insert");
    let result = db.query("brand_new", None, None, None, None).expect("query");
    assert_eq!(result.as_array().unwrap().len(), 1);
    common::cleanup_db(&name);
}
