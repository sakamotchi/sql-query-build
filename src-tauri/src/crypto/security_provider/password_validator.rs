use serde::{Deserialize, Serialize};

/// パスワード要件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordRequirements {
    /// 最小文字数
    pub min_length: usize,
    /// 最大文字数
    pub max_length: usize,
    /// 大文字を含む必要があるか
    pub require_uppercase: bool,
    /// 小文字を含む必要があるか
    pub require_lowercase: bool,
    /// 数字を含む必要があるか
    pub require_digit: bool,
    /// 記号を含む必要があるか
    pub require_special: bool,
}

impl Default for PasswordRequirements {
    fn default() -> Self {
        Self {
            min_length: 8,
            max_length: 128,
            require_uppercase: false,
            require_lowercase: false,
            require_digit: false,
            require_special: false,
        }
    }
}

/// パスワード検証結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordValidationResult {
    pub is_valid: bool,
    pub strength: PasswordStrength,
    pub errors: Vec<String>,
    pub suggestions: Vec<String>,
}

/// パスワード強度
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PasswordStrength {
    VeryWeak,
    Weak,
    Fair,
    Strong,
    VeryStrong,
}

/// パスワードバリデーター
pub struct PasswordValidator {
    requirements: PasswordRequirements,
}

impl PasswordValidator {
    pub fn new(requirements: PasswordRequirements) -> Self {
        Self { requirements }
    }

    pub fn validate(&self, password: &str) -> PasswordValidationResult {
        let mut errors = Vec::new();
        let mut suggestions = Vec::new();

        // 長さチェック
        if password.len() < self.requirements.min_length {
            errors.push(format!(
                "パスワードは{}文字以上必要です",
                self.requirements.min_length
            ));
        }

        if password.len() > self.requirements.max_length {
            errors.push(format!(
                "パスワードは{}文字以下にしてください",
                self.requirements.max_length
            ));
        }

        // 文字種チェック
        let has_uppercase = password.chars().any(|c| c.is_uppercase());
        let has_lowercase = password.chars().any(|c| c.is_lowercase());
        let has_digit = password.chars().any(|c| c.is_numeric());
        let has_special = password.chars().any(|c| !c.is_alphanumeric());

        if self.requirements.require_uppercase && !has_uppercase {
            errors.push("大文字を含めてください".to_string());
        }
        if self.requirements.require_lowercase && !has_lowercase {
            errors.push("小文字を含めてください".to_string());
        }
        if self.requirements.require_digit && !has_digit {
            errors.push("数字を含めてください".to_string());
        }
        if self.requirements.require_special && !has_special {
            errors.push("記号を含めてください".to_string());
        }

        // 強度計算
        let strength = self.calculate_strength(password);

        // 提案
        if strength == PasswordStrength::VeryWeak || strength == PasswordStrength::Weak {
            if !has_uppercase {
                suggestions.push("大文字を追加するとより安全です".to_string());
            }
            if !has_digit {
                suggestions.push("数字を追加するとより安全です".to_string());
            }
            if !has_special {
                suggestions.push("記号を追加するとより安全です".to_string());
            }
            if password.len() < 12 {
                suggestions.push("12文字以上にするとより安全です".to_string());
            }
        }

        PasswordValidationResult {
            is_valid: errors.is_empty(),
            strength,
            errors,
            suggestions,
        }
    }

    fn calculate_strength(&self, password: &str) -> PasswordStrength {
        let mut score = 0;

        // 長さによるスコア
        score += match password.len() {
            0..=7 => 0,
            8..=11 => 1,
            12..=15 => 2,
            16..=19 => 3,
            _ => 4,
        };

        // 文字種によるスコア
        if password.chars().any(|c| c.is_uppercase()) {
            score += 1;
        }
        if password.chars().any(|c| c.is_lowercase()) {
            score += 1;
        }
        if password.chars().any(|c| c.is_numeric()) {
            score += 1;
        }
        if password.chars().any(|c| !c.is_alphanumeric()) {
            score += 2;
        }

        match score {
            0..=2 => PasswordStrength::VeryWeak,
            3..=4 => PasswordStrength::Weak,
            5..=6 => PasswordStrength::Fair,
            7..=8 => PasswordStrength::Strong,
            _ => PasswordStrength::VeryStrong,
        }
    }
}
