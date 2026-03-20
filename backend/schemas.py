from __future__ import annotations

from datetime import datetime, date
from typing import Optional, Dict, Any, List

from pydantic import BaseModel, Field


class UserRead(BaseModel):
    id: int
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class ClientBase(BaseModel):
    name: str
    socials: Optional[Dict[str, Any]] = None
    price_short: float
    price_thumbnail: float
    price_video: float
    notes: Optional[str] = None
    archived: bool = False


class ClientCreate(ClientBase):
    pass


class ClientRead(ClientBase):
    id: int

    class Config:
        from_attributes = True


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    socials: Optional[Dict[str, Any]] = None
    price_short: Optional[float] = None
    price_thumbnail: Optional[float] = None
    price_video: Optional[float] = None
    notes: Optional[str] = None
    archived: Optional[bool] = None


class SourceBase(BaseModel):
    client_id: int
    platform: str = Field(description="twitch | youtube | external | manual | other")
    title: str
    url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    external_id: Optional[str] = None
    duration_sec: Optional[int] = None


class SourceCreate(SourceBase):
    pass


class SourceRead(SourceBase):
    id: int
    created_at: datetime
    fetched_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DeliverableBase(BaseModel):
    client_id: int
    source_id: Optional[int] = None
    type: str = Field(description="short | thumbnail | video")
    title: str
    description: Optional[str] = None
    status: str = "incomplete"
    performance: Optional[Dict[str, Any]] = None
    price_mode: str = "auto"
    price_value: Optional[float] = None
    payment_status: str = "unpaid"
    source_title: Optional[str] = None
    source_url: Optional[str] = None
    duration_sec: Optional[int] = None
    notes: Optional[str] = None
    archived: bool = False


class DeliverableCreate(DeliverableBase):
    pass


class DeliverableRead(DeliverableBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeliverableUpdate(BaseModel):
    client_id: Optional[int] = None
    source_id: Optional[int] = None
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    performance: Optional[Dict[str, Any]] = None
    price_mode: Optional[str] = None
    price_value: Optional[float] = None
    payment_status: Optional[str] = None
    source_title: Optional[str] = None
    source_url: Optional[str] = None
    duration_sec: Optional[int] = None
    notes: Optional[str] = None
    archived: Optional[bool] = None


class InvoiceItemRead(BaseModel):
    id: int
    deliverable_id: int
    amount: float

    class Config:
        from_attributes = True


class InvoiceRead(BaseModel):
    id: int
    client_id: int
    period_start: date
    period_end: date
    label: str
    total_amount: float
    status: str
    created_at: datetime
    items: List[InvoiceItemRead] = []

    class Config:
        from_attributes = True


class InvoiceCreate(BaseModel):
    client_id: int
    period_start: date
    period_end: date
    label: Optional[str] = None

