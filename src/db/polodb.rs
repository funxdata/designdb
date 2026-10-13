use polodb_core::{Database, CollectionT};
use crate::utils::bson_conv::{bson_to_json, json_to_bson};
use polodb_core::bson::Document;
use serde_json::Value;
use std::path::Path;
use std::fs;

const DATABASE_DIR: &str = "./designdb";

pub struct FunxDB {
    db: Database,
}

impl FunxDB {
    pub fn open(name: &str) -> Result<Self, String> {
        fs::create_dir_all(DATABASE_DIR).map_err(|e| e.to_string())?;
        let db_path = Path::new(DATABASE_DIR).join(name);
        let db = Database::open_path(db_path).map_err(|e| e.to_string())?;
        Ok(Self { db })
    }

    /// PoloDB 不需要 schema，collection 在首次插入时自动创建。
    /// 这里显式触发一次空操作确保 collection 存在。
    pub fn create_collection(&self, name: &str) -> Result<(), String> {
        let coll = self.db.collection::<Document>(name);
        // 空插入会创建 collection 元数据，但会污染数据；
        // 更干净的方式是直接返回 Ok，PoloDB 的 collection 是惰性的。
        let _ = coll;
        Ok(())
    }

    pub fn insert(&self, collection: &str, doc: Value) -> Result<(), String> {
        let coll = self.db.collection::<Document>(collection);
        let bson_doc = json_to_bson(doc)?;
        coll.insert_one(bson_doc).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn query(
        &self,
        collection: &str,
        filter: Option<Value>,
        limit: Option<u64>,
        skip: Option<u64>,
        sort: Option<Value>,
    ) -> Result<Value, String> {
        let coll = self.db.collection::<Document>(collection);
        let filter_bson = match filter {
            Some(v) => json_to_bson(v)?,
            None => Document::new(),
        };

        let mut find = coll.find(filter_bson);
        if let Some(l) = limit { find = find.limit(l); }
        if let Some(s) = skip  { find = find.skip(s); }
        if let Some(s) = sort {
            let sort_bson = json_to_bson(s)?;
            find = find.sort(sort_bson);
        }

        let cursor = find.run().map_err(|e| e.to_string())?;
        let docs: Result<Vec<Document>, _> = cursor.collect();
        let docs = docs.map_err(|e| e.to_string())?;

        let json_docs: Vec<Value> = docs.into_iter().map(bson_to_json).collect::<Result<_, _>>()?;
        Ok(serde_json::json!(json_docs))
    }

    pub fn update(
        &self,
        collection: &str,
        filter: Option<Value>,
        update: Value,
    ) -> Result<(), String> {
        let coll = self.db.collection::<Document>(collection);
        let filter_bson = match filter {
            Some(v) => json_to_bson(v)?,
            None => Document::new(),
        };
        let update_bson = json_to_bson(update)?;
        coll.update_many(filter_bson, update_bson).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete(&self, collection: &str, filter: Option<Value>) -> Result<(), String> {
        let coll = self.db.collection::<Document>(collection);
        match filter {
            Some(v) => {
                let filter_bson = json_to_bson(v)?;
                coll.delete_many(filter_bson).map_err(|e| e.to_string())?;
            }
            None => {
                // filter 为 None 时删除全部
                coll.delete_many(Document::new()).map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }
}
