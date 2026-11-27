import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, pageTransition } from '../lib/motion';
import { Icon } from './icons';

/** Envolve o conteúdo de uma página, animando entrada/saída e cascata dos filhos. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={pageTransition} initial="hidden" animate="show" exit="exit">
      {children}
    </motion.div>
  );
}

/** Card padrão. Com `hover`, ganha elevação ao passar o mouse. */
export function Card({
  children,
  className = '',
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={hover ? { y: -5, boxShadow: '0 18px 40px -20px rgba(16,42,32,0.32)' } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`bg-white/90 backdrop-blur rounded-2xl border border-ink/[0.07] shadow-soft ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-3">
        <span className="w-1.5 h-7 rounded-full bg-gradient-to-b from-leaf to-pine" />
        <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-ink">{title}</h2>
      </div>
      {subtitle && <p className="text-pine/60 mt-1.5 ml-[18px] text-sm md:text-[15px]">{subtitle}</p>}
    </div>
  );
}

/** Esqueleto de carregamento animado (shimmer). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function Loader({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: linhas }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

export function ErroBox({ msg }: { msg: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm my-2"
    >
      {msg}
    </motion.div>
  );
}

// Cor do índice/nota (verde = ótimo, âmbar = médio, terracota = baixo)
export function corIndice(valor: number): string {
  if (valor >= 70) return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
  if (valor >= 45) return 'bg-amber-100 text-amber-800 ring-amber-200';
  return 'bg-orange-100 text-orange-800 ring-orange-200';
}

export function IndiceBadge({ valor }: { valor: number | string | null }) {
  const n = Number(valor ?? 0);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ${corIndice(n)}`}>
      <Icon name="leaf" size={13} strokeWidth={1.9} /> <span className="font-display tabular-nums">{n.toFixed(0)}/100</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    RESERVADA: 'bg-sky-100 text-sky-700',
    CONFIRMADA: 'bg-emerald-100 text-emerald-700',
    CONCLUIDA: 'bg-gray-200 text-gray-700',
    CANCELADA: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

export function Estrelas({ nota }: { nota: number }) {
  return (
    <span className="text-amber-400" title={`${nota} de 5`}>
      {'★'.repeat(Math.round(nota))}
      <span className="text-gray-300">{'★'.repeat(5 - Math.round(nota))}</span>
    </span>
  );
}
