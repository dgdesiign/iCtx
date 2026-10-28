import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquareText,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { MessageTemplate, TemplateEtapa } from '../types/crm';
import { INITIAL_TEMPLATES } from '../data/initialTemplates';

interface TemplateManagerModalProps {
  templates: MessageTemplate[];
  isOpen: boolean;
  onClose: () => void;
  onSaveTemplates: (templates: MessageTemplate[]) => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  templates,
  isOpen,
  onClose,
  onSaveTemplates,
}) => {
  const [lista, setLista] = useState<MessageTemplate[]>([...templates]);
  const [templateEmEdicao, setTemplateEmEdicao] = useState<MessageTemplate | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLista([...templates]);
    }
  }, [templates, isOpen]);

  if (!isOpen) return null;

  const handleSalvarEdicao = () => {
    if (!templateEmEdicao) return;
    if (!templateEmEdicao.titulo.trim() || !templateEmEdicao.texto.trim()) {
      alert('Preencha o título e o texto do template.');
      return;
    }

    const index = lista.findIndex((t) => t.id === templateEmEdicao.id);
    let novaLista: MessageTemplate[];
    if (index >= 0) {
      novaLista = lista.map((t) => (t.id === templateEmEdicao.id ? templateEmEdicao : t));
    } else {
      novaLista = [templateEmEdicao, ...lista];
    }

    setLista(novaLista);
    onSaveTemplates(novaLista);
    setTemplateEmEdicao(null);
  };

  const handleExcluir = (id: string) => {
    if (lista.length <= 1) {
      alert('Você precisa ter pelo menos um template cadastrado.');
      return;
    }
    if (confirm('Tem certeza que deseja excluir este template?')) {
      const novaLista = lista.filter((t) => t.id !== id);
      setLista(novaLista);
      onSaveTemplates(novaLista);
      if (templateEmEdicao?.id === id) {
        setTemplateEmEdicao(null);
      }
    }
  };

  const handleCriarNovo = () => {
    const novo: MessageTemplate = {
      id: `tpl_${Date.now()}`,
      titulo: '✨ Novo Gatilho Comercial',
      etapa: 'contato_1',
      canal: 'whatsapp',
      destaque: 'Novo',
      descricao: 'Descrição breve da abordagem',
      texto: `Oi {nome}, tudo bem? Aqui é o Douglas do Santander. Vi que você responde pela {empresa}...`,
    };
    setTemplateEmEdicao(novo);
  };

  const handleRestaurarPadroes = () => {
    if (confirm('Deseja restaurar todos os templates oficiais padrão do iCtx?')) {
      setLista(INITIAL_TEMPLATES);
      onSaveTemplates(INITIAL_TEMPLATES);
      setTemplateEmEdicao(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Gerenciador de Abordagens & Scripts de Vendas
              </h3>
              <p className="text-xs text-slate-500">
                Personalize os modelos de mensagens para cada etapa do seu funil
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestaurarPadroes}
              className="text-xs text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors flex items-center gap-1 cursor-pointer"
              title="Restaurar templates originais"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restaurar Padrões</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info on Variables */}
        <div className="px-5 py-2.5 bg-red-50/50 border-b border-red-100 flex items-center gap-2 text-xs text-red-900">
          <Info className="w-4 h-4 text-red-700 shrink-0" />
          <span>
            Variáveis suportadas nos textos:{' '}
            <code className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-red-200">{'{nome}'}</code>,{' '}
            <code className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-red-200">{'{empresa}'}</code>,{' '}
            <code className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-red-200">{'{cidade}'}</code>,{' '}
            <code className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-red-200">{'{idade}'}</code>,{' '}
            <code className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-red-200">{'{socio}'}</code>.
          </span>
        </div>

        {/* Body: Split View (List vs Editor) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          
          {/* Templates List (5 cols) */}
          <div className="md:col-span-5 p-4 flex flex-col overflow-y-auto bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Modelos Cadastrados ({lista.length})
              </span>
              <button
                type="button"
                onClick={handleCriarNovo}
                className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Novo</span>
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {lista.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => setTemplateEmEdicao({ ...tpl })}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    templateEmEdicao?.id === tpl.id
                      ? 'bg-white border-red-600 shadow-sm ring-1 ring-red-600/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h4 className="font-bold text-xs text-slate-900 line-clamp-1">
                      {tpl.titulo}
                    </h4>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                      {tpl.etapa.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {tpl.texto}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Template Editor (7 cols) */}
          <div className="md:col-span-7 p-5 flex flex-col justify-between overflow-y-auto">
            {templateEmEdicao ? (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Edit2 className="w-4 h-4 text-red-600" />
                    <span>Editando Modelo</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleExcluir(templateEmEdicao.id)}
                    className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título / Nome do Gatilho
                  </label>
                  <input
                    type="text"
                    value={templateEmEdicao.titulo}
                    onChange={(e) =>
                      setTemplateEmEdicao({ ...templateEmEdicao, titulo: e.target.value })
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-red-600 bg-white font-medium"
                    placeholder="Ex: 💰 Pronampe 0,5% a.m."
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Etapa Principal
                    </label>
                    <select
                      value={templateEmEdicao.etapa}
                      onChange={(e) =>
                        setTemplateEmEdicao({
                          ...templateEmEdicao,
                          etapa: e.target.value as TemplateEtapa,
                        })
                      }
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-red-600 bg-white"
                    >
                      <option value="contato_1">Contato 1 (Abordagem)</option>
                      <option value="contato_2">Contato 2 (Follow-up)</option>
                      <option value="contato_3">Contato 3 (Ligação)</option>
                      <option value="objecao">Reversão de Objeção</option>
                      <option value="fechamento">Fechamento / Desapego</option>
                      <option value="geral">Geral</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tag / Destaque Visual
                    </label>
                    <input
                      type="text"
                      value={templateEmEdicao.destaque || ''}
                      onChange={(e) =>
                        setTemplateEmEdicao({ ...templateEmEdicao, destaque: e.target.value })
                      }
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-red-600 bg-white"
                      placeholder="Ex: Mais Vendido"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Texto do Script (WhatsApp ou Falado)
                  </label>
                  <textarea
                    rows={8}
                    value={templateEmEdicao.texto}
                    onChange={(e) =>
                      setTemplateEmEdicao({ ...templateEmEdicao, texto: e.target.value })
                    }
                    className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-red-600 bg-white leading-relaxed font-sans"
                    placeholder="Escreva a mensagem..."
                  />
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 space-y-2">
                <MessageSquareText className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs">
                  Selecione um template na lista ao lado ou clique em "+ Criar Novo" para começar a editar.
                </p>
              </div>
            )}

            {/* Save Button */}
            {templateEmEdicao && (
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateEmEdicao(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarEdicao}
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
