import React, { useState } from 'react';
import { LogIn, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => Promise<void>;
  isLoading: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isLoading }) => {
  const [erro, setErro] = useState<string | null>(null);

  const handleClick = async () => {
    setErro(null);
    try {
      await onLogin();
    } catch (err: any) {
      const msg = err?.message || 'Erro ao entrar com Google.';
      if (msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request')) {
        setErro('Login cancelado. Tente novamente.');
      } else if (msg.includes('popup-blocked')) {
        setErro('Popup bloqueado. Permita popups no navegador ou use o celular.');
      } else if (msg.includes('network-request-failed')) {
        setErro('Sem conexão. Verifique sua internet.');
      } else {
        setErro('Não foi possível entrar. Tente novamente.');
      }
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/20 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 blur-[100px] rounded-full" />

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-red-700 to-slate-900 p-8 text-center text-white">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-red-700 font-black text-2xl tracking-tighter">iCtx</span>
          </div>
          <h1 className="text-xl font-bold">CRM de Prospecção PJ</h1>
          <p className="text-xs text-red-200 mt-1">Pipeline de Vendas Santander / GetNet</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-bold text-slate-800">Bem-vindo de volta</h2>
            <p className="text-xs text-slate-500">Faça login com sua conta corporativa para acessar a sua base de leads.</p>
          </div>

          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <button
            onClick={handleClick}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Entrar com o Google</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium pt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Conexão segura e dados protegidos</span>
          </div>
        </div>
      </div>
    </div>
  );
};
