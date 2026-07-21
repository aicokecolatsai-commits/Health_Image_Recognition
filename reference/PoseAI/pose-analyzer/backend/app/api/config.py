from fastapi import APIRouter

from app.config import settings
from app.schemas.config import ConfigResponse

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("", response_model=ConfigResponse)
def get_config():
    return ConfigResponse(
        app_name=settings.app_name,
        app_version=settings.app_version,
        compute_mode=settings.compute_mode,
        gpu_device=settings.gpu_device,
        fallback_to_cpu=settings.fallback_to_cpu,
        database_url=settings.database_url.replace("sqlite:///", "sqlite:///..."),
    )
