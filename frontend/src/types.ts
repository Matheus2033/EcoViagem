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
