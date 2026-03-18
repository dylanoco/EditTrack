from __future__ import annotations

from datetime import datetime, date
from typing import Optional, Dict, Any, List

from pydantic import BaseModel, Field


class ClientBase(BaseModel):
    name: str
    socials: Optional[Dict[str, Any]] = None
    price_short: float
    price_thumbnail: float
    price_video: float
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientRead(ClientBase):
    id: int

    class Config:
        from_attributes = True


class SourceBase(BaseModel):
    client_id: int
    platform: str = Field(description="twitch | youtube | external | manual | other")
    title: str
    url: Optional[str] = None
    external_id: Optional[str] = None
    duration_sec: Optional[int] = None


class SourceCreate(SourceBase):
    pass


class SourceRead(SourceBase):
    id: int
    created_at: datetime

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


class DeliverableCreate(DeliverableBase):
    pass


class DeliverableRead(DeliverableBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


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

