from pathlib import Path

import cv2
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.video import Video

router = APIRouter(prefix="/api/videos", tags=["videos"])


class VideoRegisterRequest(BaseModel):
    file_path: str = Field(..., description="Absolute path to the video file on local disk")
    session_id: str
    camera_view: str = Field("unknown", pattern=r"^(front|side_left|side_right|back|unknown)$")
    camera_index: int = 0


class VideoResponse(BaseModel):
    id: str
    session_id: str
    camera_view: str
    camera_index: int
    file_path: str
    original_filename: str
    duration_sec: float | None = None
    fps: float | None = None
    width: int | None = None
    height: int | None = None
    file_size_bytes: int | None = None

    model_config = {"from_attributes": True}


@router.post("/register", response_model=VideoResponse, status_code=201)
def register_video(body: VideoRegisterRequest, db: Session = Depends(get_db)):
    path = Path(body.file_path)
    if not path.exists():
        raise HTTPException(400, f"File not found: {body.file_path}")

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise HTTPException(400, f"Cannot open video file: {body.file_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps if fps > 0 else 0
    cap.release()

    video = Video(
        session_id=body.session_id,
        camera_view=body.camera_view,
        camera_index=body.camera_index,
        file_path=str(path.resolve()),
        original_filename=path.name,
        duration_sec=round(duration, 2),
        fps=round(fps, 2) if fps > 0 else None,
        width=width if width > 0 else None,
        height=height if height > 0 else None,
        file_size_bytes=path.stat().st_size,
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


@router.get("", response_model=list[VideoResponse])
def list_videos(
    session_id: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Video)
    if session_id:
        q = q.filter(Video.session_id == session_id)
    return q.order_by(Video.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{video_id}", response_model=VideoResponse)
def get_video(video_id: str, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    return video
