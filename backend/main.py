from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy import event, select
from sqlalchemy.orm import Session

from .database import engine, get_db
from .models import Base, Client, Deliverable, Source
from .schemas import (
    ClientCreate,
    ClientRead,
    DeliverableCreate,
    DeliverableRead,
    SourceCreate,
    SourceRead,
)


@event.listens_for(Deliverable, "before_update", propagate=True)
def set_updated_at(mapper, connection, target: Deliverable) -> None:
    target.updated_at = datetime.utcnow()


app = FastAPI(title="Editor Tracker API")


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
def list_clients(db: Session = Depends(get_db)) -> List[Client]:
    return db.scalars(select(Client)).all()


@app.get("/clients/{client_id}", response_model=ClientRead)
def get_client(client_id: int, db: Session = Depends(get_db)) -> Client:
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
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

    if payload.source_id is not None:
        source = db.get(Source, payload.source_id)
        if not source:
            raise HTTPException(status_code=400, detail="Source does not exist")

    data = payload.model_dump()

    if payload.price_mode == "auto":
        data["price_value"] = _auto_price_for_deliverable(payload, client)

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
    db: Session = Depends(get_db),
) -> List[Deliverable]:
    stmt = select(Deliverable)
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

