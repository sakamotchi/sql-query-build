use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ExportFormat {
    Csv,
    Excel,
    Json,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExportOptions {
    pub path: PathBuf,
    pub format: ExportFormat,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub success: bool,
    pub message: Option<String>,
    pub rows_affected: usize,
}
