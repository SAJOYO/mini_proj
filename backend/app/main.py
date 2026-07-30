from dotenv import load_dotenv

load_dotenv()

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from google.genai import errors as genai_errors
from pydantic import BaseModel, ConfigDict, Field

from app.db import Character, CharacterBreed, Message, SessionLocal, init_db
from app.gemini_service import generate_reply
from app.personas import build_system_prompt

app = FastAPI(title="Animal Chat Starter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발용 전체 허용. 배포 시 실제 앱 origin으로 제한할 것
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

MAX_TURNS = 20  # 사용자+동물 턴 합쳐 최근 N턴만 유지


class BreedInfo(BaseModel):
    breed: str
    percent: int


class CharacterUpsertRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    character_id: str = Field(alias="characterId")
    nickname: str
    animal_type: str = Field(alias="animalType")
    breeds: list[BreedInfo] = []
    user_id: str | None = Field(default=None, alias="userId")


class CharacterResponse(BaseModel):
    character_id: str
    status: str


@app.post("/api/characters", response_model=CharacterResponse, status_code=201)
def upsert_character(req: CharacterUpsertRequest) -> CharacterResponse:
    """앞단이 보낸 characterId/nickname/animalType/breeds를 저장(신규면 생성, 기존이면 갱신)한다."""
    db = SessionLocal()
    try:
        character = db.get(Character, req.character_id)
        if character is None:
            character = Character(
                character_id=req.character_id,
                user_id=req.user_id,
                nickname=req.nickname,
                animal_type=req.animal_type,
            )
            db.add(character)
        else:
            character.nickname = req.nickname
            character.animal_type = req.animal_type
            if req.user_id is not None:
                character.user_id = req.user_id
            db.query(CharacterBreed).filter(
                CharacterBreed.character_id == req.character_id
            ).delete()

        for breed in req.breeds:
            db.add(
                CharacterBreed(
                    character_id=req.character_id,
                    breed=breed.breed,
                    percent=breed.percent,
                )
            )

        db.commit()
    finally:
        db.close()

    return CharacterResponse(character_id=req.character_id, status="saved")


class ChatRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    character_id: str = Field(alias="characterId")
    message: str


class ChatResponse(BaseModel):
    reply: str


@app.post("/api/chat/message", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    db = SessionLocal()
    try:
        character = db.get(Character, req.character_id)
        if character is None:
            raise HTTPException(
                status_code=404,
                detail="존재하지 않는 캐릭터예요. 먼저 캐릭터를 생성해주세요.",
            )

        breeds = (
            db.query(CharacterBreed)
            .filter(CharacterBreed.character_id == req.character_id)
            .all()
        )

        rows = (
            db.query(Message)
            .filter(Message.character_id == req.character_id)
            .order_by(Message.id.desc())
            .limit(MAX_TURNS * 2)
            .all()
        )
        history = [{"role": m.role, "content": m.content} for m in reversed(rows)]

        system_prompt = build_system_prompt(
            character.nickname,
            character.animal_type,
            [{"breed": b.breed, "percent": b.percent} for b in breeds],
        )
        try:
            reply = generate_reply(system_prompt, history, req.message)
        except genai_errors.ServerError:
            raise HTTPException(
                status_code=503,
                detail="지금 동물 친구가 너무 바빠서 대답을 못 들었어요. 잠시 후 다시 시도해주세요.",
            )

        db.add(Message(character_id=req.character_id, role="user", content=req.message))
        db.add(Message(character_id=req.character_id, role="assistant", content=reply))
        db.commit()
    finally:
        db.close()

    return ChatResponse(reply=reply)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


_STATIC_DIR = Path(__file__).parent / "static"


@app.get("/")
def chat_ui() -> FileResponse:
    return FileResponse(_STATIC_DIR / "chat.html")
