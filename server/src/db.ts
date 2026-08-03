/**
 * SQLite 초기화 + 스키마.
 *
 * ORM도, DB용 npm 의존성도 없습니다 — Node 22.5+에 내장된 `node:sqlite`를
 * 씁니다. `better-sqlite3`는 네이티브 애드온이라 팀 노트북에 Visual Studio
 * Build Tools가 없으면 `npm install`이 그 자리에서 실패합니다(실제로 이
 * 환경에서 재현됨). 내장 모듈은 그 문제가 없고, 이 프로젝트 전체가
 * 지향하는 무의존성 기조(comfy.ts, storage.ts 참고)에도 더 맞습니다.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(here, '..', 'memory.db');

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_turns_device ON turns(device_id, id);

  CREATE TABLE IF NOT EXISTS summaries (
    device_id TEXT PRIMARY KEY,
    summary TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

export type TurnRow = {
  id: number;
  device_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export type SummaryRow = {
  device_id: string;
  summary: string;
  updated_at: string;
};

export function insertTurns(
  deviceId: string,
  turns: { role: 'user' | 'assistant'; content: string }[],
): void {
  const stmt = db.prepare(
    'INSERT INTO turns (device_id, role, content, created_at) VALUES (?, ?, ?, ?)',
  );
  const now = new Date().toISOString();
  db.exec('BEGIN');
  try {
    for (const t of turns) stmt.run(deviceId, t.role, t.content, now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function getTurns(deviceId: string): TurnRow[] {
  return db
    .prepare('SELECT * FROM turns WHERE device_id = ? ORDER BY id ASC')
    .all(deviceId) as TurnRow[];
}

export function getSummary(deviceId: string): string | null {
  const row = db.prepare('SELECT summary FROM summaries WHERE device_id = ?').get(deviceId) as
    Pick<SummaryRow, 'summary'> | undefined;
  return row?.summary ?? null;
}

export function setSummary(deviceId: string, summary: string): void {
  db.prepare(
    `INSERT INTO summaries (device_id, summary, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(device_id) DO UPDATE SET summary = excluded.summary, updated_at = excluded.updated_at`,
  ).run(deviceId, summary, new Date().toISOString());
}

export function deleteTurns(deviceId: string, ids: number[]): void {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM turns WHERE device_id = ? AND id IN (${placeholders})`).run(
    deviceId,
    ...ids,
  );
}

export function resetConversation(deviceId: string): void {
  db.prepare('DELETE FROM turns WHERE device_id = ?').run(deviceId);
  db.prepare('DELETE FROM summaries WHERE device_id = ?').run(deviceId);
}
