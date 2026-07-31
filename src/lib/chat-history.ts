import * as SQLite from 'expo-sqlite';

/**
 * 대화 기록 영속화.
 *
 * 지금까지 대화는 화면 state 에만 있어서 새로고침 한 번에 전부 사라졌습니다.
 * SQLite 에 쌓아서 새로고침·재시작을 넘깁니다.
 *
 * ── 어디까지 살아남는가 (정직하게) ─────────────────────
 *   네이티브 앱   앱을 지우기 전까지 완전 보존
 *   웹           새로고침·브라우저 재시작은 견딤. 단 사이트 데이터 삭제에는
 *                같이 지워짐 — 웹의 OPFS 도 브라우저 저장소라서, 클라이언트에
 *                있는 한 이 한계는 어떤 저장소로도 못 넘습니다. 그걸 넘으려면
 *                서버가 필요합니다(README 의 A안 프록시와 묶이는 주제).
 *
 * ── 펫 단위 스레드 ─────────────────────────────────
 * `pet_id`(판정 결과의 createdAt)로 나눕니다. 사진을 다시 올려 새 캐릭터가
 * 태어나면 대화는 새로 시작하되, 이전 스레드는 지우지 않고 남깁니다 —
 * 지우는 건 언제든 할 수 있지만 되살리는 건 안 되기 때문입니다.
 *
 * ── 실패해도 대화는 계속돼야 합니다 ─────────────────────
 * DB 가 못 열리면(웹 wasm 미지원 브라우저 등) 모든 함수가 조용히 no-op 이
 * 됩니다. 영속화는 부가 기능이고 대화가 본체입니다 — 저장이 안 된다고
 * 화면이 죽으면 주객전도입니다. 실패는 console.warn 으로 한 번만 알립니다.
 */

export type StoredChatMessage = {
  /** DB row id. 화면 key 로 써도 됩니다. */
  id: number;
  role: 'user' | 'assistant';
  content: string;
  failed: boolean;
  /** ISO 8601 */
  createdAt: string;
};

const DB_NAME = 'chat-history.db';

/**
 * 스키마 버전. 컬럼을 바꾸면 여기를 올리고 migrate() 에 단계를 추가하세요.
 * PRAGMA user_version 으로 관리합니다 — 마이그레이션 테이블을 따로 두기엔
 * 스키마가 작습니다.
 */
const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase | null> | null = null;
let warned = false;

function warnOnce(error: unknown) {
  if (warned) return;
  warned = true;
  console.warn('[chat-history] 저장소를 열 수 없어 대화가 이 세션에만 남습니다:', error);
}

/** DB 를 열고 스키마를 맞춥니다. 실패하면 null — 이후 전부 no-op. */
function getDb(): Promise<SQLite.SQLiteDatabase | null> {
  dbPromise ??= (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrate(db);
      return db;
    } catch (error) {
      warnOnce(error);
      return null;
    }
  })();
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pet_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      failed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_pet ON chat_messages (pet_id, id);
    PRAGMA user_version = ${SCHEMA_VERSION};
  `);
}

/** 메시지 한 건을 붙입니다. 실패한 응답도 저장합니다(화면 복원용, failed 플래그). */
export async function appendMessage(
  petId: string,
  message: { role: 'user' | 'assistant'; content: string; failed?: boolean },
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.runAsync(
      'INSERT INTO chat_messages (pet_id, role, content, failed, created_at) VALUES (?, ?, ?, ?, ?)',
      petId,
      message.role,
      message.content,
      message.failed ? 1 : 0,
      new Date().toISOString(),
    );
  } catch (error) {
    warnOnce(error);
  }
}

/** 이 펫의 최근 기록을 시간순(오래된 것부터)으로 돌려줍니다. */
export async function loadRecent(petId: string, limit: number): Promise<StoredChatMessage[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    // 최신 limit 건을 뽑은 뒤 시간순으로 뒤집습니다. ORDER BY id ASC + LIMIT 로는
    // "가장 오래된 limit 건"이 나와서 최근 대화가 잘립니다.
    const rows = await db.getAllAsync<{
      id: number;
      role: string;
      content: string;
      failed: number;
      created_at: string;
    }>(
      'SELECT id, role, content, failed, created_at FROM chat_messages WHERE pet_id = ? ORDER BY id DESC LIMIT ?',
      petId,
      limit,
    );
    return rows.reverse().map((r) => ({
      id: r.id,
      role: r.role === 'user' ? 'user' : 'assistant',
      content: r.content,
      failed: r.failed === 1,
      createdAt: r.created_at,
    }));
  } catch (error) {
    warnOnce(error);
    return [];
  }
}

/** 전체 삭제. 로그아웃(clearUser) 계열에서 부릅니다. */
export async function clearChatHistory(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.runAsync('DELETE FROM chat_messages');
  } catch (error) {
    warnOnce(error);
  }
}
