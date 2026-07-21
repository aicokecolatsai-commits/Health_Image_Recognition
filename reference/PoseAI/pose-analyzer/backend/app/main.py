import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.api import patients, sessions, videos, analysis, config as config_api

app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(sessions.router)
app.include_router(videos.router)
app.include_router(analysis.router)
app.include_router(config_api.router)


@app.on_event("startup")
def on_startup():
    os.makedirs(Path(settings.data_dir) / "videos", exist_ok=True)
    os.makedirs(Path(settings.data_dir) / "calibrations", exist_ok=True)
    os.makedirs(Path(settings.data_dir) / "reports", exist_ok=True)
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": settings.app_version}
