use crate::models::export::{ExportFormat, ExportOptions, ExportResult};
use crate::models::query_result::{QueryResult, QueryValue};
use std::path::Path;

pub fn export_data(data: &QueryResult, options: &ExportOptions) -> Result<ExportResult, String> {
    match options.format {
        ExportFormat::Csv => export_to_csv(data, &options.path),
        ExportFormat::Excel => export_to_excel(data, &options.path),
        ExportFormat::Json => export_to_json(data, &options.path),
    }
}

fn export_to_csv(data: &QueryResult, path: &Path) -> Result<ExportResult, String> {
    use std::fs::File;
    use std::io::Write;

    // Create file and write UTF-8 BOM for Excel compatibility
    let mut file = File::create(path).map_err(|e| e.to_string())?;
    file.write_all(&[0xEF, 0xBB, 0xBF])
        .map_err(|e| e.to_string())?;

    let mut wtr = csv::WriterBuilder::new()
        .quote_style(csv::QuoteStyle::Necessary)
        .from_writer(file);

    // Write headers
    let headers: Vec<&str> = data.columns.iter().map(|c| c.name.as_str()).collect();
    wtr.write_record(&headers).map_err(|e| e.to_string())?;

    // Write rows
    for row in &data.rows {
        let record: Vec<String> = row.values.iter().map(|v| value_to_string(v)).collect();
        wtr.write_record(&record).map_err(|e| e.to_string())?;
    }

    wtr.flush().map_err(|e| e.to_string())?;

    Ok(ExportResult {
        success: true,
        message: None,
        rows_affected: data.rows.len(),
    })
}

fn export_to_excel(data: &QueryResult, path: &Path) -> Result<ExportResult, String> {
    let mut workbook = rust_xlsxwriter::Workbook::new();
    let worksheet = workbook.add_worksheet();

    // Write headers
    let header_format = rust_xlsxwriter::Format::new().set_bold();
    for (i, col) in data.columns.iter().enumerate() {
        worksheet
            .write_string_with_format(0, i as u16, &col.name, &header_format)
            .map_err(|e| e.to_string())?;
    }

    // Write rows
    for (row_idx, row) in data.rows.iter().enumerate() {
        let row_num = (row_idx + 1) as u32;
        for (col_idx, value) in row.values.iter().enumerate() {
            let col_num = col_idx as u16;
            match value {
                QueryValue::Null => {
                    // Empty cell
                }
                QueryValue::Bool(b) => {
                    worksheet
                        .write_boolean(row_num, col_num, *b)
                        .map_err(|e| e.to_string())?;
                }
                QueryValue::Int(i) => {
                    worksheet
                        .write_number(row_num, col_num, *i as f64)
                        .map_err(|e| e.to_string())?;
                }
                QueryValue::Float(f) => {
                    worksheet
                        .write_number(row_num, col_num, *f)
                        .map_err(|e| e.to_string())?;
                }
                QueryValue::String(s) => {
                    worksheet
                        .write_string(row_num, col_num, s)
                        .map_err(|e| e.to_string())?;
                }
                QueryValue::Bytes(b) => {
                    // Convert bytes to hex string for better readability
                    let hex_string = b
                        .iter()
                        .map(|byte| format!("{:02x}", byte))
                        .collect::<Vec<_>>()
                        .join("");
                    let s = format!("0x{}", hex_string);
                    worksheet
                        .write_string(row_num, col_num, &s)
                        .map_err(|e| e.to_string())?;
                }
            }
        }
    }

    // Auto-fit columns
    worksheet.autofit();

    workbook.save(path).map_err(|e| e.to_string())?;

    Ok(ExportResult {
        success: true,
        message: None,
        rows_affected: data.rows.len(),
    })
}

