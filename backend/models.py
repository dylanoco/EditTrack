from __future__ import annotations

from datetime import datetime, date
from typing import Optional, Dict, Any, List

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    socials: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)
    price_short: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    price_thumbnail: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    price_video: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    deliverables: Mapped[List["Deliverable"]] = relationship(back_populates="client")
    sources: Mapped[List["Source"]] = relationship(back_populates="client")
    invoices: Mapped[List["Invoice"]] = relationship(back_populates="client")


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Generic, extensible source model
    platform: Mapped[str] = mapped_column(
        String,
        nullable=False,
        doc="twitch | youtube | external | manual (or other custom identifiers)",
    )
    external_id: Mapped[Optional[str]] = mapped_column(
        String,
        nullable=True,
        doc="Platform-specific ID (clip id / video id), if any.",
    )
    url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Canonical or user-provided URL, may be null for manual sources.",
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    duration_sec: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )
    fetched_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="When this source was last updated from an external fetch (e.g. Twitch).",
    )

    client: Mapped["Client"] = relationship(back_populates="sources")
    deliverables: Mapped[List["Deliverable"]] = relationship(back_populates="source")


class Deliverable(Base):
    __tablename__ = "deliverables"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("sources.id", ondelete="SET NULL"),
        nullable=True,
    )

    type: Mapped[str] = mapped_column(
        String,
        nullable=False,
        doc="short | thumbnail | video",
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)

    status: Mapped[str] = mapped_column(
        String,
        default="incomplete",
        nullable=False,
    )

    performance: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)

    price_mode: Mapped[str] = mapped_column(
        String,
        default="auto",
        nullable=False,
    )
    price_value: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))

    payment_status: Mapped[str] = mapped_column(
        String,
        default="unpaid",
        nullable=False,
    )

    source_title: Mapped[Optional[str]] = mapped_column(Text)
    source_url: Mapped[Optional[str]] = mapped_column(Text)
    duration_sec: Mapped[Optional[int]] = mapped_column(Integer)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    client: Mapped["Client"] = relationship(back_populates="deliverables")
    source: Mapped[Optional["Source"]] = relationship(back_populates="deliverables")
    invoice_items: Mapped[List["InvoiceItem"]] = relationship(
        back_populates="deliverable",
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        CheckConstraint("status IN ('complete','incomplete')", name="chk_deliv_status"),
        CheckConstraint(
            "price_mode IN ('auto','override')",
            name="chk_deliv_price_mode",
        ),
        CheckConstraint(
            "price_mode != 'override' OR price_value IS NOT NULL",
            name="check_price_mode",
        ),
        CheckConstraint(
            "payment_status IN ('unpaid','partial','paid')",
            name="chk_deliv_payment_status",
        ),
        Index("idx_deliv_client", "client_id"),
        Index("idx_deliv_status", "status"),
    )


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        String,
        default="unpaid",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    client: Mapped["Client"] = relationship(back_populates="invoices")
    items: Mapped[List["InvoiceItem"]] = relationship(back_populates="invoice")
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
    )
    deliverable_id: Mapped[int] = mapped_column(
        ForeignKey("deliverables.id", ondelete="CASCADE"),
        nullable=False,
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    invoice: Mapped["Invoice"] = relationship(back_populates="items")
    deliverable: Mapped["Deliverable"] = relationship(back_populates="invoice_items")

