from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_, case, event, exists, func, select
from sqlalchemy.orm import Session

from database import engine, get_db
from models import Base, Client, Deliverable, Invoice, InvoiceItem, Source
from twitch import fetch_clips, resolve_broadcaster_id
from schemas import (
    ClientCreate,
    ClientRead,
    ClientUpdate,
    DeliverableCreate,
    DeliverableRead,
    DeliverableUpdate,
    InvoiceCreate,
    InvoiceRead,
    SourceCreate,
    SourceRead,
)


@event.listens_for(Deliverable, "before_update", propagate=True)
def set_updated_at(mapper, connection, target: Deliverable) -> None:
    target.updated_at = datetime.utcnow()


app = FastAPI(title="Editor Tracker API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# --- Clients ---


@app.post("/clients", response_model=ClientRead)
def create_client(payload: ClientCreate, db: Session = Depends(get_db)) -> Client:
    client = Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@app.get("/clients", response_model=List[ClientRead])
def list_clients(
    archived: bool = Query(False, description="If True, return only archived clients"),
    db: Session = Depends(get_db),
) -> List[Client]:
    stmt = select(Client).where(Client.archived == archived).order_by(Client.name.asc())
    return db.scalars(stmt).all()


@app.get("/clients/{client_id}", response_model=ClientRead)
def get_client(client_id: int, db: Session = Depends(get_db)) -> Client:
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@app.patch("/clients/{client_id}", response_model=ClientRead)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
) -> Client:
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(client, k, v)
    db.commit()
    db.refresh(client)
    return client


# --- Sources ---


@app.post("/sources", response_model=SourceRead)
def create_source(payload: SourceCreate, db: Session = Depends(get_db)) -> Source:
    client = db.get(Client, payload.client_id)
    if not client:
        raise HTTPException(status_code=400, detail="Client does not exist")

    source = Source(**payload.model_dump())
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@app.get("/clients/{client_id}/sources", response_model=List[SourceRead])
def list_sources_for_client(client_id: int, db: Session = Depends(get_db)) -> List[Source]:
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    stmt = select(Source).where(Source.client_id == client_id).order_by(Source.created_at.desc())
    return db.scalars(stmt).all()


# Cache TTL for sources: return from DB if last fetch was within this many minutes
SOURCES_CACHE_MINUTES = 10


@app.post("/clients/{client_id}/sources/sync", response_model=List[SourceRead])
def sync_client_sources(
    client_id: int,
    platform: str = Query("twitch", description="Platform to sync (twitch only for now)"),
    force: bool = Query(False, description="If True, always refetch from Twitch"),
    db: Session = Depends(get_db),
) -> List[Source]:
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if client.archived:
        raise HTTPException(status_code=400, detail="Client is archived")

    if platform != "twitch":
        raise HTTPException(status_code=400, detail="Only platform=twitch is supported")

    now = datetime.now(timezone.utc)
    cache_cutoff = now - timedelta(minutes=SOURCES_CACHE_MINUTES)

    if not force:
        stmt = (
            select(Source)
            .where(Source.client_id == client_id, Source.platform == "twitch")
            .order_by(Source.fetched_at.desc().nullslast(), Source.created_at.desc())
        )
        existing = db.scalars(stmt).all()
        if existing and existing[0].fetched_at and existing[0].fetched_at >= cache_cutoff:
            return existing

    # Resolve broadcaster_id: use cached from socials or call Twitch
    socials = client.socials or {}
    broadcaster_id = socials.get("twitch_broadcaster_id")
    if not broadcaster_id:
        channel = socials.get("twitch")
        if not channel or not str(channel).strip():
            raise HTTPException(
                status_code=400,
                detail="Add Twitch channel name for this client in socials (e.g. twitch: streamer name)",
            )
        broadcaster_id = resolve_broadcaster_id(str(channel))
        if not broadcaster_id:
            raise HTTPException(
                status_code=400,
                detail="Could not find Twitch channel with that name",
            )
        socials = dict(socials)
        socials["twitch_broadcaster_id"] = broadcaster_id
        client.socials = socials
        db.add(client)
        db.flush()

    try:
        clips = fetch_clips(broadcaster_id, first=100)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Twitch API error: {getattr(e, 'message', str(e))}",
        )

    # Upsert sources by (client_id, platform, external_id)
    existing_by_ext = {
        s.external_id: s
        for s in db.scalars(select(Source).where(Source.client_id == client_id, Source.platform == "twitch")).all()
        if s.external_id
    }

    for clip in clips:
        ext_id = clip.get("id")
        if not ext_id:
            continue
        title = clip.get("title") or "Untitled clip"
        url = clip.get("url")
        duration = clip.get("duration")
        duration_sec = int(duration) if duration is not None else None

        if ext_id in existing_by_ext:
            src = existing_by_ext[ext_id]
            src.title = title
            src.url = url
            src.duration_sec = duration_sec
            src.fetched_at = now
        else:
            src = Source(
                client_id=client_id,
                platform="twitch",
                external_id=ext_id,
                title=title,
                url=url,
                duration_sec=duration_sec,
                fetched_at=now,
            )
            db.add(src)
            existing_by_ext[ext_id] = src

    db.commit()

    stmt = (
        select(Source)
        .where(Source.client_id == client_id, Source.platform == "twitch")
        .order_by(Source.fetched_at.desc().nullslast(), Source.created_at.desc())
    )
    return db.scalars(stmt).all()


