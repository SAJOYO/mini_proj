"""Google Gemini API 호출 래퍼 (google-genai 통합 SDK 기준).

구버전 google-generativeai 패키지는 지원이 종료되어 google-genai로 전환함.
최신 모델명/무료 쿼터는 시기별로 바뀌므로, 실제 사용 전
https://ai.google.dev/gemini-api/docs/models 에서 최종 확인할 것.
"""

import os
import time

from dotenv import load_dotenv
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

# Gemini가 일시적으로 과부하(503)일 때 재시도할 횟수와 대기시간(초, 지수 백오프).
_MAX_RETRIES = 3
_RETRY_BACKOFF_SECONDS = 1.5

# main.py의 import 순서와 무관하게 안전하게 동작하도록 여기서도 로드한다.
load_dotenv()

MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    """API 클라이언트를 첫 호출 시점에 지연 생성한다 (import 시점 오류 방지)."""
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


def generate_reply(
    system_prompt: str,
    history: list[dict[str, str]],
    user_message: str,
) -> str:
    """system_prompt(페르소나)와 대화 히스토리를 반영해 Gemini 응답을 생성한다.

    history는 [{"role": "user"|"assistant", "content": str}, ...] 형태.
    """
    client = _get_client()

    contents = [
        types.Content(
            role="user" if turn["role"] == "user" else "model",
            parts=[types.Part(text=turn["content"])],
        )
        for turn in history
    ]
    contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))

    for attempt in range(_MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=contents,
                config=types.GenerateContentConfig(system_instruction=system_prompt),
            )
            return response.text
        except genai_errors.ServerError:
            # Gemini 쪽 일시적 과부하(503 등). 마지막 시도가 아니면 잠깐 쉬고 재시도.
            if attempt == _MAX_RETRIES - 1:
                raise
            time.sleep(_RETRY_BACKOFF_SECONDS * (attempt + 1))

    raise AssertionError("unreachable")
