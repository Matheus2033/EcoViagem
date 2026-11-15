import { createContext, useContext, useState, ReactNode } from 'react';
import type { Usuario } from '../types';

interface AuthCtx {
  usuario: Usuario | null;
  entrar: (u: Usuario) => void;
  sair: () => void;
}

const Ctx = createContext<AuthCtx>(null!);

function carregar(): Usuario | null {
  try { return JSON.parse(localStorage.getItem('ecoviagem_user') || 'null'); }
  catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(carregar());
  const entrar = (u: Usuario) => { setUsuario(u); localStorage.setItem('ecoviagem_user', JSON.stringify(u)); };
  const sair = () => { setUsuario(null); localStorage.removeItem('ecoviagem_user'); };
  return <Ctx.Provider value={{ usuario, entrar, sair }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
