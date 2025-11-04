use axum::{
    body::Body,
    extract::{FromRequestParts, Request},
    middleware::{Next, from_fn},
    response::Response,
};

use crate::{errors::ApiError, handlers::AuthenticatedUser, models::UserRole};

pub async fn require_admin_middleware(req: Request, next: Next) -> Result<Response, ApiError> {
    let (mut parts, body) = req.into_parts();

    let user = AuthenticatedUser::from_request_parts(&mut parts, &()).await?;

    if user.role != UserRole::ADMIN {
        return Err(ApiError::Unauthorized("Not Admin, sorry.".to_string()));
    }

    let req = Request::from_parts(parts, body);
    Ok(next.run(req).await)
}