fn export_to_json(data: &QueryResult, path: &Path) -> Result<ExportResult, String> {
    let file = std::fs::File::create(path).map_err(|e| e.to_string())?;
    let writer = std::io::BufWriter::new(file);

    // Create a simplified structure for JSON export: list of objects with column names as keys
    // OR just export the QueryResult as is.
    // Usually, users expect [{"col1": val1}, {"col1": val2}].
    // Let's transform valid QueryResult to that format if possible, OR just serialization of values.

    // For simplicity and typed consistency, let's export the rows as array of arrays or array of objects.
    // Array of objects is more standard for JSON export.

    let mut json_rows = Vec::with_capacity(data.rows.len());
    for row in &data.rows {
        let mut map = serde_json::Map::new();
        for (i, val) in row.values.iter().enumerate() {
            if let Some(col) = data.columns.get(i) {
                // Convert QueryValue to serde_json::Value
                let json_val = match val {
                    QueryValue::Null => serde_json::Value::Null,
                    QueryValue::Bool(b) => serde_json::Value::Bool(*b),
                    QueryValue::Int(i) => serde_json::Value::Number(serde_json::Number::from(*i)),
                    QueryValue::Float(f) => {
                        // Handle conversion to Number (f64 usually needs check for infinity/NaN)
                        if let Some(n) = serde_json::Number::from_f64(*f) {
                            serde_json::Value::Number(n)
                        } else {
                            serde_json::Value::Null // or string representation?
                        }
                    }
                    QueryValue::String(s) => serde_json::Value::String(s.clone()),
                    QueryValue::Bytes(b) => {
                        // Convert bytes to hex string
                        let hex_string = b
                            .iter()
                            .map(|byte| format!("{:02x}", byte))
                            .collect::<Vec<_>>()
                            .join("");
                        serde_json::Value::String(format!("0x{}", hex_string))
                    }
                };
                map.insert(col.name.clone(), json_val);
            }
        }
        json_rows.push(serde_json::Value::Object(map));
    }

    serde_json::to_writer_pretty(writer, &json_rows).map_err(|e| e.to_string())?;

    Ok(ExportResult {
        success: true,
        message: None,
        rows_affected: data.rows.len(),
    })
}

