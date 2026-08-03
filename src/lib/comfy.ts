/**
 * ComfyUI 호출.
 *
 * 화면이 없습니다 — 사진 한 장을 만들어 URL을 돌려주는 것까지가 전부입니다.
 * (게임 규칙이 lib/game.ts에, 프롬프트가 lib/photo-prompt.ts에 모여 있는 것과 같은 이유)
 *
 * ## 서버는 우리 것이 아닙니다
 *
 * 팀원 노트북에서 도는 ComfyUI에 그대로 붙습니다. 주소는 .env의
 * EXPO_PUBLIC_COMFY_URL 하나뿐이라, 나중에 Comfy Cloud로 옮기더라도
 * 이 파일은 안 건드리고 주소만 바꾸면 됩니다.
 *
 * ## 워크플로를 코드로 만들지 않습니다
 *
 * krea2_identity_edit.json은 ComfyUI에서 Export (API)로 뽑은 그대로입니다.
 * 우리는 그 안의 **세 곳만** 덮어씁니다(NODES 참고). 워크플로가 바뀌면
 * JSON을 새로 받아 덮어쓰고 NODES의 번호만 맞춰주세요 — 이 파일의 로직은
 * 그대로 둬도 됩니다.
 *
 * ## 주소가 http:// 라서 생기는 일 (안드로이드)
 *
 * 안드로이드 9부터 앱의 평문 http 통신을 기본으로 막습니다. 팀원 노트북에서
 * 도는 서버라 인증서를 붙일 수가 없어서 이 주소는 https가 될 수 없습니다.
 *
 * 그래서 app.json 에 usesCleartextTraffic 을 켜 뒀습니다(expo-build-properties).
 * **빌드할 때 정해지는 값**이라, 끄면 설치한 앱에서 사진 찍기가 통째로
 * 실패합니다 — 그때 나오는 건 "연결하지 못했어요" 한 줄뿐이라 원인을 찾기
 * 어렵습니다.
 *
 * 헷갈리기 쉬운 점: 브라우저와 Expo Go 는 이 정책 대상이 아닙니다. 폰에서
 * 주소가 열리고 Expo Go 로도 잘 되는데 **APK 에서만** 안 되면 이걸 의심하세요.
 */

import workflowTemplate from './krea2_identity_edit.json';
import { resolvePhoto } from '@/lib/image';

/**
 * 앱이 값을 밀어 넣는 노드 번호.
 *
 * krea2_identity_edit.json 안의 키입니다. 워크플로를 새로 받으면 번호가
 * 바뀔 수 있으니 여기부터 확인하세요. (JSON에서 class_type으로 찾으면 됩니다)
 */
const NODES = {
  /** LoadImage — 사용자가 올린 사진이 들어갑니다. */
  sourceImage: '72',
  /** Krea2EditGroundedEncode — 생성 프롬프트. 이 워크플로는 CLIPTextEncode가 아닙니다. */
  positive: '84',
  /** KSampler — seed를 매번 바꿔야 같은 그림이 반복되지 않습니다. */
  sampler: '53',
} as const;

/**
 * 결과를 기다리는 한도.
 *
 * 한 장에 걸리는 시간은 **서버 기계에 따라 크게 다릅니다.** 처음 잰 곳에서는
 * 3분 40초였는데(192.168.0.93, steps 10), 옮긴 뒤로는 8분쯤 걸립니다.
 *
 * 게다가 GPU가 하나라 **앞 작업이 끝나야 내 것이 시작됩니다.** 웹과 폰에서
 * 한 장씩 걸면 뒤엣것은 16분을 기다리게 됩니다. 10분이었을 때 실제로 여기서
 * 잘렸습니다 — 서버는 멀쩡히 그리고 있는데 앱만 포기한 상황이었습니다.
 *
 * 그래서 30분입니다. 서버가 죽었을 때 화면이 영영 도는 것을 막는다는 원래
 * 목적에는 이 정도로도 충분합니다.
 *
 * 실제로 재는 쪽은 lib/photo-job.tsx입니다. 이 파일은 값만 들고 있습니다.
 */
export const TIMEOUT_MS = 30 * 60 * 1000;
export const POLL_INTERVAL_MS = 1500;

/** 서버 주소가 없거나 응답이 이상할 때 화면에 그대로 보여줄 수 있는 에러. */
export class ComfyError extends Error {
  constructor(
    message: string,
    /** 사용자에게 보여줄 한 줄. 기술적인 원인은 message에 둡니다. */
    readonly hint: string,
  ) {
    super(message);
    this.name = 'ComfyError';
  }
}

