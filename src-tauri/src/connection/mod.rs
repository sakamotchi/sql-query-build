mod builder;
mod collection;
pub mod commands;
pub mod connection_test_service;
mod error;
mod frontend_types;
pub mod service;
pub mod storage;
mod types;

pub use builder::ConnectionInfoBuilder;
pub use collection::ConnectionCollection;
pub use connection_test_service::{ConnectionTestService, ServerInfo, TestConnectionResult};
pub use error::ConnectionError;
pub use frontend_types::FrontendConnection;
pub use service::ConnectionService;
pub use storage::ConnectionStorage;
pub use types::{
    ConnectionConfig, ConnectionInfo, ConnectionMetadata, DatabaseType, EnvironmentConfig,
    EnvironmentType, FileConfig, NetworkConfig, SslConfig, ThemeVariant,
};

#[cfg(test)]
mod tests;