# --- Deliverables ---


def _auto_price_for_deliverable(payload: DeliverableCreate, client: Client) -> float:
    if payload.type == "short":
        return float(client.price_short)
    if payload.type == "thumbnail":
        return float(client.price_thumbnail)
    if payload.type == "video":
        return float(client.price_video)
    raise HTTPException(status_code=400, detail="Unknown deliverable type")


@app.post("/deliverables", response_model=DeliverableRead)
def create_deliverable(
    payload: DeliverableCreate,
    db: Session = Depends(get_db),
) -> Deliverable:
    client = db.get(Client, payload.client_id)
    if not client:
        raise HTTPException(status_code=400, detail="Client does not exist")
    if client.archived:
        raise HTTPException(status_code=400, detail="Client is archived")

    source: Optional[Source] = None
    if payload.source_id is not None:
        source = db.get(Source, payload.source_id)
        if not source:
            raise HTTPException(status_code=400, detail="Source does not exist")
        if source.client_id != payload.client_id:
            raise HTTPException(status_code=400, detail="Source does not belong to this client")

    data = payload.model_dump()
    if source is not None:
        if not data.get("source_title"):
            data["source_title"] = source.title
        if data.get("duration_sec") is None:
            data["duration_sec"] = source.duration_sec
        if not data.get("source_url"):
            data["source_url"] = source.url

    if payload.price_mode == "auto":
        data["price_value"] = _auto_price_for_deliverable(payload, client)
    else:
        if payload.price_value is None:
            raise HTTPException(
                status_code=400,
                detail="price_value is required when price_mode is override",
            )
        data["price_value"] = float(payload.price_value)

    deliverable = Deliverable(**data)
    db.add(deliverable)
    db.commit()
    db.refresh(deliverable)
    return deliverable


@app.get("/deliverables", response_model=List[DeliverableRead])
def list_deliverables(
    client_id: Optional[int] = Query(default=None),
    status: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None, alias="deliverable_type"),
    archived: bool = Query(False, description="If True, return only archived deliverables"),
    db: Session = Depends(get_db),
) -> List[Deliverable]:
    # Hide deliverables when their client is archived
    stmt = (
        select(Deliverable)
        .join(Client, Deliverable.client_id == Client.id)
        .where(Deliverable.archived == archived)
        .where(Client.archived.is_(False))
    )
    if client_id is not None:
        stmt = stmt.where(Deliverable.client_id == client_id)
    if status is not None:
        stmt = stmt.where(Deliverable.status == status)
    if type is not None:
        stmt = stmt.where(Deliverable.type == type)

    stmt = stmt.order_by(Deliverable.created_at.desc())
    return db.scalars(stmt).all()


@app.get("/deliverables/{deliverable_id}", response_model=DeliverableRead)
def get_deliverable(deliverable_id: int, db: Session = Depends(get_db)) -> Deliverable:
    deliverable = db.get(Deliverable, deliverable_id)
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    return deliverable


@app.patch("/deliverables/{deliverable_id}", response_model=DeliverableRead)
def update_deliverable(
    deliverable_id: int,
    payload: DeliverableUpdate,
    db: Session = Depends(get_db),
) -> Deliverable:
    deliverable = db.get(Deliverable, deliverable_id)
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    data = payload.model_dump(exclude_unset=True)

    if "client_id" in data:
        new_client = db.get(Client, data["client_id"])
        if not new_client:
            raise HTTPException(status_code=400, detail="Client does not exist")
        if new_client.archived:
            raise HTTPException(status_code=400, detail="Client is archived")

    if "source_id" in data:
        source_id = data["source_id"]
        if source_id is None:
            data.setdefault("source_title", None)
            data.setdefault("duration_sec", None)
        else:
            source = db.get(Source, source_id)
            if not source:
                raise HTTPException(status_code=400, detail="Source does not exist")
            target_client_id = data.get("client_id", deliverable.client_id)
            if source.client_id != target_client_id:
                raise HTTPException(status_code=400, detail="Source does not belong to this client")
            if data.get("source_title") is None:
                data["source_title"] = source.title
            if data.get("duration_sec") is None:
                data["duration_sec"] = source.duration_sec
            if data.get("source_url") is None:
                data["source_url"] = source.url

    if "price_mode" in data or "price_value" in data:
        price_mode = data.get("price_mode", deliverable.price_mode)
        if price_mode == "auto":
            client = db.get(Client, deliverable.client_id)
            if client:
                if deliverable.type == "short":
                    data["price_value"] = float(client.price_short)
                elif deliverable.type == "thumbnail":
                    data["price_value"] = float(client.price_thumbnail)
                elif deliverable.type == "video":
                    data["price_value"] = float(client.price_video)
        elif price_mode == "override":
            if data.get("price_value") is None and deliverable.price_value is None:
                raise HTTPException(
                    status_code=400,
                    detail="price_value is required when price_mode is override",
                )

    for k, v in data.items():
        setattr(deliverable, k, v)
    db.commit()
    db.refresh(deliverable)
    return deliverable


