use serde::{Deserialize, Serialize};

use super::error::ConnectionError;
use super::types::{ConnectionInfo, EnvironmentType};

/// 接続情報のコレクション
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionCollection {
    /// バージョン（将来のマイグレーション用）
    pub version: u32,

    /// 接続情報のリスト
    pub connections: Vec<ConnectionInfo>,
}

impl ConnectionCollection {
    /// 新しいコレクションを作成
    pub fn new() -> Self {
        Self {
            version: 1,
            connections: Vec::new(),
        }
    }

    /// 接続情報を追加
    pub fn add(&mut self, connection: ConnectionInfo) -> Result<(), ConnectionError> {
        // 同じ名前の接続が既に存在しないかチェック
        if self.connections.iter().any(|c| c.name == connection.name) {
            return Err(ConnectionError::DuplicateName);
        }

        connection.validate()?;
        self.connections.push(connection);
        Ok(())
    }

    /// IDで接続情報を取得
    pub fn get(&self, id: &str) -> Option<&ConnectionInfo> {
        self.connections.iter().find(|c| c.id == id)
    }

    /// IDで接続情報を取得（可変参照）
    pub fn get_mut(&mut self, id: &str) -> Option<&mut ConnectionInfo> {
        self.connections.iter_mut().find(|c| c.id == id)
    }

    /// 接続情報を更新
    pub fn update(&mut self, id: &str, connection: ConnectionInfo) -> Result<(), ConnectionError> {
        connection.validate()?;

        let index = self
            .connections
            .iter()
            .position(|c| c.id == id)
            .ok_or(ConnectionError::NotFound)?;

        self.connections[index] = connection;
        self.connections[index].metadata.touch();

        Ok(())
    }

    /// 接続情報を削除
    pub fn remove(&mut self, id: &str) -> Result<ConnectionInfo, ConnectionError> {
        let index = self
            .connections
            .iter()
            .position(|c| c.id == id)
            .ok_or(ConnectionError::NotFound)?;

        Ok(self.connections.remove(index))
    }

    /// タグで検索
    pub fn find_by_tag(&self, tag: &str) -> Vec<&ConnectionInfo> {
        self.connections
            .iter()
            .filter(|c| c.metadata.tags.contains(&tag.to_string()))
            .collect()
    }

    /// 環境種別で検索
    pub fn find_by_environment(&self, env_type: EnvironmentType) -> Vec<&ConnectionInfo> {
        self.connections
            .iter()
            .filter(|c| c.environment.environment_type == env_type)
            .collect()
    }

    /// お気に入りのみ取得
    pub fn favorites(&self) -> Vec<&ConnectionInfo> {
        self.connections
            .iter()
            .filter(|c| c.metadata.is_favorite)
            .collect()
    }

    /// 最近使用した順にソート
    pub fn sorted_by_recent(&self) -> Vec<&ConnectionInfo> {
        let mut sorted = self.connections.iter().collect::<Vec<_>>();
        sorted.sort_by(|a, b| {
            b.metadata
                .last_connected_at
                .cmp(&a.metadata.last_connected_at)
        });
        sorted
    }
}

impl Default for ConnectionCollection {
    fn default() -> Self {
        Self::new()
    }
}
