from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette import status

from src.api.middlewares.request_id import RequestIdMiddleware
from src.api.routes.auth import router as auth_router
from src.api.routes.health import router as health_router
from src.api.routes.practice_sessions import router as practice_sessions_router
from src.api.routes.practice_turns import router as practice_turns_router
from src.api.routes.reports import router as reports_router
from src.api.routes.scenarios import router as scenarios_router
from src.config import get_settings
from src.schemas.errors import ApiError, error_payload


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "req_unknown")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name)
    app.add_middleware(RequestIdMiddleware)

    @app.exception_handler(ApiError)
    async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.http_status,
            content=error_payload(exc.code, exc.message, _request_id(request)),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_payload("VALIDATION_ERROR", "请求参数不合法。", _request_id(request)),
        )

    @app.exception_handler(Exception)
    async def internal_error_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_payload("INTERNAL_ERROR", "服务内部错误。", _request_id(request)),
        )

    app.include_router(health_router)
    app.include_router(auth_router, prefix=settings.api_v1_prefix)
    app.include_router(scenarios_router, prefix=settings.api_v1_prefix)
    app.include_router(practice_sessions_router, prefix=settings.api_v1_prefix)
    app.include_router(practice_turns_router, prefix=settings.api_v1_prefix)
    app.include_router(reports_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
