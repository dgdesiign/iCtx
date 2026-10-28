import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Award,
  Save,
  Clock,
  History,
  TrendingUp,
  MessageSquare,
  Bot,
} from 'lucide-react';
import { Lead } from '../types/crm';

interface CoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSaveCoachEvaluation: (
    leadId: string,
    avaliacao: {
      nota: number;
      feedback: string;
      data: string;
    }
  ) => void;
}

interface CriterioCoach {
  id: string;
  tema: string;
  pontos: number;
  penalidadeMockada: number;
  palavrasChave: string[];
  feedbackAusente: string;
  rotuloSucesso: string;
}

const CRITERIOS_COACH: CriterioCoach[] = [
  {
    id: 'energia',
    tema: 'energia',
    pontos: 20,
    penalidadeMockada: 18,
    palavrasChave: ['fit', 'energia', 'luz', '20%'],
    feedbackAusente: '❌ Você não mencionou energia — isso reduz conversão em 18%',
    rotuloSucesso: 'Mencionou economia de energia / fit de luz (+20 pts)',
  },
  {
    id: 'faturamento',
    tema: 'faturamento',
    pontos: 20,
    penalidadeMockada: 22,
    palavrasChave: ['faturamento', 'fatura', 'mil', '500'],
    feedbackAusente: '❌ Você não mencionou faturamento — isso reduz conversão em 22%',
    rotuloSucesso: 'Mencionou faturamento / porte (+20 pts)',
  },
  {
    id: 'contrato',
    tema: 'contrato',
    pontos: 15,
    penalidadeMockada: 12,
    palavrasChave: ['contrato', 'cnpj', 'juceb', 'documento'],
    feedbackAusente: '❌ Você não mencionou contrato — isso reduz conversão em 12%',
    rotuloSucesso: 'Mencionou contrato social / documentos / CNPJ (+15 pts)',
  },
  {
    id: 'maquininha',
    tema: 'máquina',
    pontos: 15,
    penalidadeMockada: 15,
    palavrasChave: ['maquininha', 'máquina', 'maquina', 'cartão', 'cartao', 'link'],
    feedbackAusente: '❌ Você não mencionou máquina — isso reduz conversão em 15%',
    rotuloSucesso: 'Mencionou maquininha / cartão / link (+15 pts)',
  },
  {
    id: 'pronampe',
    tema: 'pronampe',
    pontos: 10,
    penalidadeMockada: 10,
    palavrasChave: ['pronampe', 'capital de giro', 'juros'],
    feedbackAusente: '❌ Você não mencionou pronampe — isso reduz conversão em 10%',
    rotuloSucesso: 'Mencionou Pronampe / capital de giro (+10 pts)',
  },
  {
    id: 'isencao',
    tema: 'isenção',
    pontos: 10,
    penalidadeMockada: 8,
    palavrasChave: ['isenção', 'isencao', 'tarifa', 'folha'],
    feedbackAusente: '❌ Você não mencionou isenção — isso reduz conversão em 8%',
    rotuloSucesso: 'Mencionou isenção / tarifas / folha (+10 pts)',
  },
  {
    id: 'audio',
    tema: 'áudio',
    pontos: 10,
    penalidadeMockada: 5,
    palavrasChave: ['áudio', 'audio', 'ligar', 'telefone'],
    feedbackAusente: '❌ Você não mencionou áudio — isso reduz conversão em 5%',
    rotuloSucesso: 'Mencionou áudio / ligação / contato por voz (+10 pts)',
  },
];

