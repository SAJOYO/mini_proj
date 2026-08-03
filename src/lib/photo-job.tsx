import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { addPhotoFromUrl } from '@/lib/album';
import {
  cancel as cancelOnServer,
  checkResult,
  ComfyError,
  POLL_INTERVAL_MS,
  submit,
  TIMEOUT_MS,
} from '@/lib/comfy';
import { clearPhotoJob, loadPhotoJob, savePhotoJob, type PhotoJob } from '@/lib/storage';

/**
 * 진행 중인 사진 생성 작업을 앱 전체에서 공유합니다.
 *
 * ## 왜 화면이 아니라 여기 있는가
 *
 * 한 장에 3분 40초가 걸립니다. 이 상태가 사진 화면 안에 있으면 사용자가
 * 그 화면에 붙잡혀 있어야 하고, 벗어나는 순간 진행 상황이 사라집니다.
 * (GPU는 계속 도는데 결과를 아무도 안 받는 상황이 됩니다)
 *
 * 그래서 lib/pet.tsx가 캐릭터 상태에 하는 것과 같은 방식으로, 폴링을
 * 화면 밖으로 뺐습니다. 이제 게임을 하다가 완성 배지를 볼 수 있습니다.
 *
 * ## 한 번에 한 장만 만듭니다
 *
 * 서버의 GPU가 하나라 작업은 어차피 줄을 서서 처리됩니다. 여러 장을 동시에
 * 밀어넣을 수 있게 해도 빨라지지 않고, 어느 것이 어디까지 갔는지만 복잡해져서
 * 진행 중인 작업은 하나로 제한합니다. 대신 **만들 수 있는 장수에는 제한이
 * 없습니다** — 끝나면 다음 장을 시작하면 되고, 전부 앨범에 쌓입니다.
 *
 * ## 웹소켓을 쓰지 않습니다
 *
 * ComfyUI에 /ws가 있지만 그걸로 얻는 건 사실상 진행률뿐입니다. 3분 40초짜리
 * 작업에서 완료 감지가 1.5초 늦는 건 문제가 되지 않아서, 재연결과 client_id
 * 관리를 떠안는 대신 폴링을 그대로 씁니다. 진행률 막대가 필요해지면 그때
 * 이 파일에 값 하나를 더 채우면 됩니다.
 *
 * ## 한계
 *
 * 탭을 닫으면 폴링이 멈춥니다. 접수증을 저장해둬서 다시 열면 이어받지만,
 * **모바일 브라우저는 탭을 백그라운드로 보내면 타이머를 늦추거나 멈춥니다.**
 * 폰에서 다른 앱을 켜고 기다리는 시나리오는 기대하면 안 됩니다.
 */

export type JobStatus = 'idle' | 'uploading' | 'waiting' | 'saving' | 'done' | 'error';

/** 사진 한 장을 주문할 때 필요한 것. */
export type PhotoOrder = {
  breed: string;
  stage: string;
  caption: string;
  /** 사용자가 올린 원본 사진의 로컬 URI. */
  photoUri: string;
  /** 생성 프롬프트 (lib/photo-prompt.ts). */
  prompt: string;
};

export type PhotoJobState = {
  /**
   * 지금 만들고 있는 사진의 성장 단계. 없으면 진행 중인 작업이 없습니다.
   *
   * 단계로 잡아두는 이유는 화면이 "이 단계 사진을 만드는 중인가?"를 물어보기
   * 때문입니다. 어느 장인지까지는 구분하지 않아도 됩니다 — 어차피 한 번에
   * 하나만 돕니다.
   */
  stage: string | null;
  status: JobStatus;
  /** 사용자에게 보여줄 실패 사유. status가 error일 때만 채워집니다. */
  error: string | null;
  /**
   * 완성됐는데 아직 사용자가 확인하지 않은 사진의 단계.
   *
   * 게임 화면의 배지가 이걸 봅니다. 사진 화면이 열리면 seen()으로 지웁니다.
   */
  unseen: string | null;
};

type PhotoJobValue = PhotoJobState & {
  /** 사진 한 장을 주문합니다. 결과를 기다리지 않고 바로 돌아옵니다. */
  start: (order: PhotoOrder) => Promise<void>;
  /** 완성 배지를 지웁니다. */
  seen: () => void;
  /** 진행 중인 작업을 취소합니다. 서버에서 그리던 것도 멈춥니다. */
  cancel: () => Promise<void>;
};

const PhotoJobContext = createContext<PhotoJobValue | null>(null);

const IDLE: PhotoJobState = { stage: null, status: 'idle', error: null, unseen: null };