/**
 * .env의 서버 주소. 끝의 슬래시는 떼어 둡니다.
 *
 * 주소를 안 정해둔 사람도 앱은 켜져야 하므로, 여기서 던지지 않고
 * 실제로 호출할 때 던집니다.
 */
function baseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_COMFY_URL?.trim();
  if (!raw) {
    throw new ComfyError(
      'EXPO_PUBLIC_COMFY_URL이 비어 있습니다',
      '사진 생성 서버 주소가 설정되지 않았어요. 팀에 문의해 주세요.',
    );
  }
  return raw.replace(/\/+$/, '');
}

/** ComfyUI가 살아 있는지 확인합니다. 화면에서 미리 눌러보게 할 때 씁니다. */
export async function ping(): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl()}/system_stats`);
    return res.ok;
  } catch {
    return false;
  }
}

/** ComfyUI가 /upload/image 에 돌려주는 것. */
type UploadResponse = { name?: string; subfolder?: string };

/** 서버에 닿지도 못한 경우. 주소·와이파이·서버 켜짐 중 하나입니다. */
function unreachable(where: string, cause: unknown): ComfyError {
  return new ComfyError(
    `${where} 요청이 서버에 닿지 못했습니다: ${cause}`,
    '사진 생성 서버에 닿지 못했어요. 같은 와이파이인지, 서버가 켜져 있는지 확인해 주세요.',
  );
}

/**
 * 폰에서 사진 파일을 올립니다.
 *
 * ## 왜 fetch + FormData 가 아닌가
 *
 * RN 의 전통적인 파일 업로드는 FormData 에 `{uri, name, type}` 객체를 얹는
 * 것이었습니다. **폰에서는 이제 안 됩니다.** 요청이 나가기도 전에 터집니다.
 *
 *     Error: Unsupported FormDataPart implementation
 *
 * Expo SDK 54부터 전역 fetch 가 표준(WinterCG) 구현으로 바뀌었는데, 그쪽은
 * FormData 항목을 문자열 · Blob · bytes() 를 가진 객체 셋만 받습니다.
 * RN 고유의 `{uri}` 객체는 어디에도 안 걸립니다.
 * (expo/src/winter/fetch/convertFormData.ts 에서 던집니다)
 *
 * 화면에는 "서버에 연결하지 못했어요"로 보여서, 한동안 방화벽과 네트워크를
 * 뒤졌습니다. 정작 네트워크는 멀쩡했습니다 — 에러를 로그에 안 남기고 있던
 * 것이 진짜 문제였습니다.
 *
 * expo-file-system 의 upload 는 파일을 **네이티브에서 직접** 멀티파트로
 * 올립니다. fetch 를 아예 거치지 않아서 이 문제가 없고, 사진 바이트가
 * 자바스크립트로 올라왔다 내려가지도 않습니다.
 */
async function uploadFromFile(photoUri: string): Promise<UploadResponse> {
  const { File, UploadType } = await import('expo-file-system');

  let result;
  try {
    result = await new File(photoUri).upload(`${baseUrl()}/upload/image`, {
      uploadType: UploadType.MULTIPART,
      // ComfyUI 가 파일을 찾는 필드 이름. 바꾸면 서버가 400을 줍니다.
      fieldName: 'image',
      mimeType: 'image/jpeg',
      // 같은 이름으로 계속 올려도 input 폴더가 안 불어나게.
      parameters: { overwrite: 'true' },
    });
  } catch (e) {
    throw unreachable('업로드', e);
  }

  if (result.status < 200 || result.status >= 300) {
    throw new ComfyError(
      `업로드 실패 (${result.status}) ${result.body}`.trim(),
      '사진을 서버에 올리지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
  }

  try {
    return JSON.parse(result.body) as UploadResponse;
  } catch {
    throw new ComfyError(
      `업로드 응답을 읽지 못했습니다: ${result.body}`,
      '사진 업로드 결과가 이상해요.',
    );
  }
}

/** 웹에서 사진 바이트를 꺼내 올립니다. */
async function uploadFromBlob(photoUri: string): Promise<UploadResponse> {
  // 탭을 새로고침했으면 blob이 이미 무효라 여기서 실패합니다.
  let blob: Blob;
  try {
    blob = await (await fetch(photoUri)).blob();
  } catch {
    throw new ComfyError(
      `사진을 읽지 못했습니다: ${photoUri}`,
      '올린 사진을 찾을 수 없어요. 사진을 다시 골라 주세요.',
    );
  }

  const form = new FormData();
  form.append('image', blob, 'source.jpg');
  // 같은 이름으로 계속 올리면 ComfyUI가 source (1).jpg 식으로 새 파일을
  // 만들고 input 폴더가 계속 불어납니다. 덮어쓰게 둡니다.
  form.append('overwrite', 'true');

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/upload/image`, { method: 'POST', body: form });
  } catch (e) {
    throw unreachable('업로드', e);
  }

  if (!res.ok) {
    throw new ComfyError(
      `업로드 실패 (${res.status})`,
      '사진을 서버에 올리지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
  }

  return (await res.json()) as UploadResponse;
}

