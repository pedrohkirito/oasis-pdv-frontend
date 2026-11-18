import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { api, type AuthChangeEvent, type Session, type User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    let isMounted = true;

    const applyAuthState = (nextSession: Session | null, event?: AuthChangeEvent) => {
      if (!isMounted) return;

      const nextUser = nextSession?.user ?? null;
      const currentUser = userRef.current;
      const currentSession = sessionRef.current;
      const isSameUser = currentUser?.id != null && currentUser.id === nextUser?.id;
      const isSilentRestoreEvent = event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION';

      if (isSilentRestoreEvent && isSameUser) {
        setLoading(false);
        return;
      }

      setSession(() => {
        if (currentSession?.user?.id === nextUser?.id && currentSession?.access_token === nextSession?.access_token) {
          return currentSession;
        }

        return nextSession;
      });

      setUser(() => {
        if (currentUser?.id === nextUser?.id) {
          return currentUser;
        }

        return nextUser;
      });

      setLoading(false);
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = api.auth.onAuthStateChange(
      (event, session) => {
        applyAuthState(session, event);
      }
    );

    // THEN check for existing session (handles initial load / token restore)
    api.auth.getSession().then(({ data: { session } }) => {
      applyAuthState(session, 'INITIAL_SESSION');
    }).catch((error) => {
      console.error('Error getting session:', error);
      if (isMounted) setLoading(false);
    });

    // Safety timeout: never leave the app stuck on the loading screen.
    // Se a API não responder em 8s, libera a tela de login.
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('[Auth] Safety timeout reached — forcing loading=false');
        setLoading(false);
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await api.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await api.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signOut = async () => {
    await api.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
