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
 */

import workflowTemplate from './krea2_identity_edit.json';

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
 * 실측으로 한 장에 **약 3분 40초**가 걸렸습니다(192.168.0.93, steps 10).
 * 앞에 대기 중인 작업이 있으면 그만큼 더 걸리므로 넉넉히 잡되, 무한정
 * 기다리지는 않게 해서 서버가 죽었을 때 화면이 영영 도는 것을 막습니다.
 */
const TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 1500;

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

/**
 * 사용자 사진을 ComfyUI의 input 폴더로 올리고 파일명을 받습니다.
 *
 * 웹과 네이티브의 처리가 다릅니다. 웹의 photoUri는 blob: URI라 파일 객체를
 * 꺼내야 하고(fetch로 한 번 읽습니다), 네이티브는 file:// 경로를 그대로
 * FormData에 얹으면 런타임이 알아서 읽어줍니다.
 */
async function uploadImage(photoUri: string): Promise<string> {
  const form = new FormData();

  if (photoUri.startsWith('file://') || photoUri.startsWith('content://')) {
    // 네이티브 — RN의 FormData는 이 모양의 객체를 파일로 취급합니다.
    // 표준 FormData 타입에는 없는 형태라 타입을 한 번 눌러줍니다.
    form.append('image', {
      uri: photoUri,
      name: 'source.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  } else {
    // 웹(blob:) 또는 data: — 실제 바이트를 꺼내서 올립니다.
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
    form.append('image', blob, 'source.jpg');
  }

  // 같은 이름으로 계속 올리면 ComfyUI가 source (1).jpg 식으로 새 파일을
  // 만들고 input 폴더가 계속 불어납니다. 덮어쓰게 둡니다.
  form.append('overwrite', 'true');

  const res = await fetch(`${baseUrl()}/upload/image`, { method: 'POST', body: form });
  if (!res.ok) {
    throw new ComfyError(
      `업로드 실패 (${res.status})`,
      '사진을 서버에 올리지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
  }

  const data = (await res.json()) as { name?: string; subfolder?: string };
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
 * 큐에 넣은 작업이 끝날 때까지 기다립니다.
 *
 * 웹소켓 대신 폴링을 씁니다 — 진행률을 실시간으로 보여주지 않아도 되는
 * 화면이라, 연결이 끊겼을 때 복구가 필요 없는 쪽이 훨씬 단순합니다.
 */
async function waitForResult(promptId: string, signal?: AbortSignal): Promise<string> {
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (signal?.aborted) throw new ComfyError('사용자가 취소했습니다', '사진 만들기를 멈췄어요.');

    const res = await fetch(`${baseUrl()}/history/${promptId}`);
    if (res.ok) {
      const history = (await res.json()) as Record<string, HistoryEntry>;
      const entry = history[promptId];

      if (entry?.status?.status_str === 'error') {
        throw new ComfyError(
          `워크플로 실행 실패 (${promptId})`,
          '사진을 만드는 중에 서버에서 문제가 생겼어요.',
        );
      }

      // outputs가 생겼으면 끝난 것입니다.
      if (entry?.outputs) {
        const url = firstImageUrl(entry.outputs);
        if (url) return url;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new ComfyError(
    `시간 초과 (${TIMEOUT_MS}ms)`,
    '사진 만들기가 너무 오래 걸려요. 서버 상태를 확인해 주세요.',
  );
}

/** generate()가 알려주는 진행 단계. 화면의 안내 문구를 바꾸는 데 씁니다. */
export type GenerateStep = 'uploading' | 'queued' | 'generating';

export type GenerateOptions = {
  /** 사용자가 올린 원본 사진의 로컬 URI. */
  photoUri: string;
  /** 생성 프롬프트. 영문입니다 — lib/photo-prompt.ts 참고. */
  prompt: string;
  onStep?: (step: GenerateStep) => void;
  signal?: AbortSignal;
};

/**
 * 사진 한 장을 만듭니다.
 *
 * 돌려주는 것은 ComfyUI의 /view URL입니다. `<Image source={{ uri }}>`에 그대로
 * 넣으면 보입니다. 다만 **그 서버가 켜져 있는 동안만 유효한 주소**라,
 * 오래 남겨야 하는 사진이면 화면 쪽에서 따로 받아 두어야 합니다.
 */
export async function generate({
  photoUri,
  prompt,
  onStep,
  signal,
}: GenerateOptions): Promise<string> {
  onStep?.('uploading');
  const imageName = await uploadImage(photoUri);

  onStep?.('queued');
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

  onStep?.('generating');
  return waitForResult(promptId, signal);
}
