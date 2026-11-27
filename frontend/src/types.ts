// Tipos compartilhados da aplicação (espelham o retorno da API).

export interface Usuario {
  id_usuario: number;
  nome: string;
  email: string;
  tipo_usuario: string;
}

export interface Destino {
  id_destino: number;
  nome: string;
  cidade: string;
  estado: string;
  descricao: string;
  categoria: string;
  latitude: string | number | null;
  longitude: string | number | null;
  indice_sustentabilidade: string | null;
  media_nota: string | null;
  qtd_avaliacoes: string | null;
  percentual_ocupacao_hoje: string | null;
}

export interface DestinoDetalhe extends Destino {
  capacidade_maxima_diaria: number;
  hospedagens: any[];
  atividades: any[];
  praticas: any[];
  avaliacoes: any[];
}

export interface Viagem {
  id_viagem: number;
  destino: string;
  estado: string;
  data_inicio: string;
  data_fim: string;
  num_pessoas: number;
  status: string;
  hospedagem: string | null;
  valor_total: string | number | null;
  emissao_total_kg: string | number | null;
  emissao_por_pessoa_kg: string | number | null;
}

export interface Indicadores {
  total_destinos: string;
  total_hospedagens: string;
  total_viagens: string;
  indice_medio: string;
  co2_total_kg: string;
}

export interface TipoTransporte {
  id_tipo_transporte: number;
  nome: string;
  fator_emissao_co2_km: string;
}

/* ---------- Recomendações ---------- */
export interface DestinoRecomendado {
  id_destino: number;
  nome: string;
  cidade: string;
  estado: string;
  descricao: string;
  categoria: string;
  latitude: number | string | null;
  longitude: number | string | null;
  indice_sustentabilidade: number | string;
  percentual_ocupacao_hoje: number | string;
  media_nota: number | string | null;
  qtd_avaliacoes: number | string;
  preco_min_eco: number | string | null;
  pontuacao: number | string;
  ja_visitado: number | boolean;
  motivos: string[];
}
export interface Recomendacoes {
  destinos: DestinoRecomendado[];
  perfil?: { qtd_viagens: number; co2_total_kg: number | string; co2_aviao_kg: number | string; km_total: number | string };
  dicas?: string[];
}

/* ---------- Dados reais / previsões ---------- */
export interface Noticia { titulo: string; fonte: string; link: string; data: string | null; tema: string; }
export interface Noticias { tema: string; temas: string[]; ao_vivo: boolean; fonte: string; itens: Noticia[]; }
export interface Fato { icone: string; valor: string; texto: string; tema: string; fonte: string; link: string; }

export type Risco = 'CRITICO' | 'ALTO' | 'MODERADO' | 'BAIXO';
export interface Ecossistema {
  id_ecossistema: number;
  nome: string;
  localizacao: string;
  pais: string;
  tipo: string;
  saude_atual: number | string;
  taxa_degradacao: number | string;
  taxa_efetiva: number;
  ameaca_principal: string;
  evidencia: string;
  fonte: string;
  id_destino?: number;
  destino?: string;
  ano_colapso: number | null;
  ano_extincao: number | null;
  saude_2050: number;
  saude_2100: number;
  risco: Risco;
  serie: { ano: number; saude: number }[];
}
export interface Previsao {
  cenario: string;
  variacao_poluicao_pct: number;
  ano_base: number;
  limiar_colapso: number;
  limiar_extincao: number;
  metodologia: string;
  ecossistemas: Ecossistema[];
}

/* ---------- EcoTokens ---------- */
export interface AcaoSustentavel {
  id_acao: number;
  nome: string;
  descricao: string;
  categoria: string;
  icone: string;
  tokens: number;
  limite_diario: number;
  co2_evitado_kg: number | string;
  usos_hoje?: number;
}
export interface Saldo {
  tokens_ganhos: number | string;
  tokens_gastos: number | string;
  saldo: number | string;
  qtd_acoes: number | string;
  co2_evitado_kg: number | string;
}
export interface RegistroAcao {
  id_registro: number; data_registro: string; descricao: string | null; tokens_ganhos: number;
  acao: string; icone: string; categoria: string;
}
export interface Resgate {
  id_resgate: number; data_resgate: string; codigo_voucher: string; tokens_gastos: number;
  recompensa: string; icone: string; tipo: string; parceiro: string | null; saldo?: number;
}
export interface RotaRegistrada {
  id_rota: number; origem: string; destino: string; modo: string; distancia_km: number | string;
  co2_kg: number | string; co2_evitado_kg: number | string; tokens: number; data_registro: string;
}
export interface Carteira { saldo: Saldo; registros: RegistroAcao[]; rotas?: RotaRegistrada[]; resgates: Resgate[]; }

/* ---------- Opções de rota sustentável ---------- */
export type TagRota = 'RECOMENDADA' | 'MAIS_LIMPA' | 'MAIS_RAPIDA' | 'MAIS_BARATA';
export interface OpcaoRota {
  modo: string;
  rotulo: string;
  icone: string;
  google_modo?: 'DRIVING' | 'TRANSIT' | 'BICYCLING' | 'WALKING';
  distancia_km: number;
  co2_kg: number;
  co2_evitado_kg: number;
  economia_co2_pct: number;
  tempo_min: number;
  custo_reais: number;
  tokens: number;
  detalhe: string;
  tags: TagRota[];
}
export interface OpcoesRota {
  distancia_km: number;
  linha_reta_km: number;
  terrestre: boolean;
  co2_base_kg: number;
  opcoes: OpcaoRota[];
  registradas_hoje?: number;
  limite_diario?: number;
  modos_registrados?: string[];
  observacao: string;
}
export interface RotaPayload {
  id_usuario?: number;
  origem_nome?: string; destino_nome?: string;
  origem_lat: number; origem_lng: number; destino_lat: number; destino_lng: number;
  distancia_km?: number; terrestre?: boolean; modo?: string;
}
export interface Recompensa {
  id_recompensa: number; nome: string; descricao: string; tipo: string; icone: string;
  custo_tokens: number; estoque: number; parceiro: string | null; destino: string | null;
}
