import { useState, useEffect, useCallback, useRef } from 'react';

export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbz0fvTn2qaL1dg-g3drkSHPZEgOchJVD0kVHNqmJamOYLDVEphEvLIkttG57OzEf5iFtQ/exec';

export interface MiningStatusData {
  status: 'idle' | 'rodando' | 'aguardando' | 'concluido' | 'concluído' | string;
  totalCartucho: number;
  leadsNoCartucho: number; // alias para compatibilidade
  duplicatasBloqueadas: number;
  pendentes: string[];
  bairrosPendentes: string[]; // alias para compatibilidade
  processando: number;
  breakdown: Record<string, number>;
  totalBairros: number;
  bairrosConcluidos: number;
  bairroAtual: string | null;
  connectionError?: string | null;
  refresh: () => Promise<void>;
}

export function useMiningStatus(): MiningStatusData {
  const [status, setStatus] = useState<string>('idle');
  const [totalCartucho, setTotalCartucho] = useState<number>(0);
  const [duplicatasBloqueadas, setDuplicatasBloqueadas] = useState<number>(0);
  const [pendentes, setPendentes] = useState<string[]>([]);
  const [processando, setProcessando] = useState<number>(0);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [totalBairros, setTotalBairros] = useState<number>(0);
  const [bairrosConcluidos, setBairrosConcluidos] = useState<number>(0);
  const [bairroAtual, setBairroAtual] = useState<string | null>(null);

  const [connectionError, setConnectionError] = useState<string | null>(null);
  const failureCountRef = useRef<number>(0);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({ action: 'status_job' }),
      });

      if (!response.ok) {
        console.warn('[useMiningStatus] Resposta HTTP inválida:', response.status);
        setConnectionError(`HTTP ${response.status}`);
        return;
      }

      const raw = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        if (raw.includes('setHeaders is not a function')) {
          setConnectionError('Apps Script erro linha 52: setHeaders is not a function');
        }
        return;
      }

      const leadsColetados =
        data.leadsNoCartucho ?? data.totalCartucho ?? data.totalLeads ?? data.leadsColetados ?? data.cartuchoCount ?? 0;
      const dups = data.duplicatasBloqueadas ?? data.duplicados ?? data.bloqueados ?? 0;
      const proc = typeof data.processando === 'number' ? data.processando : (data.status === 'rodando' || data.status === 'em_andamento' ? 1 : 0);
      const concluidos = data.bairrosConcluidos ?? 0;
      const total = data.totalBairros ?? 0;
      const bd = data.breakdown || data.bairrosBreakdown || {};
      const pend = data.pendentes || data.bairrosPendentes || [];
      const currentBairro = data.bairroAtual || (pend.length > 0 ? pend[0] : null);
      const rawStatus = data.status || (proc > 0 ? 'rodando' : 'idle');

      setStatus(rawStatus);
      setTotalCartucho(leadsColetados);
      setDuplicatasBloqueadas(dups);
      setProcessando(proc);
      setBreakdown(bd);
      setTotalBairros(total);
      setBairrosConcluidos(concluidos);
      setPendentes(pend);
      setBairroAtual(currentBairro);
      setConnectionError(null);
      failureCountRef.current = 0;

      const isRunning = proc > 0 || rawStatus === 'rodando' || rawStatus === 'aguardando' || rawStatus === 'em_andamento';

      // Sincroniza flag do Header
      window.dispatchEvent(
        new CustomEvent('ictx:miningJobUpdate', {
          detail: { isRunning },
        })
      );
      if (isRunning) {
        localStorage.setItem('ictx_mining_job', JSON.stringify({ isRunning: true }));
      } else {
        localStorage.removeItem('ictx_mining_job');
      }
    } catch (err: any) {
      failureCountRef.current += 1;
      console.warn('[useMiningStatus] Falha de conexão ao consultar status_job (tentativa ' + failureCountRef.current + '):', err?.message || err);
      setConnectionError('Falha ao conectar com Apps Script');
    }
  }, []);

  // Polling dinâmico (a cada 15 segundos enquanto rodando ou aguardando)
  useEffect(() => {
    // Executa a primeira chamada ao montar
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const isRunning = status === 'rodando' || status === 'aguardando' || status === 'em_andamento' || processando > 0;

    if (isRunning) {
      if (!pollingTimerRef.current) {
        pollingTimerRef.current = setInterval(() => {
          fetchStatus();
        }, 15000); // 15 segundos conforme PASSO 1
      }
    } else {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [status, processando, fetchStatus]);

  return {
    status,
    totalCartucho,
    leadsNoCartucho: totalCartucho,
    duplicatasBloqueadas,
    pendentes,
    bairrosPendentes: pendentes,
    processando,
    breakdown,
    totalBairros,
    bairrosConcluidos,
    bairroAtual,
    connectionError,
    refresh: fetchStatus,
  };
}
