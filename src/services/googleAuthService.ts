import { initializeApp } from "firebase/app";
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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "gen-lang-client-0531276266.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: "gen-lang-client-0531276266.firebasestorage.app",
  messagingSenderId: "549227667726",
  appId: "1:549227667726:web:2a0297db9856e446c5f75f"
};

const app = initializeApp(firebaseConfig);
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

// Detecta se é mobile (iOS/Android ou tela pequena)
function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth < 768;
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
    if (Date.now() < expiresAt - 60000) {
      return accessToken;
    }
  } catch {}
  return null;
}

/**
 * Login com Google: usa Redirect no mobile (popup é bloqueado) e Popup no desktop.
 */
export async function googleSignIn(): Promise<{ user: User; accessToken: string } | null> {
  const provider = new GoogleAuthProvider();
  SCOPES.forEach(scope => provider.addScope(scope));

  // NO MOBILE: Redirect (o app vai recarregar e o getRedirectResult trata)
  if (isMobile()) {
    await signInWithRedirect(auth, provider);
    // O código abaixo não executa no mobile (a página é recarregada)
    return null;
  }

  // NO DESKTOP: Popup
  try {
    const result: UserCredential = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error("Não foi possível obter o token de acesso do Google.");
    }

    setCachedAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error("Erro no login com Google:", error);
    throw error;
  }
}

export async function logoutGoogle(): Promise<void> {
  await signOut(auth);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Inicializa o listener. Também trata o retorno do Redirect (mobile).
 */
export function initAuth(
  onSuccess: (user: User, accessToken: string) => void,
  onFailure: () => void
) {
  // 1) Trata o resultado do Redirect (se o usuário voltou do Google no mobile)
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          setCachedAccessToken(credential.accessToken);
          // onSuccess será chamado pelo onAuthStateChanged também, mas garantimos aqui
        }
      }
    })
    .catch((error) => {
      console.error('Erro no getRedirectResult:', error);
    });

  // 2) Listener normal de estado de autenticação
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = getAccessToken();
      if (token) {
        onSuccess(user, token);
      } else {
        // Tentou logar mas o token não foi salvo (ex: redirect falhou)
        onFailure();
      }
    } else {
      onFailure();
    }
  });
}
