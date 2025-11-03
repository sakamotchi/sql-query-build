mod error;
mod types;
mod collection;
mod builder;

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
pub use collection::ConnectionCollection;
pub use builder::ConnectionInfoBuilder;

#[cfg(test)]
mod tests;
