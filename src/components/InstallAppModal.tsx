import React from 'react';
import {
  X,
  Smartphone,
  Tablet,
  Download,
  CheckCircle2,
  Share2,
  PlusSquare,
  Sparkles,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstalar = async () => {
    const sucesso = await install();
    if (sucesso) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-red-600 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs font-bold text-sm">
              iCtx
            </div>
            <div>
              <h3 className="font-bold text-base">
                Instalar iCtx no Celular ou Tablet
              </h3>
              <p className="text-xs text-red-100">
                Funciona como um aplicativo nativo (APK) na tela inicial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-700">
          
          {/* Status Box */}
          {isInstalled ? (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="block font-bold">Aplicativo Já Instalado!</strong>
                <span>O iCtx já está rodando em modo nativo no seu dispositivo.</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-red-950">
              <Zap className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Vantagens de instalar no celular/tablet:</strong> Abertura instantânea em tela cheia sem barra de navegador, disparo rápido para o WhatsApp com 1 toque e acesso veloz mesmo sem conexão estável.
              </div>
            </div>
          )}

          {/* Android / Chrome / Tablet Direct Install */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Android & Tablets (Instalação Direta)</span>
            </div>

            {isInstallable ? (
              <div className="space-y-2.5">
                <p className="text-slate-600 text-xs">
                  Seu dispositivo Android suporta a instalação direta como <strong>WebAPK</strong> nativo no sistema operacional!
                </p>
                <button
                  type="button"
                  onClick={handleInstalar}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar APK / WebAPK no Dispositivo</span>
                </button>
                <p className="text-[11px] text-slate-500 text-center">
                  O Android criará o pacote APK com ícone próprio na sua gaveta de aplicativos.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-slate-600 text-xs leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80">
                <p className="font-semibold text-slate-800">
                  Como instalar como APK no Google Chrome (Android / Tablet):
                </p>
                <ol className="list-decimal list-inside space-y-1.5 pl-1">
                  <li>
                    Toque nos <strong>3 pontinhos (⋮)</strong> no canto superior direito do Chrome.
                  </li>
                  <li>
                    Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                  </li>
                  <li>
                    Confirme em <strong>"Instalar"</strong>. O sistema Android gerará automaticamente o <strong>WebAPK</strong> do <strong>iCtx</strong> na sua lista de apps!
                  </li>
                </ol>
                <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  💡 <strong>Dica para Tablet:</strong> No tablet, o iCtx abre em tela ampla com visualização panorâmica do Kanban e menus otimizados para toque.
                </div>
              </div>
            )}
          </div>

          {/* iPhone / iPad Guide */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Tablet className="w-4 h-4 text-blue-600" />
              <span>iPhone & iPad (iOS Safari)</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200/80 leading-relaxed">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  1. No Safari, toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima).
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <PlusSquare className="w-4 h-4 text-slate-700 shrink-0" />
                <span>
                  2. Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Entendido / Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
