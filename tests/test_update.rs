mod common;

use designdb::db::polodb::FunxDB;
use serde_json::json;

#[test]
fn update_set_single_field() {
    let name = common::unique_db_name("u_set");
    let db = FunxDB::open(&name).unwrap();
    db.insert("users", json!({ "name": "tom", "age": 18 })).unwrap();

    db.update(
        "users",
        Some(json!({ "name": "tom" })),
        json!({ "$set": { "age": 20 } }),
    )
    .unwrap();

    let r = db.query("users", Some(json!({ "name": "tom" })), None, None, None).unwrap();
    assert_eq!(r.as_array().unwrap()[0]["age"], 20);
    common::cleanup_db(&name);
}

#[test]
fn update_multiple_documents() {
    let name = common::unique_db_name("u_many");
    let db = FunxDB::open(&name).unwrap();
    for n in ["a", "b", "c"] {
        db.insert("users", json!({ "name": n, "age": 18 })).unwrap();
    }
    db.update("users", None, json!({ "$set": { "age": 30 } })).unwrap();
    let r = db.query("users", None, None, None, None).unwrap();
    for doc in r.as_array().unwrap() {
        assert_eq!(doc["age"], 30);
    }
    common::cleanup_db(&name);
}

#[test]
fn update_inc_operator() {
    let name = common::unique_db_name("u_inc");
    let db = FunxDB::open(&name).unwrap();
    db.insert("users", json!({ "name": "tom", "age": 18 })).unwrap();
    db.update(
        "users",
        Some(json!({ "name": "tom" })),
        json!({ "$inc": { "age": 1 } }),
    )
    .unwrap();
    let r = db.query("users", Some(json!({ "name": "tom" })), None, None, None).unwrap();
    assert_eq!(r.as_array().unwrap()[0]["age"], 19);
    common::cleanup_db(&name);
}

#[test]
fn update_no_match_is_noop() {
    let name = common::unique_db_name("u_nomatch");
    let db = FunxDB::open(&name).unwrap();
    db.insert("users", json!({ "name": "tom", "age": 18 })).unwrap();
    db.update(
        "users",
        Some(json!({ "name": "nobody" })),
        json!({ "$set": { "age": 99 } }),
    )
    .unwrap();
    let r = db.query("users", None, None, None, None).unwrap();
    assert_eq!(r.as_array().unwrap()[0]["age"], 18);
    common::cleanup_db(&name);
}


