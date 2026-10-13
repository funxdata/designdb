mod common;

use designdb::db::polodb::FunxDB;
use serde_json::json;

fn seed(db: &FunxDB) {
    for n in ["a", "b", "c"] {
        db.insert("users", json!({ "name": n, "age": 18 })).unwrap();
    }
}

#[test]
fn delete_by_filter() {
    let name = common::unique_db_name("d_filter");
    let db = FunxDB::open(&name).unwrap();
    seed(&db);
    db.delete("users", Some(json!({ "name": "b" }))).unwrap();
    let r = db.query("users", None, None, None, None).unwrap();
    let arr = r.as_array().unwrap();
    assert_eq!(arr.len(), 2);
    assert!(arr.iter().all(|d| d["name"] != "b"));
    common::cleanup_db(&name);
}

#[test]
fn delete_all_with_none_filter() {
    let name = common::unique_db_name("d_all");
    let db = FunxDB::open(&name).unwrap();
    seed(&db);
    db.delete("users", None).unwrap();
    let r = db.query("users", None, None, None, None).unwrap();
    assert_eq!(r.as_array().unwrap().len(), 0);
    common::cleanup_db(&name);
}

#[test]
fn delete_no_match_is_noop() {
    let name = common::unique_db_name("d_nomatch");
    let db = FunxDB::open(&name).unwrap();
    seed(&db);
    db.delete("users", Some(json!({ "name": "zzz" }))).unwrap();
    let r = db.query("users", None, None, None, None).unwrap();
    assert_eq!(r.as_array().unwrap().len(), 3);
    common::cleanup_db(&name);
}

#[test]
fn delete_with_gt_filter() {
    let name = common::unique_db_name("d_gt");
    let db = FunxDB::open(&name).unwrap();
    db.insert("users", json!({ "name": "a", "age": 10 })).unwrap();
    db.insert("users", json!({ "name": "b", "age": 20 })).unwrap();
    db.insert("users", json!({ "name": "c", "age": 30 })).unwrap();
    db.delete("users", Some(json!({ "age": { "$gte": 20 } }))).unwrap();
    let r = db.query("users", None, None, None, None).unwrap();
    let arr = r.as_array().unwrap();
    assert_eq!(arr.len(), 1);
    assert_eq!(arr[0]["name"], "a");
    common::cleanup_db(&name);
}


