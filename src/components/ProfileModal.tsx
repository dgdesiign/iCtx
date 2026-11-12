import React from 'react';
import { 
  X, LogOut, CheckCircle2, Cloud, Sparkles, Upload, FileText, 
  Database, Smartphone, FileSpreadsheet, Target, BarChart3, 
  Bell, Package, Loader2, LayoutGrid, List, ArrowLeft
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  onLogout: () => void;
  isSyncing: boolean;
  lastSyncTime: string | null;
  isSupervisor: boolean;
  onOpenEnrich: () => void;
  isEnriching: boolean;
  enrichProgress: number;
  enrichTotal: number;
  onOpenBulkImport: () => void;
  onOpenTemplates: () => void;
  onOpenBackup: () => void;
  onOpenInstall: () => void;
  onOpenGoogleSheets: () => void;
  onOpenMetas: () => void;
  onOpenSupervisor: () => void;
  onOpenNotifications: () => void;
  onOpenCartuchos: () => void;
  modoVisualizacao: 'kanban' | 'lista';
  onToggleVisualizacao: (modo: 'kanban' | 'lista') => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen, onClose, user, onLogout, isSyncing, lastSyncTime, isSupervisor,
  onOpenEnrich, isEnriching, enrichProgress, enrichTotal,
  onOpenBulkImport, onOpenTemplates, onOpenBackup, onOpenInstall,
  onOpenGoogleSheets, onOpenMetas, onOpenSupervisor, onOpenNotifications,
  onOpenCartuchos, modoVisualizacao, onToggleVisualizacao,
}) => {
  if (!isOpen) return null;

  const MenuItem = ({ icon: Icon, label, onClick, badge, color = 'slate' }: any) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-left group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-${color}-50 text-${color}-600`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      {badge && <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{badge}</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
        
        {/* Header com botão Voltar */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <button onClick={onClose} className="p-2 -ml-2 text-slate-600 hover:bg-slate-200 rounded-full cursor-pointer flex items-center gap-1">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-bold">Voltar</span>
          </button>
          <h3 className="font-bold text-slate-900">Configurações</h3>
          <div className="w-8 h-8" /> {/* Placeholder para centralizar */}
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Usuário */}
          <div className="p-5 border-b border-slate-100 flex items-center gap-4 bg-gradient-to-br from-white to-slate-50">
            <div className="w-14 h-14 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-slate-500">{user?.displayName?.[0] || 'U'}</span>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 truncate">{user?.displayName || 'Usuário'}</h4>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> {isSupervisor ? 'Supervisor' : 'Executivo'}
              </span>
            </div>
          </div>

          {/* Seção: Visualização */}
          <div className="p-3 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Visualização de Leads</p>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => onToggleVisualizacao('kanban')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  modoVisualizacao === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                <LayoutGrid className="w-4 h-4" /> Kanban
              </button>
              <button
                onClick={() => onToggleVisualizacao('lista')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  modoVisualizacao === 'lista' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                <List className="w-4 h-4" /> Lista
              </button>
            </div>
          </div>

          {/* Seção: Ações Rápidas */}
          <div className="p-3 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Ações</p>
            
            <button
              onClick={onOpenEnrich}
              disabled={isEnriching}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer text-left group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                  {isEnriching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-700 block">Enriquecer Base</span>
                  <span className="text-[10px] text-slate-500">Puxar telefones e CNAE</span>
                </div>
              </div>
              {isEnriching && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{enrichProgress}/{enrichTotal}</span>}
            </button>

            <MenuItem icon={Package} label="Cartuchos AK" onClick={onOpenCartuchos} />
            <MenuItem icon={Upload} label="Importar Lista" onClick={onOpenBulkImport} />
            <MenuItem icon={FileText} label="Gerenciar Templates" onClick={onOpenTemplates} />
            <MenuItem icon={Database} label="Backup e Restauração" onClick={onOpenBackup} />
            <MenuItem icon={FileSpreadsheet} label="Google Sheets" onClick={onOpenGoogleSheets} />
            <MenuItem icon={Smartphone} label="Instalar App no Celular" onClick={onOpenInstall} />
          </div>

          {/* Seção: Painéis */}
          <div className="p-3 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Painéis</p>
            <MenuItem icon={Target} label="Minhas Metas" onClick={onOpenMetas} />
            {isSupervisor && <MenuItem icon={BarChart3} label="Painel do Supervisor" onClick={onOpenSupervisor} />}
            <MenuItem icon={Bell} label="Notificações" onClick={onOpenNotifications} />
          </div>

          {/* Status de Sincronização */}
          <div className="p-5 bg-slate-50">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <Cloud className="w-4 h-4 text-slate-400" />
              <span>Sincronização Google</span>
            </div>
            <p className="text-xs text-slate-500">
              Último backup: {lastSyncTime ? new Date(lastSyncTime).toLocaleString('pt-BR') : 'Nunca'}
            </p>
            {isSyncing && <p className="text-xs text-emerald-600 animate-pulse font-medium mt-1">Salvando...</p>}
          </div>
        </div>

        {/* Footer - Logout */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0">
          <button
            onClick={onLogout}
            className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border border-rose-200"
          >
            <LogOut className="w-4 h-4" /> Desconectar Conta
          </button>
        </div>
      </div>
    </div>
  );
};