export function PhotoJobProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PhotoJobState>(IDLE);

  /**
   * 지금 돌고 있는 폴링을 멈추는 손잡이.
   *
   * 새 작업을 시작하거나 앱이 내려갈 때 이전 폴링이 남아 있으면, 끝난 작업의
   * 결과가 뒤늦게 도착해 새 작업 상태를 덮어씁니다.
   */
  const stop = useRef<(() => void) | null>(null);

  /**
   * 접수증 하나를 끝까지 따라갑니다.
   *
   * 결과가 나오면 받아서 앨범에 넣는 것까지 여기서 합니다 — 화면이 떠
   * 있든 말든 사진이 남아야 하니까요.
   */
  const follow = useCallback(async (job: PhotoJob) => {
    const { stage, promptId, startedAt } = job;

    let cancelled = false;
    stop.current = () => {
      cancelled = true;
    };

    setState({ stage, status: 'waiting', error: null, unseen: null });

    const fail = async (error: string) => {
      await clearPhotoJob();
      if (!cancelled) setState({ stage, status: 'error', error, unseen: null });
    };

    while (!cancelled) {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        await fail('사진 만들기가 너무 오래 걸려요. 서버 상태를 확인해 주세요.');
        return;
      }

      const result = await checkResult(promptId);
      if (cancelled) return;

      if (result.state === 'error') {
        await fail(result.hint);
        return;
      }

      if (result.state === 'done') {
        setState({ stage, status: 'saving', error: null, unseen: null });

        // 서버 URL을 그대로 두지 않고 받아 옵니다. 그래야 생성 서버가 꺼져도,
        // 와이파이를 벗어나도 사진이 남습니다.
        // (웹이면 IndexedDB, 폰이면 파일로 — 갈리는 건 lib/album.ts 안에서만)
        const entry = await addPhotoFromUrl(result.url, {
          breed: job.breed,
          stage,
          caption: job.caption,
        });
        if (cancelled) return;

        await clearPhotoJob();

        if (!cancelled) {
          setState({
            stage,
            status: 'done',
            // 앨범에 넣지 못했으면 숨기지 않습니다. 사용자가 "만들었는데
            // 왜 앨범에 없지?"로 헤매는 것보다 낫습니다.
            error: entry ? null : '사진을 앨범에 넣지 못했어요. 다시 만들어 주세요.',
            unseen: entry ? stage : null,
          });
        }
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }, []);

  /**
   * 앱이 켜질 때 남아 있는 접수증이 있으면 이어받습니다.
   *
   * 생성 중에 새로고침한 경우입니다. ComfyUI가 히스토리를 들고 있어서,
   * 그 사이에 완성됐더라도 결과를 그대로 받아올 수 있습니다.
   */
  useEffect(() => {
    loadPhotoJob().then((job) => {
      if (!job) return;
      if (Date.now() - job.startedAt > TIMEOUT_MS) {
        // 너무 오래된 접수증입니다. 붙잡고 있어봐야 결과가 없습니다.
        void clearPhotoJob();
        return;
      }
      void follow(job);
    });

    return () => stop.current?.();
  }, [follow]);

  const start = useCallback(
    async ({ breed, stage, caption, photoUri, prompt }: PhotoOrder) => {
      stop.current?.();
      setState({ stage, status: 'uploading', error: null, unseen: null });

      try {
        const promptId = await submit(photoUri, prompt);
        const job: PhotoJob = { breed, stage, caption, promptId, startedAt: Date.now() };
        await savePhotoJob(job);
        void follow(job);
      } catch (e) {
        // 원본은 화면에 뿌리지 않되 버리지도 않습니다. 화면에 남는 건
        // "연결하지 못했어요" 한 줄뿐이라, 이게 없으면 무엇이 어디서 터졌는지
        // 알 방법이 없습니다 — 폰에서만 나는 문제를 쫓느라 실제로 헤맸습니다.
        // (대화 화면도 같은 이유로 console.warn 을 남깁니다)
        console.warn('[photo-job] 시작 실패:', e);

        setState({
          stage,
          status: 'error',
          error:
            e instanceof ComfyError
              ? e.hint
              : '사진 생성 서버에 연결하지 못했어요. 서버가 켜져 있는지 확인해 주세요.',
          unseen: null,
        });
      }
    },
    [follow],
  );

  const seen = useCallback(() => {
    setState((prev) => (prev.unseen ? { ...prev, unseen: null } : prev));
  }, []);

  /**
   * 진행 중인 작업을 취소합니다.
   *
   * 폴링만 멈추면 GPU는 3분 40초를 마저 씁니다. 그동안 다음 사진을 시작할
   * 수도 없으니, 서버 쪽 작업도 같이 끊어줘야 취소가 취소다워집니다.
   */
  const cancel = useCallback(async () => {
    stop.current?.();
    setState(IDLE);

    const job = await loadPhotoJob();
    await clearPhotoJob();
    if (job) await cancelOnServer(job.promptId);
  }, []);

  const value = useMemo<PhotoJobValue>(
    () => ({ ...state, start, seen, cancel }),
    [state, start, seen, cancel],
  );

  return <PhotoJobContext.Provider value={value}>{children}</PhotoJobContext.Provider>;
}

export function usePhotoJob(): PhotoJobValue {
  const value = useContext(PhotoJobContext);
  if (!value) throw new Error('usePhotoJob은 PhotoJobProvider 안에서만 쓸 수 있습니다');
  return value;
}

/** 만들고 있는 사진이 있는지. 단계를 주면 그 단계인지까지 봅니다. */
export function isRunning(state: PhotoJobState, stage?: string): boolean {
  if (!['uploading', 'waiting', 'saving'].includes(state.status)) return false;
  return stage === undefined || state.stage === stage;
}
