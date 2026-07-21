from sqlalchemy import String, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import gen_uuid, TimestampMixin


class AnalysisResult(Base, TimestampMixin):
    __tablename__ = "analysis_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id"), index=True)
    video_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("videos.id"), default=None)
    method: Mapped[str] = mapped_column(String(30), default="stereo")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    frame_count: Mapped[int | None] = mapped_column(Integer, default=None)
    summary: Mapped[dict | None] = mapped_column(JSON, default=None)


class FrameJointAngle(Base):
    __tablename__ = "frame_joint_angles"

    analysis_id: Mapped[str] = mapped_column(String(36), ForeignKey("analysis_results.id"), primary_key=True)
    frame_idx: Mapped[int] = mapped_column(Integer, primary_key=True)
    timestamp_sec: Mapped[float] = mapped_column(Float)
    joint_name: Mapped[str] = mapped_column(String(50), primary_key=True)
    value_deg: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float | None] = mapped_column(Float, default=None)


class FrameKeypoint3D(Base):
    __tablename__ = "frame_keypoints_3d"

    analysis_id: Mapped[str] = mapped_column(String(36), ForeignKey("analysis_results.id"), primary_key=True)
    frame_idx: Mapped[int] = mapped_column(Integer, primary_key=True)
    keypoint_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    x: Mapped[float] = mapped_column(Float)
    y: Mapped[float] = mapped_column(Float)
    z: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float | None] = mapped_column(Float, default=None)
