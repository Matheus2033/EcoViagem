// Variantes de animação reutilizáveis (Framer Motion) e hook de contagem animada.
import { useEffect, useState } from 'react';
import { animate, type Variants } from 'framer-motion';

/** Entrada suave de baixo para cima. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

/** Container que revela os filhos em cascata (stagger). */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

/** Transição de página que também revela os filhos (com variante fadeUp) em cascata. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut', staggerChildren: 0.07, delayChildren: 0.06 },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

/** Pop de hover/tap para cards e botões. */
export const hoverPop = {
  whileHover: { y: -4, transition: { type: 'spring' as const, stiffness: 300, damping: 20 } },
  whileTap: { scale: 0.98 },
};

/**
 * Anima um número de 0 até `target`. Retorna o valor atual já formatado.
 */
export function useCountUp(target: number, opts?: { duration?: number; decimals?: number }) {
  const { duration = 1.1, decimals = 0 } = opts || {};
  const [valor, setValor] = useState(0);

  useEffect(() => {
    const controls = animate(0, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValor(v),
    });
    return () => controls.stop();
  }, [target, duration]);

  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
