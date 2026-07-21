from sqlalchemy import String, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import gen_uuid, TimestampMixin


class Calibration(Base, TimestampMixin):
    __tablename__ = "calibrations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id"), index=True)
    pattern_type: Mapped[str] = mapped_column(String(20), default="charuco")
    pattern_size: Mapped[str] = mapped_column(String(20), default="9x6")
    square_mm: Mapped[float] = mapped_column(Float, default=42.0)
    camera_params: Mapped[dict | None] = mapped_column(JSON, default=None)
    stereo_params: Mapped[dict | None] = mapped_column(JSON, default=None)
    reproj_error: Mapped[float | None] = mapped_column(Float, default=None)