# --- Billing / Invoices ---


def _deliverable_period_expr():
    # Use completed_at when available; otherwise created_at
    return func.coalesce(Deliverable.completed_at, Deliverable.created_at)


@app.get("/billing/totals")
def billing_totals(
    client_id: Optional[int] = Query(default=None),
    period_start: Optional[date] = Query(default=None),
    period_end: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    dts = _deliverable_period_expr()

    conditions = [
        Deliverable.price_value.is_not(None),
        Deliverable.archived.is_(False),
        Client.archived.is_(False),
    ]
    if client_id is not None:
        conditions.append(Deliverable.client_id == client_id)
    if period_start is not None:
        conditions.append(func.date(dts) >= period_start)
    if period_end is not None:
        conditions.append(func.date(dts) <= period_end)

    paid_sum = func.coalesce(
        func.sum(
            case((Deliverable.payment_status == "paid", Deliverable.price_value), else_=0)
        ),
        0,
    ).label("paid_total")
    unpaid_sum = func.coalesce(
        func.sum(
            case(
                (
                    Deliverable.payment_status.in_(["unpaid", "partial"]),
                    Deliverable.price_value,
                ),
                else_=0,
            )
        ),
        0,
    ).label("unpaid_total")

    stmt = (
        select(paid_sum, unpaid_sum)
        .join(Client, Deliverable.client_id == Client.id)
        .where(and_(*conditions))
    )
    row = db.execute(stmt).one()

    result = {"paid_total": float(row.paid_total), "unpaid_total": float(row.unpaid_total)}

    if client_id is None:
        by_client_conditions = conditions + [Client.archived.is_(False)]
        by_client_stmt = (
            select(
                Client.id.label("client_id"),
                Client.name.label("client_name"),
                func.coalesce(
                    func.sum(
                        case(
                            (Deliverable.payment_status == "paid", Deliverable.price_value),
                            else_=0,
                        )
                    ),
                    0,
                ).label("paid_total"),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                Deliverable.payment_status.in_(["unpaid", "partial"]),
                                Deliverable.price_value,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ).label("unpaid_total"),
            )
            .join(Deliverable, Deliverable.client_id == Client.id)
            .where(and_(*by_client_conditions))
            .group_by(Client.id, Client.name)
            .order_by(Client.name.asc())
        )
        rows = db.execute(by_client_stmt).all()
        result["by_client"] = [
            {
                "client_id": r.client_id,
                "client_name": r.client_name,
                "paid_total": float(r.paid_total),
                "unpaid_total": float(r.unpaid_total),
            }
            for r in rows
        ]

    return result


@app.post("/invoices", response_model=InvoiceRead)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db)) -> Invoice:
    client = db.get(Client, payload.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if client.archived:
        raise HTTPException(status_code=400, detail="Cannot create invoice for archived client")

    if payload.period_start > payload.period_end:
        raise HTTPException(status_code=400, detail="period_start must be <= period_end")

    dts = _deliverable_period_expr()

    already_invoiced = exists(
        select(1).where(InvoiceItem.deliverable_id == Deliverable.id)
    )

    deliverables_stmt = (
        select(Deliverable)
        .where(Deliverable.client_id == payload.client_id)
        .where(Deliverable.price_value.is_not(None))
        .where(Deliverable.archived.is_(False))
        .where(func.date(dts) >= payload.period_start)
        .where(func.date(dts) <= payload.period_end)
        .where(~already_invoiced)
        .order_by(dts.asc(), Deliverable.id.asc())
    )
    deliverables = db.scalars(deliverables_stmt).all()

    if not deliverables:
        raise HTTPException(status_code=400, detail="No eligible deliverables found in that date range")

    label = payload.label
    if not label:
        label = f"{payload.period_start.isoformat()} to {payload.period_end.isoformat()}"

    total_amount = float(sum(float(d.price_value) for d in deliverables if d.price_value is not None))

    invoice = Invoice(
        client_id=payload.client_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
        label=label,
        total_amount=total_amount,
        status="unpaid",
    )
    db.add(invoice)
    db.flush()

    for d in deliverables:
        db.add(
            InvoiceItem(
                invoice_id=invoice.id,
                deliverable_id=d.id,
                amount=float(d.price_value),
            )
        )

    db.commit()
    db.refresh(invoice)
    return invoice


@app.get("/invoices", response_model=List[InvoiceRead])
def list_invoices(
    client_id: Optional[int] = Query(default=None),
    include_archived_clients: bool = Query(False, description="Include invoices for archived clients"),
    db: Session = Depends(get_db),
) -> List[Invoice]:
    stmt = select(Invoice).join(Client, Invoice.client_id == Client.id).order_by(Invoice.created_at.desc())
    if not include_archived_clients:
        stmt = stmt.where(Client.archived.is_(False))
    if client_id is not None:
        stmt = stmt.where(Invoice.client_id == client_id)
    return db.scalars(stmt).all()

