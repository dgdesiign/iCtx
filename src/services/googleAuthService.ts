import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  UserCredential
} from "firebase/auth";

// Configuração do Firebase usando as variáveis de ambiente da Vercel
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

// Escopos necessários para o iCtx acessar o Google Sheets e o Drive
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

const TOKEN_STORAGE_KEY = 'ictx_google_token';

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Salva o token de acesso no sessionStorage com validade de 55 minutos
 */
export function setCachedAccessToken(accessToken: string) {
  if (!accessToken) return;
  const expiresAt = Date.now() + 55 * 60 * 1000; // 55 minutos
  const data: CachedToken = { accessToken, expiresAt };
  sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Recupera o token do sessionStorage se ainda for válido
 */
export function getAccessToken(): string | null {
  const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;
  
  try {
    const { accessToken, expiresAt }: CachedToken = JSON.parse(raw);
    // Retorna o token apenas se ainda faltar mais de 60 segundos para expirar
    if (Date.now() < expiresAt - 60000) {
      return accessToken;
    }
  } catch {
    // Ignora erro de parse e retorna null
  }
  return null;
}

/**
 * Faz o login com o Google usando popup e obtém o token de acesso
 */
export async function googleSignIn(): Promise<{ user: User; accessToken: string } | null> {
  const provider = new GoogleAuthProvider();
  SCOPES.forEach(scope => provider.addScope(scope));

  try {
    const result: UserCredential = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error("Não foi possível obter o token de acesso do Google.");
    }

    setCachedAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error("Erro no login com Google:", error);
    // Repassa o erro para a UI tratar (ex: auth/popup-closed-by-user)
    throw error; 
  }
}

/**
 * Desconecta o usuário
 */
export async function logoutGoogle(): Promise<void> {
  await signOut(auth);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Inicializa o listener de autenticação.
 * Restaura a sessão se o Firebase já tiver o usuário logado E o token for válido.
 */
export function initAuth(
  onSuccess: (user: User, accessToken: string) => void,
  onFailure: () => void
) {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = getAccessToken();
      if (token) {
        onSuccess(user, token);
      } else {
        // Usuário está logado no Firebase, mas o token do Sheets expirou ou não existe.
        // O app precisa disparar um novo popup de login para pegar um novo token de Sheets.
        onFailure();
      }
    } else {
      onFailure();
    }
  });
}
