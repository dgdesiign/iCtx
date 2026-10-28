import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Inicializa Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Escopos do Google Workspace: Google Sheets e Google Drive File
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

const SESSION_KEY = 'ictx_google_token';

interface StoredSession {
  accessToken: string;
  expiresAt: number;
}

/**
 * Inicializa ouvinte de estado de autenticação.
 * Restaura o token de acesso do sessionStorage se expiresAt > agora + 60s.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      let token = cachedAccessToken;
      if (!token) {
        try {
          const raw = sessionStorage.getItem(SESSION_KEY);
          if (raw) {
            const parsed: StoredSession = JSON.parse(raw);
            const agora = Date.now();
            if (parsed.accessToken && parsed.expiresAt > agora + 60 * 1000) {
              token = parsed.accessToken;
              cachedAccessToken = token;
            } else {
              sessionStorage.removeItem(SESSION_KEY);
            }
          }
        } catch {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }

      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else {
        if (!isSigningIn && onAuthFailure) {
          onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {}
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Dispara popup oficial do Google para login e autorização das Planilhas.
 * Grava { accessToken, expiresAt = agora + 55 min } em sessionStorage.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso do Google.');
    }

    cachedAccessToken = credential.accessToken;
    const expiresAt = Date.now() + 55 * 60 * 1000;
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ accessToken: cachedAccessToken, expiresAt })
      );
    } catch (e) {
      console.warn('Não foi possível gravar no sessionStorage:', e);
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro na autenticação com o Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retorna o token de acesso ativo (em memória ou restaurado de sessionStorage se não expirado)
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed: StoredSession = JSON.parse(raw);
        if (parsed.expiresAt <= Date.now() + 60 * 1000) {
          cachedAccessToken = null;
          sessionStorage.removeItem(SESSION_KEY);
          return null;
        }
      }
    } catch {}
    return cachedAccessToken;
  }

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed: StoredSession = JSON.parse(raw);
      if (parsed.accessToken && parsed.expiresAt > Date.now() + 60 * 1000) {
        cachedAccessToken = parsed.accessToken;
        return cachedAccessToken;
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
  } catch {}

  return null;
};

/**
 * Define manualmente o token de acesso (grava também no sessionStorage com 55 min)
 */
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ accessToken: token, expiresAt: Date.now() + 55 * 60 * 1000 })
      );
    } catch {}
  } else {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  }
};

/**
 * Logout do Google
 */
export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
};
