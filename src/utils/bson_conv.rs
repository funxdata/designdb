use polodb_core::bson::{Document, Bson};
use serde_json::{Value, Map};

pub fn json_to_bson(v: Value) -> Result<Document, String> {
    match v {
        Value::Object(map) => {
            let mut doc = Document::new();
            for (k, val) in map {
                doc.insert(k, json_value_to_bson(val)?);
            }
            Ok(doc)
        }
        _ => Err("expected a JSON object".into()),
    }
}

fn json_value_to_bson(v: Value) -> Result<Bson, String> {
    Ok(match v {
        Value::Null => Bson::Null,
        Value::Bool(b) => Bson::Boolean(b),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                if i >= i32::MIN as i64 && i <= i32::MAX as i64 {
                    Bson::Int32(i as i32)
                } else {
                    Bson::Int64(i)
                }
            } else if let Some(f) = n.as_f64() {
                Bson::Double(f)
            } else {
                return Err("unsupported number".into());
            }
        }
        Value::String(s) => Bson::String(s),
        Value::Array(arr) => {
            let mut bson_arr = Vec::new();
            for item in arr {
                bson_arr.push(json_value_to_bson(item)?);
            }
            Bson::Array(bson_arr)
        }
        Value::Object(map) => {
            let mut doc = Document::new();
            for (k, val) in map {
                doc.insert(k, json_value_to_bson(val)?);
            }
            Bson::Document(doc)
        }
    })
}

pub fn bson_to_json(doc: Document) -> Result<Value, String> {
    let mut map = Map::new();
    for (k, v) in doc {
        map.insert(k, bson_value_to_json(v)?);
    }
    Ok(Value::Object(map))
}

fn bson_value_to_json(v: Bson) -> Result<Value, String> {
    Ok(match v {
        Bson::Null => Value::Null,
        Bson::Boolean(b) => Value::Bool(b),
        Bson::Int32(i) => Value::Number(i.into()),
        Bson::Int64(i) => Value::Number(i.into()),
        Bson::Double(f) => serde_json::Number::from_f64(f)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        Bson::String(s) => Value::String(s),
        Bson::Array(arr) => {
            let mut json_arr = Vec::new();
            for item in arr {
                json_arr.push(bson_value_to_json(item)?);
            }
            Value::Array(json_arr)
        }
        Bson::Document(doc) => bson_to_json(doc)?,
        Bson::ObjectId(oid) => Value::String(oid.to_hex()),
        Bson::DateTime(dt) => Value::String(dt.to_string()),
        Bson::Binary(bin) => Value::Array(bin.bytes.into_iter().map(Value::from).collect()),
        _ => Value::Null, // 其他 BSON 类型先降级为 null
    })
}


