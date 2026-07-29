import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { clearUser, loadUser, saveUser, type User } from '@/lib/storage';

/**
 * 로그인 상태를 앱 전체에서 공유합니다.
 *
 * 서버 인증이 아니라 "이 기기에 닉네임이 저장돼 있냐"가 전부입니다.
 * 화면에서는 `useAuth()`로 꺼내 쓰세요.
 */

type AuthContextValue = {
  user: User | null;
  /** 저장소에서 읽어오는 중이면 true. 이 동안 로딩 화면을 보여줍니다. */
  isLoading: boolean;
  signIn: (nickname: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadUser()
      .then((stored) => {
        if (!cancelled) setUser(stored);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (nickname: string) => {
    const next: User = { nickname: nickname.trim(), createdAt: new Date().toISOString() };
    await saveUser(next);
    setUser(next);
  }, []);

  const signOut = useCallback(async () => {
    await clearUser();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, signIn, signOut }),
    [user, isLoading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth()는 <AuthProvider> 안에서만 쓸 수 있습니다.');
  return ctx;
}
