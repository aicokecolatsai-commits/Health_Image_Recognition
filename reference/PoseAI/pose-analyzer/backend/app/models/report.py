from sqlalchemy import String, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import gen_uuid, TimestampMixin


class Report(Base, TimestampMixin):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id"), index=True)
    analysis_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("analysis_results.id"), default=None)
    report_type: Mapped[str] = mapped_column(String(30), default="summary")
    pdf_path: Mapped[str | None] = mapped_column(String(500), default=None)
    summary_json: Mapped[dict | None] = mapped_column(JSON, default=None)
