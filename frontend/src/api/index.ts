// Cliente da API EcoViagem. Em dev, o Vite faz proxy de /api -> :8080.
import type {
  Destino, DestinoDetalhe, Indicadores, TipoTransporte, Usuario, Viagem,
} from '../types';

// Reexporta os tipos para quem importa só de '../api' (conveniência).
export type { Destino, DestinoDetalhe, Indicadores, TipoTransporte, Usuario, Viagem };

// Base da API.
// - Local / VPS: o nginx faz proxy de /api → backend (deixe VITE_API_URL vazio).
// - Frontend separado (ex.: Vercel): defina VITE_API_URL com a URL pública do
//   backend, incluindo /api (ex.: https://api.seu-host.com/api).
const BASE = ((import.meta as any).env?.VITE_API_URL || '/api').replace(/\/+$/, '');

/** Resposta do passo 1 do login/cadastro (2FA disparado). */
export interface InicioAuth {
  requer_2fa: boolean;
  email: string;
  enviado_email?: boolean;
  codigo_demo?: string; // presente só no modo demonstração (sem SMTP)
}
/** Resposta da solicitação de recuperação de senha. */
export interface InicioReset {
  ok: boolean;
  enviado_email?: boolean;
  codigo_demo?: string;
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).erro || `Erro ${res.status}`);
  return data as T;
}

const query = (params?: Record<string, string>) =>
  params && Object.keys(params).length ? '?' + new URLSearchParams(params) : '';

export const api = {
  health: () => req<any>('/health'),

  // auth — login/cadastro iniciam o 2FA; confirmar2fa conclui.
  login: (email: string, senha: string) =>
    req<InicioAuth>('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),
  register: (body: any) =>
    req<InicioAuth>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  confirmar2fa: (email: string, codigo: string) =>
    req<Usuario>('/auth/2fa', { method: 'POST', body: JSON.stringify({ email, codigo }) }),
  esqueciSenha: (email: string) =>
    req<InicioReset>('/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
  redefinirSenha: (email: string, codigo: string, nova_senha: string) =>
    req<{ ok: boolean }>('/auth/reset', { method: 'POST', body: JSON.stringify({ email, codigo, nova_senha }) }),

  // destinos
  destinos: (params?: Record<string, string>) => req<Destino[]>('/destinos' + query(params)),
  destino: (id: number) => req<DestinoDetalhe>(`/destinos/${id}`),

  // viagens
  viagensDoUsuario: (idUsuario: number) => req<Viagem[]>(`/viagens?usuario=${idUsuario}`),
  criarViagem: (body: any) => req<any>('/viagens', { method: 'POST', body: JSON.stringify(body) }),

  // avaliacoes
  criarAvaliacao: (body: any) =>
    req<any>('/avaliacoes', { method: 'POST', body: JSON.stringify(body) }),

  // relatorios
  indicadores: () => req<Indicadores>('/relatorios/indicadores'),
  rankingSustentabilidade: () => req<any[]>('/relatorios/sustentabilidade'),
  pegadaPorCategoria: () => req<any[]>('/relatorios/pegada-por-categoria'),
  transporte: () => req<any[]>('/relatorios/transporte'),
  ocupacao: () => req<any[]>('/relatorios/ocupacao'),

  // meta
  tiposTransporte: () => req<TipoTransporte[]>('/meta/tipos-transporte'),
};
