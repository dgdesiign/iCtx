import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  User,
  UserCredential,
  browserPopupRedirectResolver
} from "firebase/auth";
import { app } from './firebase';

export const auth = getAuth(app);

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

const TOKEN_STORAGE_KEY = 'ictx_google_token';

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

export function setCachedAccessToken(accessToken: string) {
  if (!accessToken) return;
  const expiresAt = Date.now() + 55 * 60 * 1000;
  const data: CachedToken = { accessToken, expiresAt };
  sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(data));
}

export function getAccessToken(): string | null {
  const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;
  
  try {
    const { accessToken, expiresAt }: CachedToken = JSON.parse(raw);
    if (Date.now() < expiresAt - 60000) return accessToken;
  } catch {}
  return null;
}

export async function googleSignIn(): Promise<{ user: User; accessToken: string } | null> {
  const provider = new GoogleAuthProvider();
  SCOPES.forEach(scope => provider.addScope(scope));

  try {
    const result: UserCredential = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error("Não foi possível obter o token de acesso.");
    }

    setCachedAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.warn("Popup falhou, tentando Redirect...", error);
    
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request' || error.code === 'auth/operation-not-supported-in-this-environment') {
      try {
        await signInWithRedirect(auth, provider);
        return null;
      } catch (redirectError) {
        console.error("Erro no Redirect também:", redirectError);
        throw redirectError;
      }
    }
    
    throw error;
  }
}

export async function logoutGoogle(): Promise<void> {
  await signOut(auth);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function initAuth(
  onSuccess: (user: User, accessToken: string) => void,
  onFailure: () => void
) {
  let resolved = false;

  const resolver = (user: User | null) => {
    if (resolved) return;
    resolved = true;
    if (user) {
      const token = getAccessToken() || '';
      onSuccess(user, token);
    } else {
      onFailure();
    }
  };

  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          setCachedAccessToken(credential.accessToken);
        }
      }
    })
    .catch((error) => console.warn('Erro redirect:', error));

  const unsubscribe = onAuthStateChanged(auth, (user) => {
    resolver(user);
  });

  const timeout = setTimeout(() => {
    if (!resolved) {
      console.warn('Timeout de autenticação atingido. Forçando estado.');
      resolver(auth.currentUser);
    }
  }, 5000);

  return () => {
    unsubscribe();
    clearTimeout(timeout);
  };
}
