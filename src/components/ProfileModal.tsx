import React from 'react';
import { X, User, LogOut, CheckCircle2, Cloud } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  onLogout: () => void;
  isSyncing: boolean;
  lastSyncTime: string | null;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  isSyncing,
  lastSyncTime,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
        
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900">Meu Perfil</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 truncate">{user?.displayName || 'Usuário iCtx'}</h4>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Conectado
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Cloud className="w-4 h-4 text-slate-400" />
              <span>Sincronização Google</span>
            </div>
            <p className="text-xs text-slate-500">
              Último backup: {lastSyncTime ? new Date(lastSyncTime).toLocaleString('pt-BR') : 'Nunca sincronizado'}
            </p>
            {isSyncing && <p className="text-xs text-emerald-600 animate-pulse font-medium">Salvando agora...</p>}
          </div>

          <button
            onClick={onLogout}
            className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border border-rose-200"
          >
            <LogOut className="w-4 h-4" />
            Desconectar Conta
          </button>
        </div>
      </div>
    </div>
  );
};