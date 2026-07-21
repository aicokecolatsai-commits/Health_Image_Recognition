from datetime import date, datetime
from pydantic import BaseModel, Field


class PatientCreate(BaseModel):
    name: str = Field(..., max_length=100)
    gender: str | None = Field(None, max_length=10)
    birth_date: date | None = None
    height_cm: float | None = Field(None, ge=20, le=300)
    weight_kg: float | None = Field(None, ge=1, le=500)
    notes: str | None = None


class PatientUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    gender: str | None = Field(None, max_length=10)
    birth_date: date | None = None
    height_cm: float | None = Field(None, ge=20, le=300)
    weight_kg: float | None = Field(None, ge=1, le=500)
    notes: str | None = None


class PatientResponse(BaseModel):
    id: str
    name: str
    gender: str | None = None
    birth_date: date | None = None
    age: int | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
