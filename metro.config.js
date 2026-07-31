// expo-sqlite 웹 지원에 필요한 Metro 설정 (대화 기록 영속화, lib/chat-history.ts).
//
// 웹에서 SQLite 는 wasm(wa-sqlite)으로 돕니다. 기본 Metro 는 .wasm 을 몰라서
// "Unable to resolve ./wa-sqlite/wa-sqlite.wasm" 으로 죽습니다 — 에셋으로 등록합니다.
//
// COEP/COOP 헤더는 SharedArrayBuffer 조건입니다. wasm SQLite 가 OPFS 에 쓸 때
// 필요합니다. 'credentialless' 라 외부 API 호출(Gemini·HF)에는 영향이 없습니다.
// 이 파일이 없어도 네이티브(iOS/Android)는 잘 돕니다 — 순수하게 웹 전용입니다.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
