import type { AnimalType } from "../types";

// 개발 중에는 컴퓨터의 로컬 네트워크 IP로 바꿔야 실기기/에뮬레이터에서 접속 가능.
// (localhost는 에뮬레이터/실기기 기준으로 그 기기 자신을 가리키므로 동작하지 않음)
// 예: "http://192.168.0.5:8000"
const API_BASE_URL = "http://localhost:8000";

export async function sendMessage(
  userId: string,
  animalType: AnimalType,
  message: string,
): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      animal_type: animalType,
      message,
    }),
  });

  if (!res.ok) {
    throw new Error(`서버 오류: ${res.status}`);
  }

  const data = (await res.json()) as { reply: string };
  return data.reply;
}
