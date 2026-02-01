/// フォルダパスのバリデーション
pub fn validate_folder_path(path: &Option<String>) -> Result<(), String> {
    if let Some(p) = path {
        if p.trim().is_empty() {
            return Err("フォルダパスは空文字列にできません".to_string());
        }

        if !p.starts_with('/') {
            return Err("フォルダパスは '/' で始まる必要があります".to_string());
        }

        if p.ends_with('/') {
            return Err("フォルダパスは '/' で終わることができません".to_string());
        }

        let parts: Vec<&str> = p.split('/').filter(|s| !s.is_empty()).collect();

        if parts.len() > 10 {
            return Err("フォルダの階層は10階層までです".to_string());
        }

        let invalid_chars = ['\\', ':', '*', '?', '"', '<', '>', '|'];

        for part in parts {
            if part.is_empty() {
                return Err("空のフォルダ名は使用できません".to_string());
            }

            if part.len() > 100 {
                return Err("フォルダ名は100文字以内にしてください".to_string());
            }

            if part.chars().any(|c| invalid_chars.contains(&c)) {
                return Err(
                    "フォルダ名に使用できない文字が含まれています: \\ : * ? \" < > |"
                        .to_string(),
                );
            }

            if part.contains("..") {
                return Err("フォルダ名に '..' は使用できません".to_string());
            }
        }
    }

    Ok(())
}

/// フォルダパスを分割してフォルダ名のベクタを取得
pub fn parse_folder_path(path: &Option<String>) -> Vec<String> {
    if let Some(p) = path {
        p.split('/')
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect()
    } else {
        Vec::new()
    }
}

/// フォルダ名のベクタからフォルダパスを構築
pub fn build_folder_path(folders: &[String]) -> Option<String> {
    if folders.is_empty() {
        None
    } else {
        Some(format!("/{}", folders.join("/")))
    }
}

/// フォルダ名のバリデーション（単一のフォルダ名のみ）
pub fn validate_folder_name(name: &str) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("フォルダ名は空文字列にできません".to_string());
    }

    if name.len() > 100 {
        return Err("フォルダ名は100文字以内にしてください".to_string());
    }

    let invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    if name.chars().any(|c| invalid_chars.contains(&c)) {
        return Err(
            "フォルダ名に使用できない文字が含まれています: / \\ : * ? \" < > |"
                .to_string(),
        );
    }

    if name.contains("..") {
        return Err("フォルダ名に '..' は使用できません".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_folder_path_valid() {
        assert!(validate_folder_path(&Some("/親/子/孫".to_string())).is_ok());
        assert!(validate_folder_path(&Some("/開発環境".to_string())).is_ok());
        assert!(validate_folder_path(&None).is_ok());
    }

    #[test]
    fn test_validate_folder_path_invalid() {
        assert!(validate_folder_path(&Some("".to_string())).is_err());
        assert!(validate_folder_path(&Some("親/子".to_string())).is_err());
        assert!(validate_folder_path(&Some("/親/子/".to_string())).is_err());
        assert!(validate_folder_path(&Some("/親:子".to_string())).is_err());
        assert!(validate_folder_path(&Some("/親/../子".to_string())).is_err());
    }

    #[test]
    fn test_parse_folder_path() {
        assert_eq!(
            parse_folder_path(&Some("/親/子/孫".to_string())),
            vec!["親", "子", "孫"]
        );
        assert_eq!(
            parse_folder_path(&Some("/開発環境".to_string())),
            vec!["開発環境"]
        );
        assert_eq!(parse_folder_path(&None), Vec::<String>::new());
    }

    #[test]
    fn test_build_folder_path() {
        assert_eq!(
            build_folder_path(&vec![
                "親".to_string(),
                "子".to_string(),
                "孫".to_string()
            ]),
            Some("/親/子/孫".to_string())
        );
        assert_eq!(
            build_folder_path(&vec!["開発環境".to_string()]),
            Some("/開発環境".to_string())
        );
        assert_eq!(build_folder_path(&vec![]), None);
    }

    #[test]
    fn test_validate_folder_name() {
        assert!(validate_folder_name("開発環境").is_ok());
        assert!(validate_folder_name("親").is_ok());
        assert!(validate_folder_name("").is_err());
        assert!(validate_folder_name("親/子").is_err());
        assert!(validate_folder_name("親:子").is_err());
        assert!(validate_folder_name("..").is_err());
    }
}
