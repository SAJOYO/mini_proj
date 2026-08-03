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

import type { BreedId } from '@/constants/pet';
import {
  advance,
  applyCare,
  applyPat,
  createPet,
  forceDeparture,
  forceWish,
  normalizePet,
  rewindToBaby,
  setStats,
  skipToNextStage,
  type CareActionId,
  type CareResult,
  type Pet,
} from '@/lib/game';
import { clearPet, loadPet, savePet } from '@/lib/storage';

/**
 * 키우는 캐릭터의 상태를 앱 전체에서 공유합니다.
 *
 * 게임 규칙 계산은 전부 lib/game.ts의 순수 함수가 하고, 이 파일은
 *   (1) 저장소에서 읽고 쓰기
 *   (2) 시간이 흐르면 스탯 깎기
 * 두 가지만 담당합니다. 화면에서는 `usePet()`으로 꺼내 쓰세요.
 */

/**
 * 스탯 감소를 화면에 반영하는 주기. 짧을수록 게이지가 부드럽게 줄어듭니다.
 *
 * 실제 감소량은 "흐른 시간"으로 계산하니 이 값이 게임 밸런스를 바꾸지는 않습니다.
 * 화면이 얼마나 자주 갱신되는지만 정합니다.
 */
const TICK_MS = 5_000;

type PetContextValue = {
  pet: Pet | null;
  /** 저장소에서 읽어오는 중이면 true. */
  isLoading: boolean;
  /** 품종과 사진으로 캐릭터를 새로 만듭니다. */
  hatch: (breed: BreedId, photoUri: string | null) => Promise<Pet>;
  /** 돌봄 액션 하나를 실행하고 결과(반응 메시지·성장 여부)를 돌려줍니다. */
  care: (actionId: CareActionId) => Promise<CareResult | null>;
  /** 쓰다듬기(아바타 누르기). 행복이 조금 오릅니다. */
  pat: () => Promise<CareResult | null>;
  /** 캐릭터를 지웁니다(처음부터 다시 키우기). */
  release: () => Promise<void>;
  /** 발표 시연용. 다음 단계로 즉시 넘깁니다. */
  skipStage: () => Promise<void>;
  /** 발표 시연용. 영유아기로 되돌립니다(함께한 기록은 남습니다). */
  rewind: () => Promise<void>;
  /** 발표 시연용. 스탯을 원하는 값으로 맞춥니다(0으로 방치 상태 확인). */
  forceStats: (value: number) => Promise<void>;
  /** 발표 시연용. 유예 시간을 기다리지 않고 바로 여행을 떠나게 합니다. */
  forceDepart: () => Promise<void>;
  /** 발표 시연용. 고른 돌봄을 바라는 상태로 즉시 만듭니다. */
  forceWish: (actionId: CareActionId) => Promise<void>;
};

const PetContext = createContext<PetContextValue | null>(null);

export function PetProvider({ children }: { children: ReactNode }) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 콜백들이 최신 pet을 보게 하려고 ref에도 같이 들고 있습니다.
  // (setPet 콜백 안에서 비동기 저장을 하면 순서가 꼬이기 쉬워서
  //  "계산 → 저장 → setState"를 명시적으로 순서대로 합니다.)
  const petRef = useRef<Pet | null>(null);

  const commit = useCallback(async (next: Pet) => {
    petRef.current = next;
    setPet(next);
    await savePet(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadPet<Pet>()
      .then((stored) => {
        if (cancelled || !stored) return;
        // 예전 버전에서 저장된 캐릭터에는 새 필드가 없어서 먼저 기본값을 채웁니다.
        // 앱을 껐던 사이에 흐른 시간도 한 번에 반영합니다(스탯 감소 + 엔딩 확정).
        const caught = advance(normalizePet(stored));
        petRef.current = caught;
        setPet(caught);
        void savePet(caught);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 앱이 열려 있는 동안 주기적으로 스탯을 깎습니다.
  useEffect(() => {
    const timer = setInterval(() => {
      const current = petRef.current;
      if (!current) return;

      const next = advance(current);
      petRef.current = next;
      setPet(next);
      void savePet(next);
    }, TICK_MS);

    return () => clearInterval(timer);
  }, []);

  const hatch = useCallback(
    async (breed: BreedId, photoUri: string | null) => {
      const next = createPet(breed, photoUri);
      await commit(next);
      return next;
    },
    [commit],
  );

  const care = useCallback(
    async (actionId: CareActionId) => {
      const current = petRef.current;
      if (!current) return null;

      const result = applyCare(current, actionId);
      await commit(result.pet);
      return result;
    },
    [commit],
  );

  const pat = useCallback(async () => {
    const current = petRef.current;
    if (!current) return null;

    const result = applyPat(current);
    await commit(result.pet);
    return result;
  }, [commit]);

  const release = useCallback(async () => {
    petRef.current = null;
    setPet(null);
    await clearPet();
  }, []);

  const skipStage = useCallback(async () => {
    const current = petRef.current;
    if (!current) return;
    // 노년기로 건너뛴 경우 바로 엔딩이 확정되도록 advance를 거칩니다.
    await commit(advance(skipToNextStage(current)));
  }, [commit]);

  const rewind = useCallback(async () => {
    const current = petRef.current;
    if (!current) return;
    await commit(rewindToBaby(current));
  }, [commit]);

  const forceStats = useCallback(
    async (value: number) => {
      const current = petRef.current;
      if (!current) return;
      // 스탯만 바꾸고 시간 경과는 건드리지 않습니다(setStats가 lastTickAt을 맞춰줍니다).
      await commit(setStats(current, value));
    },
    [commit],
  );

  const forceDepart = useCallback(async () => {
    const current = petRef.current;
    if (!current) return;
    await commit(forceDeparture(current));
  }, [commit]);

  const forceWishNow = useCallback(
    async (actionId: CareActionId) => {
      const current = petRef.current;
      if (!current) return;
      await commit(forceWish(current, actionId));
    },
    [commit],
  );

  const value = useMemo(
    () => ({
      pet,
      isLoading,
      hatch,
      care,
      pat,
      release,
      skipStage,
      rewind,
      forceStats,
      forceDepart,
      forceWish: forceWishNow,
    }),
    [
      pet,
      isLoading,
      hatch,
      care,
      pat,
      release,
      skipStage,
      rewind,
      forceStats,
      forceDepart,
      forceWishNow,
    ],
  );

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>;
}

export function usePet(): PetContextValue {
  const ctx = useContext(PetContext);
  if (!ctx) throw new Error('usePet()은 <PetProvider> 안에서만 쓸 수 있습니다.');
  return ctx;
}
