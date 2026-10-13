mod common;

use designdb::db::polodb::FunxDB;

#[test]
fn create_collection_returns_ok() {
    let name = common::unique_db_name("create");
    let db = FunxDB::open(&name).expect("open db");
    db.create_collection("users").expect("create collection");
    common::cleanup_db(&name);
}

#[test]
fn create_multiple_collections() {
    let name = common::unique_db_name("create_multi");
    let db = FunxDB::open(&name).expect("open db");
    for c in ["users", "orders", "products"] {
        db.create_collection(c).expect("create collection");
    }
    common::cleanup_db(&name);
}

#[test]
fn create_empty_name_is_ok_or_err() {
    // PoloDB 对空 collection 名的行为待确认，这里只保证不 panic
    let name = common::unique_db_name("create_empty");
    let db = FunxDB::open(&name).expect("open db");
    let _ = db.create_collection("");
    common::cleanup_db(&name);
}