/**
 * 사용자 사진을 ComfyUI의 input 폴더로 올리고 파일명을 받습니다.
 *
 * 웹과 폰은 올리는 방법이 다릅니다 — 웹의 photoUri는 blob: 이라 바이트를
 * 꺼내야 하고, 폰은 파일이라 네이티브가 직접 올립니다. 위 두 함수 참고.
 */
async function uploadImage(uri: string): Promise<string> {
  // 웹에서는 사진이 IndexedDB에 있고 저장된 값은 열쇠뿐입니다. 실제 주소로 바꿉니다.
  const photoUri = await resolvePhoto(uri);
  if (!photoUri) {
    throw new ComfyError(
      `사진을 찾지 못했습니다: ${uri}`,
      '올린 사진을 찾을 수 없어요. 사진을 다시 골라 주세요.',
    );
  }

  const isFile = photoUri.startsWith('file://') || photoUri.startsWith('content://');
  const data = isFile ? await uploadFromFile(photoUri) : await uploadFromBlob(photoUri);

  if (!data.name) {
    throw new ComfyError('업로드 응답에 name이 없습니다', '사진 업로드 결과가 이상해요.');
  }

  // subfolder가 있으면 LoadImage는 "sub/파일명" 형태로 받습니다.
  return data.subfolder ? `${data.subfolder}/${data.name}` : data.name;
}

/**
 * 워크플로 JSON에 이번 생성에 쓸 값을 넣은 사본을 만듭니다.
 *
 * 원본(import한 객체)은 앱이 사는 동안 계속 재사용되므로 절대 건드리면 안 됩니다.
 * 한 번 덮어쓰면 다음 생성에도 그 값이 남습니다.
 */
function buildWorkflow(imageName: string, prompt: string): Record<string, unknown> {
  const workflow = JSON.parse(JSON.stringify(workflowTemplate)) as Record<
    string,
    { inputs: Record<string, unknown> } | undefined
  >;

  const source = workflow[NODES.sourceImage];
  const positive = workflow[NODES.positive];
  const sampler = workflow[NODES.sampler];

  if (!source || !positive || !sampler) {
    // 워크플로를 새로 받았는데 NODES를 안 고친 상황입니다.
    throw new ComfyError(
      `워크플로에 노드가 없습니다 (${NODES.sourceImage}/${NODES.positive}/${NODES.sampler})`,
      '사진 생성 설정이 맞지 않아요. 개발자에게 알려 주세요.',
    );
  }

  source.inputs.image = imageName;
  positive.inputs.prompt = prompt;
  // seed를 그대로 두면 같은 사진·같은 프롬프트에서 늘 같은 그림이 나옵니다.
  sampler.inputs.seed = Math.floor(Math.random() * 1_000_000_000_000_000);

  return workflow as Record<string, unknown>;
}

/** 완료된 history 항목에서 결과 이미지 하나를 골라 URL로 만듭니다. */
function firstImageUrl(outputs: Record<string, { images?: ComfyImage[] }>): string | null {
  for (const node of Object.values(outputs)) {
    // temp는 미리보기용 중간 산출물이라 건너뜁니다.
    const image = node.images?.find((i) => i.type !== 'temp') ?? node.images?.[0];
    if (!image) continue;

    const query = new URLSearchParams({
      filename: image.filename,
      subfolder: image.subfolder ?? '',
      type: image.type ?? 'output',
    });
    return `${baseUrl()}/view?${query.toString()}`;
  }
  return null;
}

type ComfyImage = { filename: string; subfolder?: string; type?: string };

