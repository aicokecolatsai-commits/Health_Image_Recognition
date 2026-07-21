from datetime import date, datetime
from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    patient_id: str
    session_date: date
    session_type: str = Field("initial", pattern=r"^(initial|followup|discharge)$")
    assessor: str | None = Field(None, max_length=100)
    notes: str | None = None


class SessionUpdate(BaseModel):
    session_date: date | None = None
    session_type: str | None = Field(None, pattern=r"^(initial|followup|discharge)$")
    assessor: str | None = Field(None, max_length=100)
    notes: str | None = None


class SessionResponse(BaseModel):
    id: str
    patient_id: str
    session_date: date
    session_type: str
    assessor: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
