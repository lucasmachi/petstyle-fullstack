from typing import Literal
from uuid import UUID
from datetime import date
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Login(Input):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class Register(Login):
    name: str = Field(min_length=2, max_length=80)


class PetInput(Input):
    name: str = Field(min_length=1, max_length=60)
    species: Literal["dog", "cat"]
    size: Literal["small", "medium", "large"]
    notes: str = Field(default="", max_length=500)


class BookingInput(Input):
    pet_id: int = Field(gt=0)
    service_id: int = Field(gt=0)
    slot_id: int = Field(gt=0)
    request_id: UUID


class ServiceInput(Input):
    name: str = Field(min_length=3, max_length=80)
    description: str = Field(min_length=10, max_length=500)
    price_cents: int = Field(gt=0, le=100000)
    active: bool = True


class GenerateSlots(Input):
    start_date: date
    days: int = Field(default=7, ge=1, le=31)


class ActiveInput(Input):
    active: bool


class BookingStatus(Input):
    status: Literal["cancelled", "completed"]
