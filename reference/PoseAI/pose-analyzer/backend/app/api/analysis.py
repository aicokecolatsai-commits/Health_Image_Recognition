import logging
import threading
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.analysis import AnalysisResult
from app.models.frame_keypoint_2d import FrameKeypoint2D
from app.models.video import Video
from app.core.pose_2d import PoseDetector2D

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

_analysis_lock = threading.Lock()
_running_analyses: dict[str, threading.Thread] = {}


class AnalysisStatusResponse(BaseModel):
    id: str
    session_id: str
    method: str
    status: str
    progress: float
    frame_count: int | None = None

    model_config = {"from_attributes": True}


class KeypointQueryParams(BaseModel):
    frame_start: int = 0
    frame_end: int | None = None
    keypoint_ids: list[int] | None = None


class KeypointResponse(BaseModel):
    analysis_id: str
    frame_idx: int
    data: list[dict]  # [{keypoint_id, x, y, visibility}]

    model_config = {"from_attributes": True}


@router.post("/run-2d/{video_id}", response_model=AnalysisStatusResponse, status_code=201)
def run_2d_analysis(video_id: str, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")

    existing = db.query(AnalysisResult).filter(
        AnalysisResult.video_id == video_id,
        AnalysisResult.method == "2d",
        AnalysisResult.status.in_(["pending", "running"]),
    ).first()
    if existing:
        raise HTTPException(409, f"Analysis already running: {existing.id}")

    import uuid
    analysis = AnalysisResult(
        id=str(uuid.uuid4()),
        session_id=video.session_id,
        video_id=video_id,
        method="2d",
        status="pending",
        progress=0.0,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    def _run():
        try:
            with _analysis_lock:
                with next(get_db()) as session:
                    _process_2d(session, analysis.id, video.file_path)
        except Exception as e:
            logger.exception("Analysis %s failed: %s", analysis.id, e)
            with next(get_db()) as session:
                a = session.query(AnalysisResult).filter(AnalysisResult.id == analysis.id).first()
                if a:
                    a.status = "failed"
                    a.progress = -1
                    session.commit()
        finally:
            _running_analyses.pop(analysis.id, None)

    thread = threading.Thread(target=_run, daemon=True)
    _running_analyses[analysis.id] = thread
    thread.start()

    return AnalysisStatusResponse(
        id=analysis.id,
        session_id=analysis.session_id,
        method=analysis.method,
        status=analysis.status,
        progress=analysis.progress,
        frame_count=analysis.frame_count,
    )


def _process_2d(db: Session, analysis_id: str, video_path: str):
    a = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
    a.status = "running"
    db.commit()

    detector = PoseDetector2D()
    detector.load_model()

    total_frames = 0

    def on_progress(frame_idx, total):
        nonlocal total_frames
        total_frames = total
        pct = round((frame_idx / max(total, 1)) * 100, 1)
        a = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
        if a:
            a.progress = pct
            db.commit()

    frames = detector.process_video(video_path, progress_callback=on_progress)

    keypoint_rows = []
    for f in frames:
        for kp in f["keypoints"]:
            keypoint_rows.append({
                "analysis_id": analysis_id,
                "frame_idx": f["frame_idx"],
                "keypoint_id": kp["id"],
                "x": kp["x"],
                "y": kp["y"],
                "visibility": kp["visibility"],
            })

    if keypoint_rows:
        from sqlalchemy import insert
        db.execute(insert(FrameKeypoint2D), keypoint_rows)
        db.commit()

    a = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
    a.status = "completed"
    a.progress = 100.0
    a.frame_count = len(frames)
    db.commit()

    detector.unload()
    logger.info("Analysis %s completed: %d frames, %d keypoints",
                analysis_id, len(frames), len(keypoint_rows))


@router.get("/{analysis_id}/status", response_model=AnalysisStatusResponse)
def get_analysis_status(analysis_id: str, db: Session = Depends(get_db)):
    a = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
    if not a:
        raise HTTPException(404, "Analysis not found")
    return a


@router.get("/{analysis_id}/keypoints")
def get_keypoints(
    analysis_id: str,
    frame_start: int = Query(0, ge=0),
    frame_end: int | None = Query(None, ge=0),
    keypoint_ids: str | None = Query(None, description="Comma-separated keypoint IDs"),
    db: Session = Depends(get_db),
):
    a = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
    if not a:
        raise HTTPException(404, "Analysis not found")

    q = db.query(FrameKeypoint2D).filter(FrameKeypoint2D.analysis_id == analysis_id)
    q = q.filter(FrameKeypoint2D.frame_idx >= frame_start)
    if frame_end is not None:
        q = q.filter(FrameKeypoint2D.frame_idx <= frame_end)
    if keypoint_ids:
        ids = [int(x.strip()) for x in keypoint_ids.split(",") if x.strip()]
        if ids:
            q = q.filter(FrameKeypoint2D.keypoint_id.in_(ids))
    q = q.order_by(FrameKeypoint2D.frame_idx, FrameKeypoint2D.keypoint_id)

    rows = q.all()
    grouped: dict[int, list] = {}
    for r in rows:
        grouped.setdefault(r.frame_idx, []).append({
            "keypoint_id": r.keypoint_id,
            "x": r.x,
            "y": r.y,
            "visibility": r.visibility,
        })

    return {
        "analysis_id": analysis_id,
        "total_frames": a.frame_count,
        "frame_count": len(grouped),
        "frames": [
            {"frame_idx": k, "keypoints": v}
            for k, v in sorted(grouped.items())
        ],
    }
