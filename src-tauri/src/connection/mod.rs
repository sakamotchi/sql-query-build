mod error;
mod types;
mod collection;
mod builder;
mod frontend_types;
pub mod storage;
pub mod service;
pub mod commands;

pub use error::ConnectionError;
pub use types::{
    ConnectionInfo,
    DatabaseType,
    ConnectionConfig,
    NetworkConfig,
    SslConfig,
    FileConfig,
    EnvironmentConfig,
    EnvironmentType,
    ThemeVariant,
    ConnectionMetadata,
};
pub use frontend_types::FrontendConnection;
pub use collection::ConnectionCollection;
pub use builder::ConnectionInfoBuilder;
pub use storage::ConnectionStorage;
pub use service::ConnectionService;

#[cfg(test)]
mod tests;
