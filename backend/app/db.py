"""SQLite 기반 캐릭터/대화 히스토리 영속화.

캐릭터는 nickname을 식별자(기본키)로 구분되고, 서버 재시작에도 유지된다.
DATABASE_URL 환경변수로 다른 DB(Postgres 등)로 교체 가능.
"""

import os
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./chat_history.db")

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class Character(Base):
    """앞단에서 생성한 캐릭터 1개 = 대화 상대 1명.

    nickname이 곧 식별자(기본키)다 — 별도의 character_id 컬럼은 두지 않는다.
    한 명의 사용자가 여러 캐릭터를 만들 수 있으므로 user_id는 nickname과 별도로 둔다
    (지금은 로그인이 없어 nullable — 클라이언트가 생성한 임의 user_id를 그대로 저장).
    animal_type/breed는 강아지·고양이로 제한하지 않고 앞단이 보내주는 값을 그대로 저장한다.
    """

    __tablename__ = "characters"

    nickname: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    animal_type: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class CharacterBreed(Base):
    """캐릭터 1개에 딸린 혈통 구성(품종 N개 + 비율). 캐릭터당 1:N."""

    __tablename__ = "character_breeds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nickname: Mapped[str] = mapped_column(
        ForeignKey("characters.nickname"), index=True
    )
    breed: Mapped[str] = mapped_column(String)
    percent: Mapped[int] = mapped_column(Integer)


class Message(Base):
    """캐릭터별 대화 메시지. nickname으로 히스토리를 구분/조회한다."""

    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nickname: Mapped[str] = mapped_column(
        ForeignKey("characters.nickname"), index=True
    )
    role: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