type HistoryEntry = {
  outputs?: Record<string, { images?: ComfyImage[] }>;
  status?: { completed?: boolean; status_str?: string };
};

/**
 * 작업 하나를 큐에 넣습니다.
 *
 * **결과를 기다리지 않고** 접수증(prompt_id)만 돌려줍니다. 기다리는 일은
 * lib/photo-job.tsx가 화면 밖에서 합니다 — 그래야 사용자가 다른 화면으로
 * 가도, 새로고침을 해도 생성이 이어집니다.
 *
 * prompt_id는 저장해 두면 나중에 checkResult()로 결과를 되찾을 수 있습니다.
 * ComfyUI가 히스토리를 들고 있어서, 앱이 잠시 안 보고 있어도 괜찮습니다.
 */
export async function submit(photoUri: string, prompt: string): Promise<string> {
  const imageName = await uploadImage(photoUri);
  const workflow = buildWorkflow(imageName, prompt);

  const res = await fetch(`${baseUrl()}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!res.ok) {
    // 400이면 대개 워크플로가 서버와 안 맞는 것입니다(커스텀 노드 미설치 등).
    // 응답 본문에 어느 노드가 문제인지 들어 있어 그대로 남깁니다.
    const detail = await res.text().catch(() => '');
    throw new ComfyError(
      `작업 등록 실패 (${res.status}) ${detail}`.trim(),
      res.status === 400
        ? '워크플로가 서버와 맞지 않아요. 노드 설치 상태를 확인해 주세요.'
        : '사진 생성 서버에 연결하지 못했어요.',
    );
  }

  const { prompt_id: promptId } = (await res.json()) as { prompt_id?: string };
  if (!promptId) {
    throw new ComfyError('prompt_id가 없습니다', '사진 생성 요청 결과가 이상해요.');
  }

  return promptId;
}

/** checkResult()의 답. 아직이면 pending입니다. */
export type CheckResult =
  { state: 'pending' } | { state: 'done'; url: string } | { state: 'error'; hint: string };

/**
 * 접수증으로 결과를 한 번 확인합니다.
 *
 * 던지지 않습니다 — 폴링 중 한 번 실패하는 것(와이파이가 잠깐 끊기는 등)은
 * 흔한 일이라, 그걸로 작업 전체를 실패시키면 안 됩니다. 확인이 안 되면
 * pending으로 두고 다음 차례에 다시 물어봅니다.
 */
export async function checkResult(promptId: string): Promise<CheckResult> {
  let entry: HistoryEntry | undefined;

  try {
    const res = await fetch(`${baseUrl()}/history/${promptId}`);
    if (!res.ok) return { state: 'pending' };
    entry = ((await res.json()) as Record<string, HistoryEntry>)[promptId];
  } catch {
    return { state: 'pending' };
  }

  if (entry?.status?.status_str === 'error') {
    return { state: 'error', hint: '사진을 만드는 중에 서버에서 문제가 생겼어요.' };
  }

  // outputs가 생겼으면 끝난 것입니다.
  if (entry?.outputs) {
    const url = firstImageUrl(entry.outputs);
    if (url) return { state: 'done', url };
  }

  return { state: 'pending' };
}

/**
 * 큐에 넣은 작업을 실제로 취소합니다.
 *
 * 두 곳에 요청해야 합니다. 아직 차례가 안 온 작업은 큐에서 빼면 되지만
 * (`/queue`의 delete), **이미 그리고 있는 작업은 큐에 없어서** 따로
 * 중단시켜야 합니다(`/interrupt`).
 *
 * ⚠️ /interrupt는 **지금 그리는 것**을 멈춥니다. 우리 작업이 아니라 다른
 * 사람이 돌리는 작업이 실행 중이면 그걸 끊게 됩니다. 이 프로젝트는 팀
 * 노트북 한 대를 같이 쓰는 상황이라, 취소는 사용자가 직접 누를 때만
 * 불러야 합니다.
 *
 * 실패해도 던지지 않습니다 — 취소가 안 되더라도 앱은 그 결과를 안 받으면
 * 그만이라, 사용자에게 에러를 보여줄 만한 일이 아닙니다.
 */
export async function cancel(promptId: string): Promise<void> {
  const base = (() => {
    try {
      return baseUrl();
    } catch {
      return null;
    }
  })();
  if (!base) return;

  await Promise.allSettled([
    fetch(`${base}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delete: [promptId] }),
    }),
    fetch(`${base}/interrupt`, { method: 'POST' }),
  ]);
}