export const CoachModal: React.FC<CoachModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSaveCoachEvaluation,
}) => {
  const [textoConversa, setTextoConversa] = useState('');
  const [resultadoAvaliacao, setResultadoAvaliacao] = useState<{
    nota: number;
    pontosBrutos: number;
    atingidos: CriterioCoach[];
    ausentes: CriterioCoach[];
    feedbacks: string[];
  } | null>(null);
  const [salvoComSucesso, setSalvoComSucesso] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'avaliador' | 'historico'>('avaliador');

  useEffect(() => {
    if (lead) {
      // Se houver anotações recentes ou logs no lead, pode começar em branco ou com pré-carregamento
      setTextoConversa('');
      setResultadoAvaliacao(null);
      setSalvoComSucesso(false);
      setAbaAtiva('avaliador');
    }
  }, [lead?.id, isOpen]);

  if (!isOpen || !lead) return null;

  // Lógica de avaliação determinística sem LLM conforme especificação
  const handleAvaliar = () => {
    const textoLimpo = textoConversa.toLowerCase();

    let pontosBrutos = 20; // Base: 20 pontos
    const atingidos: CriterioCoach[] = [];
    const ausentes: CriterioCoach[] = [];
    const feedbacks: string[] = [];

    CRITERIOS_COACH.forEach((crit) => {
      const presente = crit.palavrasChave.some((kw) => textoLimpo.includes(kw.toLowerCase()));
      if (presente) {
        pontosBrutos += crit.pontos;
        atingidos.push(crit);
      } else {
        ausentes.push(crit);
        feedbacks.push(crit.feedbackAusente);
      }
    });

    // Máximo 120 → normalizar para 100
    const notaNormalizada = Math.min(100, Math.round((pontosBrutos / 120) * 100));

    setResultadoAvaliacao({
      nota: notaNormalizada,
      pontosBrutos,
      atingidos,
      ausentes,
      feedbacks,
    });
    setSalvoComSucesso(false);
  };

  const handleSalvar = () => {
    if (!resultadoAvaliacao) return;

    const feedbackFormatado = resultadoAvaliacao.feedbacks.join('\n');
    const agoraIso = new Date().toISOString();

    onSaveCoachEvaluation(lead.id, {
      nota: resultadoAvaliacao.nota,
      feedback: feedbackFormatado,
      data: agoraIso,
    });

    setSalvoComSucesso(true);
    setTimeout(() => {
      setSalvoComSucesso(false);
    }, 2500);
  };

  const preencherComUltimaMensagem = () => {
    if (lead.historicoContatos && lead.historicoContatos.length > 0) {
      const ultima = lead.historicoContatos[0];
      const texto = ultima.mensagemEnviada || ultima.observacao || '';
      if (texto) {
        setTextoConversa(texto);
      }
    }
  };

  const getCorNota = (nota: number) => {
    if (nota >= 75) return 'text-emerald-600 bg-emerald-50 border-emerald-300';
    if (nota >= 50) return 'text-amber-600 bg-amber-50 border-amber-300';
    return 'text-rose-600 bg-rose-50 border-rose-300';
  };

  const historico = lead.historicoCoach || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Topo do Modal */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">
                🤖 Coach — {lead.empresaExibicao}
              </h2>
              <p className="text-[11px] text-indigo-200 truncate">
                Avaliador determinístico de abordagem e argumentação comercial
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas: Avaliador vs Histórico */}
        <div className="px-4 sm:px-6 pt-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAbaAtiva('avaliador')}
              className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                abaAtiva === 'avaliador'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Avaliador de Negociação</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva('historico')}
              className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                abaAtiva === 'historico'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico ({historico.length})</span>
            </button>
          </div>

          {lead.coachNota !== undefined && (
            <div className="text-[11px] pb-2 text-slate-500 flex items-center gap-1.5">
              <span>Última Nota:</span>
              <span className={`px-2 py-0.5 rounded-full font-extrabold border ${getCorNota(lead.coachNota)}`}>
                {lead.coachNota}/100
              </span>
            </div>
          )}
        </div>

        {/* Conteúdo do Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {abaAtiva === 'avaliador' ? (
            <>
              {/* Textarea de Entrada */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Cole aqui a conversa do WhatsApp ou suas anotações de fechamento:</span>
                  </label>
                  {lead.historicoContatos && lead.historicoContatos.length > 0 && (
                    <button
                      type="button"
                      onClick={preencherComUltimaMensagem}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline font-medium cursor-pointer"
                    >
                      Preencher c/ último WhatsApp
                    </button>
                  )}
                </div>

                <textarea
                  value={textoConversa}
                  onChange={(e) => setTextoConversa(e.target.value)}
                  placeholder="Exemplo: Oi Fábio, tudo bem? Sou o Douglas do Santander. Vi que seu faturamento está na casa dos 500 mil e podemos liberar até 20% de economia na luz com o fit de energia, além de Pronampe a juros especiais e isenção de tarifas. Vamos falar por áudio ou ligação?"
                  rows={5}
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 leading-relaxed font-sans placeholder:text-slate-400"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    {textoConversa.trim().length} caracteres digitados
                  </span>
                  <button
                    type="button"
                    onClick={handleAvaliar}
                    disabled={!textoConversa.trim()}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      textoConversa.trim()
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:shadow-sm'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Avaliar negociação</span>
                  </button>
                </div>
              </div>

              {/* Resultado da Avaliação */}
              {resultadoAvaliacao && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in fade-in duration-200">
                  {/* Placar / Score */}
                  <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                        <Award className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            {resultadoAvaliacao.nota}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">/ 100</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCorNota(
                              resultadoAvaliacao.nota
                            )}`}
                          >
                            {resultadoAvaliacao.nota >= 75
                              ? '🏆 Excelente Abordagem'
                              : resultadoAvaliacao.nota >= 50
                              ? '⚡ Bom Argumento'
                              : '⚠️ Requer Ajustes'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {resultadoAvaliacao.atingidos.length} de {CRITERIOS_COACH.length} pilares de conversão identificados
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSalvar}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 ${
                        salvoComSucesso
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {salvoComSucesso ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      <span>{salvoComSucesso ? 'Salvo no Lead!' : 'Salvar avaliação'}</span>
                    </button>
                  </div>

                  {/* Feedback de Palavras-Chave Ausentes (Conforme especificação) */}
                  {resultadoAvaliacao.feedbacks.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span>Oportunidades de Melhoria (Gatilhos Ausentes):</span>
                      </h4>
                      <div className="space-y-1.5">
                        {resultadoAvaliacao.feedbacks.map((fb, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 text-rose-800 text-xs font-medium leading-relaxed flex items-start gap-2"
                          >
                            <span>{fb}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pilares Mencionados com Sucesso */}
                  {resultadoAvaliacao.atingidos.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Gatilhos Acertados:</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {resultadoAvaliacao.atingidos.map((at) => (
                          <div
                            key={at.id}
                            className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5"
                          >
                            <span className="text-emerald-600">✓</span>
                            <span>{at.rotuloSucesso}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Aba de Histórico de Avaliações */
            <div className="space-y-3">
              {historico.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <Bot className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    Nenhuma avaliação salva para este lead ainda
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Cole uma conversa na aba &quot;Avaliador de Negociação&quot; e clique em &quot;Salvar avaliação&quot; para registrar o histórico do coach.
                  </p>
                </div>
              ) : (
                historico.map((h, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-xs border ${getCorNota(h.nota)}`}>
                          Nota {h.nota}/100
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(h.data).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(h.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    {h.feedback && (
                      <pre className="text-[11px] text-slate-600 font-sans whitespace-pre-wrap leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {h.feedback}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Critérios: Energia (20%), Faturamento (20%), Contrato (15%), Máquina (15%), Pronampe (10%), Isenção (10%), Voz (10%).
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer ml-auto"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
