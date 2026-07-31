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

import { fetchBlob, savePhoto } from '@/lib/album';
import { checkResult, ComfyError, POLL_INTERVAL_MS, submit, TIMEOUT_MS } from '@/lib/comfy';
import { clearPhotoJob, loadPhotoJob, savePhotoJob } from '@/lib/storage';

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

export type PhotoJobState = {
  /** 어떤 사진에 대한 작업인지 (품종:단계). 없으면 진행 중인 작업이 없습니다. */
  key: string | null;
  status: JobStatus;
  /** 사용자에게 보여줄 실패 사유. status가 error일 때만 채워집니다. */
  error: string | null;
  /**
   * 완료됐는데 아직 사용자가 확인하지 않은 사진의 키.
   *
   * 게임 화면의 배지가 이걸 봅니다. 사진 화면이 열리면 seen()으로 지웁니다.
   */
  unseen: string | null;
};

type PhotoJobValue = PhotoJobState & {
  /** 사진 한 장을 주문합니다. 결과를 기다리지 않고 바로 돌아옵니다. */
  start: (input: { key: string; photoUri: string; prompt: string }) => Promise<void>;
  /** 완성 배지를 지웁니다. */
  seen: () => void;
  /** 진행 중인 작업을 버립니다(서버는 계속 그리지만 결과를 받지 않습니다). */
  cancel: () => void;
};

const PhotoJobContext = createContext<PhotoJobValue | null>(null);

const IDLE: PhotoJobState = { key: null, status: 'idle', error: null, unseen: null };

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
   * 결과가 나오면 받아서 보관함에 넣는 것까지 여기서 합니다 — 화면이 떠
   * 있든 말든 사진이 남아야 하니까요.
   */
  const follow = useCallback(async (key: string, promptId: string, startedAt: number) => {
    let cancelled = false;
    stop.current = () => {
      cancelled = true;
    };

    setState({ key, status: 'waiting', error: null, unseen: null });

    while (!cancelled) {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        await clearPhotoJob();
        if (!cancelled) {
          setState({
            key,
            status: 'error',
            error: '사진 만들기가 너무 오래 걸려요. 서버 상태를 확인해 주세요.',
            unseen: null,
          });
        }
        return;
      }

      const result = await checkResult(promptId);
      if (cancelled) return;

      if (result.state === 'error') {
        await clearPhotoJob();
        if (!cancelled) setState({ key, status: 'error', error: result.hint, unseen: null });
        return;
      }

      if (result.state === 'done') {
        setState({ key, status: 'saving', error: null, unseen: null });

        // 서버 URL을 그대로 두지 않고 받아 옵니다. 그래야 생성 서버가 꺼져도,
        // 와이파이를 벗어나도 사진이 남습니다.
        const blob = await fetchBlob(result.url);
        if (cancelled) return;

        if (blob) await savePhoto(key, blob);
        await clearPhotoJob();

        if (!cancelled) {
          setState({
            key,
            status: 'done',
            // 받아오지 못했으면 보관도 안 된 상태입니다. 사진 화면이 서버
            // 주소로라도 보여줄 수 있게 실패를 숨기지 않습니다.
            error: blob ? null : '사진을 보관하지 못했어요. 서버를 끄면 사라집니다.',
            unseen: key,
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
      void follow(job.key, job.promptId, job.startedAt);
    });

    return () => stop.current?.();
  }, [follow]);

  const start = useCallback(
    async ({ key, photoUri, prompt }: { key: string; photoUri: string; prompt: string }) => {
      stop.current?.();
      setState({ key, status: 'uploading', error: null, unseen: null });

      try {
        const promptId = await submit(photoUri, prompt);
        const startedAt = Date.now();
        await savePhotoJob({ key, promptId, startedAt });
        void follow(key, promptId, startedAt);
      } catch (e) {
        setState({
          key,
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

  const cancel = useCallback(() => {
    stop.current?.();
    void clearPhotoJob();
    setState(IDLE);
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

/** 지금 이 사진이 만들어지는 중인지. 화면에서 자주 물어보는 질문이라 함수로 둡니다. */
export function isRunning(state: PhotoJobState, key: string): boolean {
  return state.key === key && ['uploading', 'waiting', 'saving'].includes(state.status);
}