fn value_to_string(value: &QueryValue) -> String {
    match value {
        QueryValue::Null => "".to_string(),
        QueryValue::Bool(b) => b.to_string(),
        QueryValue::Int(i) => i.to_string(),
        QueryValue::Float(f) => f.to_string(),
        QueryValue::String(s) => s.clone(),
        QueryValue::Bytes(b) => {
            // Convert bytes to hex string
            let hex_string = b
                .iter()
                .map(|byte| format!("{:02x}", byte))
                .collect::<Vec<_>>()
                .join("");
            format!("0x{}", hex_string)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::query_result::{QueryResult, QueryResultColumn, QueryResultRow};

    fn create_test_result() -> QueryResult {
        QueryResult {
            columns: vec![
                QueryResultColumn {
                    name: "id".to_string(),
                    data_type: "integer".to_string(),
                    nullable: false,
                },
                QueryResultColumn {
                    name: "name".to_string(),
                    data_type: "text".to_string(),
                    nullable: true,
                },
                QueryResultColumn {
                    name: "active".to_string(),
                    data_type: "boolean".to_string(),
                    nullable: false,
                },
            ],
            rows: vec![
                QueryResultRow {
                    values: vec![
                        QueryValue::Int(1),
                        QueryValue::String("Alice".to_string()),
                        QueryValue::Bool(true),
                    ],
                },
                QueryResultRow {
                    values: vec![
                        QueryValue::Int(2),
                        QueryValue::String("Bob".to_string()),
                        QueryValue::Bool(false),
                    ],
                },
                QueryResultRow {
                    values: vec![QueryValue::Int(3), QueryValue::Null, QueryValue::Bool(true)],
                },
            ],
            row_count: 3,
            execution_time_ms: 10,
            warnings: vec![],
        }
    }

    #[test]
    fn test_csv_export() {
        let result = create_test_result();
        let temp_dir = std::env::temp_dir();
        let path = temp_dir.join("test_export.csv");

        let export_result = export_to_csv(&result, &path);
        assert!(export_result.is_ok());

        // Verify file exists
        assert!(path.exists());

        // Verify content
        let content = std::fs::read_to_string(&path).unwrap();

        // Check for UTF-8 BOM
        assert!(
            content.starts_with('\u{FEFF}'),
            "CSV should start with UTF-8 BOM"
        );

        // Check headers
        assert!(content.contains("id,name,active"));

        // Check data rows
        assert!(content.contains("1,Alice,true"));
        assert!(content.contains("2,Bob,false"));
        assert!(content.contains("3,,true")); // NULL as empty string

        // Cleanup
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn test_json_export() {
        let result = create_test_result();
        let temp_dir = std::env::temp_dir();
        let path = temp_dir.join("test_export.json");

        let export_result = export_to_json(&result, &path);
        assert!(export_result.is_ok());

        // Verify file exists
        assert!(path.exists());

        // Verify content
        let content = std::fs::read_to_string(&path).unwrap();
        let json: serde_json::Value = serde_json::from_str(&content).unwrap();

        // Should be an array
        assert!(json.is_array());
        let arr = json.as_array().unwrap();
        assert_eq!(arr.len(), 3);

        // Check first row
        assert_eq!(arr[0]["id"], 1);
        assert_eq!(arr[0]["name"], "Alice");
        assert_eq!(arr[0]["active"], true);

        // Check NULL handling
        assert_eq!(arr[2]["name"], serde_json::Value::Null);

        // Cleanup
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn test_excel_export() {
        let result = create_test_result();
        let temp_dir = std::env::temp_dir();
        let path = temp_dir.join("test_export.xlsx");

        let export_result = export_to_excel(&result, &path);
        assert!(export_result.is_ok());

        // Verify file exists
        assert!(path.exists());

        // Verify it's a valid Excel file (basic check)
        let metadata = std::fs::metadata(&path).unwrap();
        assert!(metadata.len() > 0, "Excel file should not be empty");

        // Cleanup
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn test_value_to_string() {
        assert_eq!(value_to_string(&QueryValue::Null), "");
        assert_eq!(value_to_string(&QueryValue::Bool(true)), "true");
        assert_eq!(value_to_string(&QueryValue::Int(42)), "42");
        assert_eq!(value_to_string(&QueryValue::Float(3.14)), "3.14");
        assert_eq!(
            value_to_string(&QueryValue::String("test".to_string())),
            "test"
        );
        assert_eq!(
            value_to_string(&QueryValue::Bytes(vec![0x01, 0x02, 0x0A, 0xFF])),
            "0x01020aff"
        );
    }

    #[test]
    fn test_csv_special_characters() {
        let result = QueryResult {
            columns: vec![QueryResultColumn {
                name: "text".to_string(),
                data_type: "text".to_string(),
                nullable: true,
            }],
            rows: vec![
                QueryResultRow {
                    values: vec![QueryValue::String("Hello, World".to_string())],
                },
                QueryResultRow {
                    values: vec![QueryValue::String("Line1\nLine2".to_string())],
                },
                QueryResultRow {
                    values: vec![QueryValue::String("Quote\"Test".to_string())],
                },
            ],
            row_count: 3,
            execution_time_ms: 10,
            warnings: vec![],
        };

        let temp_dir = std::env::temp_dir();
        let path = temp_dir.join("test_special_chars.csv");

        let export_result = export_to_csv(&result, &path);
        assert!(export_result.is_ok());

        let content = std::fs::read_to_string(&path).unwrap();

        // Commas should be quoted
        assert!(content.contains("\"Hello, World\""));

        // Newlines should be quoted
        assert!(content.contains("\"Line1\nLine2\""));

        // Quotes should be escaped
        assert!(content.contains("\"Quote\"\"Test\""));

        std::fs::remove_file(path).ok();
    }
}
