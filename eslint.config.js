// ESLint 9 flat config
// 규칙을 빡세게 잡지 않았습니다. 목적은 "코드 스타일 통일"과 "명백한 실수 잡기"까지.
// 개발 속도를 늦추는 규칙은 일부러 뺐어요.
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  ...expoConfig,
  prettierConfig, // Prettier와 겹치는 스타일 규칙을 끕니다

  {
    plugins: { prettier: prettierPlugin },
    rules: {
      // 포맷이 어긋나면 lint 에러로 잡힙니다 (npm run format 으로 자동 수정)
      'prettier/prettier': 'error',

      // console.log 는 개발 중에 필요하니 허용, 다만 남겨두면 경고
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // import 경로 검사는 끕니다.
      // 이 규칙들은 별도 resolver(네이티브 바이너리)에 의존하는데,
      //   1) tsconfig의 "@/*" 별칭을 못 읽어서 멀쩡한 import를 에러로 뱉고
      //   2) 설치 환경에 따라 resolver 자체가 깨집니다.
      // 존재하지 않는 import는 `npm run typecheck`가 이미 잡아주니 중복입니다.
      'import/no-unresolved': 'off',
      'import/no-duplicates': 'off',
      'import/namespace': 'off',
      'import/default': 'off',
      'import/export': 'off',
    },
  },

  {
    // TS 전용 규칙. @typescript-eslint 플러그인은 expoConfig가 ts/tsx에만 등록하므로
    // 여기서도 files를 맞춰줘야 "plugin을 찾을 수 없다" 에러가 안 납니다.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // 안 쓰는 변수는 경고. _ 로 시작하면 봐줍니다.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'expo-env.d.ts'],
  },
];
