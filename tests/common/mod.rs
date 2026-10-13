use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};

static COUNTER: AtomicU64 = AtomicU64::new(0);

/// 生成一个唯一的临时数据库名（不含扩展名）。
/// FunxDB::open 会在 ./database 下创建 {name}.db
pub fn unique_db_name(prefix: &str) -> String {
    let n = COUNTER.fetch_add(1, Ordering::SeqCst);
    let pid = std::process::id();
    format!("{}_{}_{}", prefix, pid, n)
}

/// 返回 ./database 目录的绝对路径（供清理使用）
pub fn database_dir() -> PathBuf {
    PathBuf::from("./database")
}

/// 删除某个测试库对应的文件（PoloDB 单文件模式）
pub fn cleanup_db(name: &str) {
    let path = database_dir().join(format!("{}.db", name));
    let _ = std::fs::remove_file(&path);
    // PoloDB 可能会生成 -wal / -shm 之类，一并清掉
    for suffix in ["-wal", "-shm", "-journal", ".lock"] {
        let p = database_dir().join(format!("{}.db{}", name, suffix));
        let _ = std::fs::remove_file(p);
    }
}
