use crate::db::polodb::FunxDB;
use crate::utils::cjson::{parse_json, write_error, write_success};
use safer_ffi::prelude::*;
use serde::Deserialize;
use serde_json::json;
use std::ffi::c_char;
use std::os::raw::c_int;

#[derive(Debug, Deserialize)]
struct DbReq {
    path: String,
    collection: Option<String>,
    filter: Option<serde_json::Value>,
    limit: Option<u64>,
    skip: Option<u64>,
    sort: Option<serde_json::Value>,
    doc: Option<serde_json::Value>,
    update: Option<serde_json::Value>,
}

#[ffi_export]
fn post_db_create(json_in: *const c_char, json_out: *mut c_char) -> c_int {
    let req: DbReq = match parse_json(json_in) {
        Ok(v) => v,
        Err(e) => return write_error(json_out, 400101, &e),
    };

    let collection = match req.collection {
        Some(v) => v,
        None => return write_error(json_out, 400102, "collection is required"),
    };

    let db = match FunxDB::open(&req.path) {
        Ok(v) => v,
        Err(e) => return write_error(json_out, 500100, &e),
    };

    match db.create_collection(&collection) {
        Ok(_) => write_success(json_out, "success", json!({})),
        Err(e) => write_error(json_out, 500101, &e),
    }
}

#[ffi_export]
fn post_db_insert(json_in: *const c_char, json_out: *mut c_char) -> c_int {
    let req: DbReq = match parse_json(json_in) {
        Ok(v) => v,
        Err(e) => return write_error(json_out, 400101, &e),
    };

    let collection = match req.collection {
        Some(v) => v,
        None => return write_error(json_out, 400102, "collection is required"),
    };

    let doc = match req.doc {
        Some(v) => v,
        None => return write_error(json_out, 400103, "doc is required"),
    };

    let db = match FunxDB::open(&req.path) {
        Ok(v) => v,
        Err(e) => return write_error(json_out, 500100, &e),
    };

    match db.insert(&collection, doc) {
        Ok(_) => write_success(json_out, "success", json!({})),
        Err(e) => write_error(json_out, 500101, &e),
    }
}

#[ffi_export]
fn post_db_query(json_in: *const c_char, json_out: *mut c_char) -> c_int {
    let req: DbReq = match parse_json(json_in) {
        Ok(v) => v,
        Err(e) => return write_error(json_out, 400101, &e),
    };

    let collection = match req.collection {
        Some(v) => v,
        None => return write_error(json_out, 400102, "collection is required"),
    };

    let db = match FunxDB::open(&req.path) {
        Ok(v) => v,
        Err(e) => return write_error(json_out, 500100, &e),
    };

    match db.query(&collection, req.filter, req.limit, req.skip, req.sort) {
        Ok(v) => write_success(json_out, "success", v),
        Err(e) => write_error(json_out, 500101, &e),
    }
}

#[ffi_export]
fn post_db_update(json_in: *const c_char, json_out: *mut c_char) -> c_int {
    let req: DbReq = match parse_json(json_in) {
        Ok(v) => v,
        Err(e) => return write_error(json_out, 400101, &e),
    };

    let collection = match req.collection {
        Some(v) => v,
        None => return write_error(json_out, 400102, "collection is required"),
    };

    let update = match req.update {
        Some(v) => v,
        None => return write_error(json_out, 400105, "update is required"),
    };

    let db = match FunxDB::open(&req.path) {
        Ok(v) => v,
        Err(e) => return write_error(json_out, 500100, &e),
    };

    match db.update(&collection, req.filter, update) {
        Ok(_) => write_success(json_out, "success", json!({})),
        Err(e) => write_error(json_out, 500101, &e),
    }
}

#[ffi_export]
fn post_db_delete(json_in: *const c_char, json_out: *mut c_char) -> c_int {
    let req: DbReq = match parse_json(json_in) {
        Ok(v) => v,
        Err(e) => return write_error(json_out, 400101, &e),
    };

    let collection = match req.collection {
        Some(v) => v,
        None => return write_error(json_out, 400102, "collection is required"),
    };

    let db = match FunxDB::open(&req.path) {
        Ok(v) => v,
        Err(e) => return write_error(json_out, 500100, &e),
    };

    match db.delete(&collection, req.filter) {
        Ok(_) => write_success(json_out, "success", json!({})),
        Err(e) => write_error(json_out, 500101, &e),
    }
}



