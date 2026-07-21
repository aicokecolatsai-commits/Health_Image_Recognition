from sqlalchemy import String, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class FrameKeypoint2D(Base, TimestampMixin):
    __tablename__ = "frame_keypoints_2d"

    analysis_id: Mapped[str] = mapped_column(String(36), ForeignKey("analysis_results.id"), primary_key=True)
    frame_idx: Mapped[int] = mapped_column(Integer, primary_key=True)
    keypoint_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    x: Mapped[float] = mapped_column(Float)
    y: Mapped[float] = mapped_column(Float)
    visibility: Mapped[float | None] = mapped_column(Float, default=None)
