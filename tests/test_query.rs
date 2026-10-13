mod common;

use designdb::db::polodb::FunxDB;
use serde_json::json;

fn seed(db: &FunxDB) {
    for (n, a) in [("tom", 18), ("jerry", 20), ("spike", 22), ("tyke", 16)] {
        db.insert("users", json!({ "name": n, "age": a })).unwrap();
    }
}

#[test]
fn query_all() {
    let name = common::unique_db_name("q_all");
    let db = FunxDB::open(&name).unwrap();
    seed(&db);
    let r = db.query("users", None, None, None, None).unwrap();
    assert_eq!(r.as_array().unwrap().len(), 4);
    common::cleanup_db(&name);
}

#[test]
fn query_with_filter_eq() {
    let name = common::unique_db_name("q_eq");
    let db = FunxDB::open(&name).unwrap();
    seed(&db);
    let r = db
        .query("users", Some(json!({ "name": "tom" })), None, None, None)
        .unwrap();
    let arr = r.as_array().unwrap();
    assert_eq!(arr.len(), 1);
    assert_eq!(arr[0]["age"], 18);
    common::cleanup_db(&name);
}

#[test]
fn query_with_filter_gt() {
    let name = common::unique_db_name("q_gt");
    let db = FunxDB::open(&name).unwrap();
    seed(&db);
    let r = db
        .query("users", Some(json!({ "age": { "$gt": 18 } })), None, None, None)
        .unwrap();
    assert_eq!(r.as_array().unwrap().len(), 2); // jerry, spike
    common::cleanup_db(&name);
}

#[test]
fn query_with_filter_in() {
    let name = common::unique_db_name("q_in");
    let db = FunxDB::open(&name).unwrap();
    seed(&db);
    let r = db
        .query(
            "users",
            Some(json!({ "name": { "$in": ["tom", "spike"] } })),
            None,
            None,
            None,
        )
        .unwrap();
    assert_eq!(r.as_array().unwrap().len(), 2);
    common::cleanup_db(&name);
}

#[test]
fn query_with_limit() {
    let name = common::unique_db_name("q_limit");
    let db = FunxDB::open(&name).unwrap();
    seed(&db);
    let r = db.query("users", None, Some(2), None, None).unwrap();
    assert_eq!(r.as_array().unwrap().len(), 2);
    common::cleanup_db(&name);
}

#[test]
fn query_with_skip() {
    let name = common::unique_db_name("q_skip");
    let db = FunxDB::open(&name).unwrap();
    seed(&db);
    let r = db.query("users", None, None, Some(3), None).unwrap();
    assert_eq!(r.as_array().unwrap().len(), 1);
    common::cleanup_db(&name);
}

#[test]
fn query_with_limit_and_skip() {
    let name = common::unique_db_name("q_limit_skip");
    let db = FunxDB::open(&name).unwrap();
    seed(&db);
    let r = db.query("users", None, Some(1), Some(1), None).unwrap();
    assert_eq!(r.as_array().unwrap().len(), 1);
    common::cleanup_db(&name);
}

#[test]
fn query_with_sort_asc() {
    let name = common::unique_db_name("q_sort_asc");
    let db = FunxDB::open(&name).unwrap();
    seed(&db);
    let r = db
        .query("users", None, None, None, Some(json!({ "age": 1 })))
        .unwrap();
    let arr = r.as_array().unwrap();
    assert_eq!(arr[0]["name"], "tyke"); // 16
    assert_eq!(arr[3]["name"], "spike"); // 22
    common::cleanup_db(&name);
}

#[test]
fn query_with_sort_desc() {
    let name = common::unique_db_name("q_sort_desc");
    let db = FunxDB::open(&name).unwrap();
    seed(&db);
    let r = db
        .query("users", None, None, None, Some(json!({ "age": -1 })))
        .unwrap();
    let arr = r.as_array().unwrap();
    assert_eq!(arr[0]["name"], "spike"); // 22
    assert_eq!(arr[3]["name"], "tyke"); // 16
    common::cleanup_db(&name);
}

#[test]
fn query_empty_collection() {
    let name = common::unique_db_name("q_empty");
    let db = FunxDB::open(&name).unwrap();
    let r = db.query("nothing", None, None, None, None).unwrap();
    assert_eq!(r.as_array().unwrap().len(), 0);
    common::cleanup_db(&name);
}

#[test]
fn query_no_match() {
    let name = common::unique_db_name("q_nomatch");
    let db = FunxDB::open(&name).unwrap();
    seed(&db);
    let r = db
        .query("users", Some(json!({ "name": "nobody" })), None, None, None)
        .unwrap();
    assert_eq!(r.as_array().unwrap().len(), 0);
    common::cleanup_db(&name);
}

#[test]
fn query_result_has_object_id() {
    let name = common::unique_db_name("q_oid");
    let db = FunxDB::open(&name).unwrap();
    db.insert("users", json!({ "name": "tom" })).unwrap();
    let r = db.query("users", None, None, None, None).unwrap();
    let doc = &r.as_array().unwrap()[0];
    // PoloDB 自动生成 _id
    assert!(doc.get("_id").is_some(), "expected _id in result");
    common::cleanup_db(&name);
}


