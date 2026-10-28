export interface Faixa {
  pts: number;
  valor: number;
}

export interface GatilhoMes {
  mesDeCasaAte: number | null;  // null = sem limite (4+)
  conta: number;
  getnet: number;
}

export interface CampanhaCfg {
  versao: string;
  valorPonto: number;
  tabela: {
    conta: {
      m01: { menos1ano: number; mais1ano: number };
      m2:  { menos1ano: number; mais1ano: number };
    };
    getnet: {
      m01: { menos1ano: number; mais1ano: number };
      m2:  { menos1ano: number; mais1ano: number };
    };
  };
  fit: { pontos: number; somaEm: 'conta' | 'getnet' | 'ambos' };
  bonusConta:   Faixa[];
  bonusGetnet:  Faixa[];
  bonusEquipe:  Faixa[];
  gatilho: GatilhoMes[];
}

export const CAMPANHA: CampanhaCfg = {
  versao: '2026-10',
  valorPonto: 30,
  tabela: {
    conta: {
      m01: { menos1ano: 2, mais1ano: 4 },
      m2:  { menos1ano: 1, mais1ano: 2 },
    },
    getnet: {
      m01: { menos1ano: 4, mais1ano: 6 },
      m2:  { menos1ano: 2, mais1ano: 3 },
    },
  },
  fit: { pontos: 1, somaEm: 'conta' },
  bonusConta:  [
    { pts: 60,  valor: 1000 },
    { pts: 80,  valor: 2000 },
    { pts: 100, valor: 3000 },
    { pts: 130, valor: 4000 },
  ],
  bonusGetnet: [
    { pts: 25, valor: 1000 },
    { pts: 40, valor: 2000 },
    { pts: 55, valor: 3000 },
    { pts: 85, valor: 5000 },
  ],
  bonusEquipe: [
    { pts: 50,  valor: 1500 },
    { pts: 60,  valor: 2500 },
    { pts: 80,  valor: 4000 },
    { pts: 100, valor: 5000 },
  ],
  gatilho: [
    { mesDeCasaAte: 1,    conta: 12, getnet: 4 },
    { mesDeCasaAte: 3,    conta: 14, getnet: 8 },
    { mesDeCasaAte: null, conta: 16, getnet: 12 },
  ],
};
