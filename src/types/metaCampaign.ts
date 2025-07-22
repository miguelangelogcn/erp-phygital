// src/types/metaCampaign.ts

export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED' | 'IN_PROCESS';
export type AdSetStatus = 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED' | 'IN_PROCESS';
export type AdStatus = 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED' | 'IN_PROCESS' | 'WITH_ISSUES' | 'DISAPPROVED';


export interface MetaAd {
  id: string;
  name: string;
  status: AdStatus;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number; // Cost Per Click
  cpm: number; // Cost Per 1000 Impressions
  ctr: number; // Click-Through Rate
  // Outras métricas ou detalhes específicos do anúncio podem ser adicionados aqui
}

export interface MetaAdSet {
  id: string;
  name: string;
  status: AdSetStatus;
  spend: number;
  impressions: number;
  clicks: number;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_strategy?: string;
  ads?: MetaAd[]; // Anúncios dentro deste conjunto
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  cpm: number;
  ctr: number;
  adsets?: MetaAdSet[]; // Conjuntos de anúncios dentro desta campanha
}

// Para chamadas de API, as métricas podem vir num objeto separado
export interface CampaignInsights {
    spend: string;
    impressions: string;
    clicks: string;
    cpc: string;
    cpm: string;
    ctr: string;
}
