// Variantes de animação reutilizáveis (Framer Motion) e hook de contagem animada.
import { useEffect, useState } from 'react';
import { animate, type Variants } from 'framer-motion';

/** Entrada suave de baixo para cima (leve, para não pesar no mobile). */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};

/** Container que revela os filhos em cascata (stagger curto). */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
};

/**
 * Transição de página leve: cascata curta e saída rápida, pra troca de tela
 * não engasgar (principalmente em celulares mais simples).
 */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.26, ease: 'easeOut', staggerChildren: 0.035, delayChildren: 0.02 },
  },
  exit: { opacity: 0, transition: { duration: 0.12 } },
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
