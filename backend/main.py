from __future__ import annotations

import os
from datetime import date, datetime, timedelta, timezone
from urllib.parse import urlencode
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import httpx
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import and_, case, event, exists, func, select
from sqlalchemy.orm import Session

from database import engine, get_db
from models import Base, Client, Deliverable, Invoice, InvoiceItem, OAuthAccount, Source, User
from twitch import fetch_clips, resolve_broadcaster_id
from schemas import (
    AuthTokenResponse,
    ClientCreate,
    ClientRead,
    ClientUpdate,
    DeliverableCreate,
    DeliverableRead,
    DeliverableUpdate,
    InvoiceCreate,
    InvoiceRead,
    LoginRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    SourceCreate,
    SourceRead,
    UserRead,
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


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_oauth_state() -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=10)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth token")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/auth/register", response_model=AuthTokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthTokenResponse:
    email = normalize_email(payload.email)
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name.strip() if payload.display_name else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthTokenResponse(access_token=create_access_token(user), user=UserRead.model_validate(user))


@app.post("/auth/login", response_model=AuthTokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthTokenResponse:
    email = normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return AuthTokenResponse(access_token=create_access_token(user), user=UserRead.model_validate(user))


@app.post("/auth/refresh", response_model=AuthTokenResponse)
def refresh_token(current_user: User = Depends(get_current_user)) -> AuthTokenResponse:
    return AuthTokenResponse(
        access_token=create_access_token(current_user),
        user=UserRead.model_validate(current_user),
    )


@app.post("/auth/logout")
def logout() -> dict:
    return {"status": "ok"}


@app.get("/auth/me", response_model=UserRead)
def auth_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@app.patch("/auth/me", response_model=UserRead)
def update_me(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    data = payload.model_dump(exclude_unset=True)
    if "display_name" in data:
        current_user.display_name = data["display_name"].strip() if data["display_name"] else None
    if "avatar_url" in data:
        current_user.avatar_url = data["avatar_url"].strip() if data["avatar_url"] else None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@app.get("/auth/google/start")
def auth_google_start() -> RedirectResponse:
    if not GOOGLE_CLIENT_ID or not GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured")

    query = urlencode(
        {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "state": create_oauth_state(),
            "access_type": "offline",
            "prompt": "consent",
        }
    )
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{query}")


@app.get("/auth/google/callback")
def auth_google_callback(
    code: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    error: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if error:
        return RedirectResponse(f"{FRONTEND_URL}/login?error={error}")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing OAuth code/state")
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured")

    try:
        jwt.decode(state, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    token_res = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=20.0,
    )
    if token_res.status_code >= 400:
        raise HTTPException(status_code=502, detail="Failed to exchange Google OAuth code")
    token_data = token_res.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=502, detail="Google OAuth token missing")

    userinfo_res = httpx.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=20.0,
    )
    if userinfo_res.status_code >= 400:
        raise HTTPException(status_code=502, detail="Failed to fetch Google user profile")
    profile = userinfo_res.json()

    provider_user_id = str(profile.get("sub") or "").strip()
    email = normalize_email(str(profile.get("email") or ""))
    if not provider_user_id or not email:
        raise HTTPException(status_code=400, detail="Google profile missing required fields")

    oauth_account = db.scalar(
        select(OAuthAccount).where(
            OAuthAccount.provider == "google",
            OAuthAccount.provider_user_id == provider_user_id,
        )
    )
    if oauth_account:
        user = db.get(User, oauth_account.user_id)
        if not user:
            raise HTTPException(status_code=500, detail="OAuth account is linked to missing user")
    else:
        user = db.scalar(select(User).where(User.email == email))
        if not user:
            user = User(
                email=email,
                password_hash=None,
                display_name=profile.get("name"),
                avatar_url=profile.get("picture"),
            )
            db.add(user)
            db.flush()
        db.add(
            OAuthAccount(
                user_id=user.id,
                provider="google",
                provider_user_id=provider_user_id,
            )
        )
        db.commit()
        db.refresh(user)

    app_token = create_access_token(user)
    return RedirectResponse(f"{FRONTEND_URL}/oauth/callback?token={app_token}")


# --- Clients ---


@app.post("/clients", response_model=ClientRead)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Client:
    client = Client(**payload.model_dump(), owner_user_id=current_user.id)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@app.get("/clients", response_model=List[ClientRead])
def list_clients(
    archived: bool = Query(False, description="If True, return only archived clients"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Client]:
    stmt = (
        select(Client)
        .where(Client.archived == archived)
        .where(Client.owner_user_id == current_user.id)
        .order_by(Client.name.asc())
    )
    return db.scalars(stmt).all()


def _owned_client_or_404(db: Session, client_id: int, user_id: int) -> Client:
    client = db.scalar(select(Client).where(Client.id == client_id, Client.owner_user_id == user_id))
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@app.get("/clients/{client_id}", response_model=ClientRead)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Client:
    return _owned_client_or_404(db, client_id, current_user.id)


@app.patch("/clients/{client_id}", response_model=ClientRead)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Client:
    client = _owned_client_or_404(db, client_id, current_user.id)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(client, k, v)
    db.commit()
    db.refresh(client)
    return client


# --- Sources ---


@app.post("/sources", response_model=SourceRead)
def create_source(
    payload: SourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Source:
    client = _owned_client_or_404(db, payload.client_id, current_user.id)

    source = Source(**payload.model_dump(), owner_user_id=current_user.id)
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@app.get("/clients/{client_id}/sources", response_model=List[SourceRead])
def list_sources_for_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Source]:
    _owned_client_or_404(db, client_id, current_user.id)
    stmt = (
        select(Source)
        .where(Source.client_id == client_id, Source.owner_user_id == current_user.id)
        .order_by(Source.created_at.desc())
    )
    return db.scalars(stmt).all()


# Cache TTL for sources: return from DB if last fetch was within this many minutes
SOURCES_CACHE_MINUTES = 10


@app.post("/clients/{client_id}/sources/sync", response_model=List[SourceRead])
def sync_client_sources(
    client_id: int,
    platform: str = Query("twitch", description="Platform to sync (twitch only for now)"),
    force: bool = Query(False, description="If True, always refetch from Twitch"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Source]:
    client = _owned_client_or_404(db, client_id, current_user.id)
    if client.archived:
        raise HTTPException(status_code=400, detail="Client is archived")

    if platform != "twitch":
        raise HTTPException(status_code=400, detail="Only platform=twitch is supported")

    now = datetime.now(timezone.utc)
    cache_cutoff = now - timedelta(minutes=SOURCES_CACHE_MINUTES)

    if not force:
        stmt = (
            select(Source)
            .where(
                Source.client_id == client_id,
                Source.platform == "twitch",
                Source.owner_user_id == current_user.id,
            )
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
        if s.owner_user_id == current_user.id
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
                owner_user_id=current_user.id,
            )
            db.add(src)
            existing_by_ext[ext_id] = src

    db.commit()

    stmt = (
        select(Source)
        .where(
            Source.client_id == client_id,
            Source.platform == "twitch",
            Source.owner_user_id == current_user.id,
        )
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
    current_user: User = Depends(get_current_user),
) -> Deliverable:
    client = _owned_client_or_404(db, payload.client_id, current_user.id)
    if client.archived:
        raise HTTPException(status_code=400, detail="Client is archived")

    source: Optional[Source] = None
    if payload.source_id is not None:
        source = db.scalar(
            select(Source).where(Source.id == payload.source_id, Source.owner_user_id == current_user.id)
        )
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

    deliverable = Deliverable(**data, owner_user_id=current_user.id)
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
    current_user: User = Depends(get_current_user),
) -> List[Deliverable]:
    # Hide deliverables when their client is archived
    stmt = (
        select(Deliverable)
        .join(Client, Deliverable.client_id == Client.id)
        .where(Deliverable.archived == archived)
        .where(Client.archived.is_(False))
        .where(Deliverable.owner_user_id == current_user.id)
        .where(Client.owner_user_id == current_user.id)
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
def get_deliverable(
    deliverable_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Deliverable:
    deliverable = db.scalar(
        select(Deliverable).where(Deliverable.id == deliverable_id, Deliverable.owner_user_id == current_user.id)
    )
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    return deliverable


@app.patch("/deliverables/{deliverable_id}", response_model=DeliverableRead)
def update_deliverable(
    deliverable_id: int,
    payload: DeliverableUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Deliverable:
    deliverable = db.scalar(
        select(Deliverable).where(Deliverable.id == deliverable_id, Deliverable.owner_user_id == current_user.id)
    )
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    data = payload.model_dump(exclude_unset=True)

    if "client_id" in data:
        new_client = _owned_client_or_404(db, data["client_id"], current_user.id)
        if new_client.archived:
            raise HTTPException(status_code=400, detail="Client is archived")

    if "source_id" in data:
        source_id = data["source_id"]
        if source_id is None:
            data.setdefault("source_title", None)
            data.setdefault("duration_sec", None)
        else:
            source = db.scalar(
                select(Source).where(Source.id == source_id, Source.owner_user_id == current_user.id)
            )
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
            client = _owned_client_or_404(db, deliverable.client_id, current_user.id)
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


@app.get("/dashboard/overview")
def dashboard_overview(
    period_start: Optional[date] = Query(default=None),
    period_end: Optional[date] = Query(default=None),
    client_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    dts = _deliverable_period_expr()
    conditions = [
        Deliverable.owner_user_id == current_user.id,
        Client.owner_user_id == current_user.id,
        Deliverable.archived.is_(False),
        Client.archived.is_(False),
        Deliverable.price_value.is_not(None),
    ]
    if client_id is not None:
        conditions.append(Deliverable.client_id == client_id)
    if period_start is not None:
        conditions.append(func.date(dts) >= period_start)
    if period_end is not None:
        conditions.append(func.date(dts) <= period_end)

    summary_stmt = (
        select(
            func.coalesce(
                func.sum(case((Deliverable.payment_status == "paid", Deliverable.price_value), else_=0)),
                0,
            ).label("paid_total"),
            func.coalesce(
                func.sum(
                    case((Deliverable.payment_status.in_(["unpaid", "partial"]), Deliverable.price_value), else_=0)
                ),
                0,
            ).label("unpaid_total"),
            func.coalesce(
                func.sum(
                    case((Deliverable.payment_status.in_(["unpaid", "partial"]), 1), else_=0)
                ),
                0,
            ).label("unpaid_count"),
        )
        .select_from(Deliverable)
        .join(Client, Client.id == Deliverable.client_id)
        .where(and_(*conditions))
    )
    summary = db.execute(summary_stmt).one()
    paid_total = float(summary.paid_total or 0)
    unpaid_total = float(summary.unpaid_total or 0)

    ranking_stmt = (
        select(
            Client.id.label("client_id"),
            Client.name.label("client_name"),
            func.coalesce(func.sum(Deliverable.price_value), 0).label("total"),
            func.coalesce(func.avg(Deliverable.price_value), 0).label("avg_per_deliverable"),
            func.count(Deliverable.id).label("count_deliverables"),
        )
        .join(Deliverable, Deliverable.client_id == Client.id)
        .where(and_(*conditions))
        .group_by(Client.id, Client.name)
        .order_by(func.coalesce(func.sum(Deliverable.price_value), 0).desc())
    )
    ranking_rows = db.execute(ranking_stmt).all()

    top_client_payer = None
    best_ppd_client = None
    if ranking_rows:
        r0 = ranking_rows[0]
        top_client_payer = {
            "client_id": r0.client_id,
            "client_name": r0.client_name,
            "total": float(r0.total),
        }
        best = max(ranking_rows, key=lambda r: float(r.avg_per_deliverable))
        best_ppd_client = {
            "client_id": best.client_id,
            "client_name": best.client_name,
            "avg_per_deliverable": float(best.avg_per_deliverable),
        }

    trend_stmt = (
        select(
            func.to_char(func.date_trunc("month", dts), "YYYY-MM").label("bucket"),
            func.coalesce(
                func.sum(case((Deliverable.payment_status == "paid", Deliverable.price_value), else_=0)),
                0,
            ).label("paid_total"),
            func.coalesce(
                func.sum(
                    case((Deliverable.payment_status.in_(["unpaid", "partial"]), Deliverable.price_value), else_=0)
                ),
                0,
            ).label("unpaid_total"),
        )
        .select_from(Deliverable)
        .join(Client, Client.id == Deliverable.client_id)
        .where(and_(*conditions))
        .group_by("bucket")
        .order_by("bucket")
    )
    trend_rows = db.execute(trend_stmt).all()

    return {
        "paid_total": paid_total,
        "unpaid_total": unpaid_total,
        "total_revenue": paid_total + unpaid_total,
        "unpaid_deliverables_count": int(summary.unpaid_count or 0),
        "top_client_payer": top_client_payer,
        "best_pay_per_deliverable_client": best_ppd_client,
        "trend": [
            {"bucket": r.bucket, "paid_total": float(r.paid_total), "unpaid_total": float(r.unpaid_total)}
            for r in trend_rows
        ],
        "client_rankings": [
            {
                "client_id": r.client_id,
                "client_name": r.client_name,
                "total": float(r.total),
                "avg_per_deliverable": float(r.avg_per_deliverable),
                "count_deliverables": int(r.count_deliverables),
            }
            for r in ranking_rows
        ],
    }


@app.get("/billing/totals")
def billing_totals(
    client_id: Optional[int] = Query(default=None),
    period_start: Optional[date] = Query(default=None),
    period_end: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    dts = _deliverable_period_expr()

    conditions = [
        Deliverable.price_value.is_not(None),
        Deliverable.archived.is_(False),
        Client.archived.is_(False),
        Deliverable.owner_user_id == current_user.id,
        Client.owner_user_id == current_user.id,
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
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Invoice:
    client = _owned_client_or_404(db, payload.client_id, current_user.id)
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
        .where(Deliverable.owner_user_id == current_user.id)
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
        owner_user_id=current_user.id,
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
    current_user: User = Depends(get_current_user),
) -> List[Invoice]:
    stmt = select(Invoice).join(Client, Invoice.client_id == Client.id).order_by(Invoice.created_at.desc())
    stmt = stmt.where(Invoice.owner_user_id == current_user.id, Client.owner_user_id == current_user.id)
    if not include_archived_clients:
        stmt = stmt.where(Client.archived.is_(False))
    if client_id is not None:
        stmt = stmt.where(Invoice.client_id == client_id)
    return db.scalars(stmt).all()

