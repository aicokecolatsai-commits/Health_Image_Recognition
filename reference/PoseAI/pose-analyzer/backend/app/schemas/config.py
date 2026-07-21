from pydantic import BaseModel


class ConfigResponse(BaseModel):
    app_name: str
    app_version: str
    compute_mode: str
    gpu_device: int
    fallback_to_cpu: bool
    database_url: str
