from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Pose Analyzer"
    app_version: str = "1.0.0"

    database_url: str = "sqlite:///./data/pose_analyzer.db"

    data_dir: str = str(Path(__file__).resolve().parent.parent / "data")

    compute_mode: str = "auto"
    gpu_device: int = 0
    fallback_to_cpu: bool = True

    max_upload_size_mb: int = 1024
    allowed_video_extensions: list[str] = [".mp4", ".mov", ".avi"]

    model_config = {"env_prefix": "PA_", "env_file": ".env"}


settings = Settings()
