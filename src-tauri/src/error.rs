use thiserror::Error;

#[derive(Debug, Error)]
pub enum QueryBuilderError {
    #[error("Expression tree is too deep: {0} levels (max 10)")]
    ExpressionTooDeep(usize),

    #[error("Too many function arguments: {0} (max 10)")]
    TooManyArguments(usize),

    #[error("Invalid literal value")]
    InvalidLiteral,

    #[error("Unsupported function for database: {0}")]
    UnsupportedFunction(String),

    #[error("Subquery must return a scalar value")]
    SubqueryNotScalar,
}
