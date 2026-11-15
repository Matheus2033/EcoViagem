// Principais cidades do Brasil (capitais + grandes polos) com coordenadas.
// Permitem escolher origem/destino livremente mesmo sem a chave do Google Maps
// (ex.: "São Paulo" → "Fernando de Noronha"), usando distância em linha reta.
export interface Cidade {
  nome: string;
  uf: string;
  lat: number;
  lng: number;
}

export const CIDADES_BR: Cidade[] = [
  { nome: 'São Paulo', uf: 'SP', lat: -23.5505, lng: -46.6333 },
  { nome: 'Rio de Janeiro', uf: 'RJ', lat: -22.9068, lng: -43.1729 },
  { nome: 'Brasília', uf: 'DF', lat: -15.7939, lng: -47.8828 },
  { nome: 'Belo Horizonte', uf: 'MG', lat: -19.9167, lng: -43.9345 },
  { nome: 'Salvador', uf: 'BA', lat: -12.9777, lng: -38.5016 },
  { nome: 'Fortaleza', uf: 'CE', lat: -3.7319, lng: -38.5267 },
  { nome: 'Curitiba', uf: 'PR', lat: -25.4284, lng: -49.2733 },
  { nome: 'Recife', uf: 'PE', lat: -8.0476, lng: -34.8770 },
  { nome: 'Porto Alegre', uf: 'RS', lat: -30.0346, lng: -51.2177 },
  { nome: 'Manaus', uf: 'AM', lat: -3.1190, lng: -60.0217 },
  { nome: 'Belém', uf: 'PA', lat: -1.4558, lng: -48.4902 },
  { nome: 'Goiânia', uf: 'GO', lat: -16.6869, lng: -49.2648 },
  { nome: 'Florianópolis', uf: 'SC', lat: -27.5954, lng: -48.5480 },
  { nome: 'Vitória', uf: 'ES', lat: -20.3155, lng: -40.3128 },
  { nome: 'Natal', uf: 'RN', lat: -5.7945, lng: -35.2110 },
  { nome: 'João Pessoa', uf: 'PB', lat: -7.1195, lng: -34.8450 },
  { nome: 'Maceió', uf: 'AL', lat: -9.6498, lng: -35.7089 },
  { nome: 'Campo Grande', uf: 'MS', lat: -20.4697, lng: -54.6201 },
  { nome: 'Cuiabá', uf: 'MT', lat: -15.6014, lng: -56.0979 },
  { nome: 'Teresina', uf: 'PI', lat: -5.0892, lng: -42.8019 },
  { nome: 'São Luís', uf: 'MA', lat: -2.5307, lng: -44.3068 },
  { nome: 'Aracaju', uf: 'SE', lat: -10.9472, lng: -37.0731 },
  { nome: 'Palmas', uf: 'TO', lat: -10.1842, lng: -48.3336 },
  { nome: 'Porto Velho', uf: 'RO', lat: -8.7612, lng: -63.9039 },
  { nome: 'Rio Branco', uf: 'AC', lat: -9.9754, lng: -67.8249 },
  { nome: 'Boa Vista', uf: 'RR', lat: 2.8235, lng: -60.6758 },
  { nome: 'Macapá', uf: 'AP', lat: 0.0349, lng: -51.0694 },
  { nome: 'Campinas', uf: 'SP', lat: -22.9099, lng: -47.0626 },
  { nome: 'Guarulhos', uf: 'SP', lat: -23.4543, lng: -46.5337 },
  { nome: 'Santos', uf: 'SP', lat: -23.9608, lng: -46.3336 },
  { nome: 'Ribeirão Preto', uf: 'SP', lat: -21.1775, lng: -47.8103 },
  { nome: 'Uberlândia', uf: 'MG', lat: -18.9186, lng: -48.2772 },
  { nome: 'Foz do Iguaçu', uf: 'PR', lat: -25.5163, lng: -54.5854 },
  { nome: 'Gramado', uf: 'RS', lat: -29.3789, lng: -50.8745 },
  { nome: 'Caldas Novas', uf: 'GO', lat: -17.7417, lng: -48.6253 },
];
