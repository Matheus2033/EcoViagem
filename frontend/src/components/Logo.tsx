import { motion } from 'framer-motion';

/**
 * Marca do EcoViagem: um broto (duas folhas + caule) dentro de um selo com
 * gradiente, e uma rota pontilhada que evoca a viagem. SVG puro (gradientes
 * compatíveis com navegadores antigos, ex.: Edge 92).
 */
export function LogoMark({
  size = 44,
  className = '',
  animated = true,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  const leaf = animated
    ? {
        initial: { scale: 0, rotate: -25, opacity: 0 },
        animate: { scale: 1, rotate: 0, opacity: 1 },
        transition: { type: 'spring' as const, stiffness: 240, damping: 14, delay: 0.1 },
      }
    : {};

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...(animated
        ? { whileHover: { rotate: [0, -6, 6, 0], transition: { duration: 0.6 } } }
        : {})}
    >
      <defs>
        <linearGradient id="eco-badge" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="0.55" stopColor="#10b981" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="eco-shine" x1="6" y1="4" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* selo */}
      <rect x="3" y="3" width="42" height="42" rx="13" fill="url(#eco-badge)" />
      <rect x="3" y="3" width="42" height="42" rx="13" fill="url(#eco-shine)" />

      {/* rota pontilhada (viagem) */}
      <path
        d="M12 35 C 20 35, 20 28, 28 28 C 34 28, 36 33, 36 33"
        stroke="#ffffff"
        strokeOpacity="0.55"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="0.1 4"
      />
      <circle cx="12" cy="35" r="2.1" fill="#ffffff" />

      {/* broto: caule + duas folhas */}
      <motion.g {...(leaf as any)} style={{ transformOrigin: '24px 32px' }}>
        <path d="M24 33 C 24 27, 24 22, 24 16" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
        {/* folha esquerda */}
        <path d="M24 24 C 18 24, 14 20, 14.5 14.5 C 20 14, 24 18, 24 24 Z" fill="#ffffff" />
        {/* folha direita */}
        <path d="M24 20 C 30 20, 34 16, 33.5 10.5 C 28 10, 24 14, 24 20 Z" fill="#ffffff" fillOpacity="0.92" />
      </motion.g>
    </motion.svg>
  );
}

/** Logo completa: marca + nome com gradiente. */
export function Logo({
  size = 44,
  variant = 'light',
  animated = true,
}: {
  size?: number;
  variant?: 'light' | 'dark';
  animated?: boolean;
}) {
  const nome = variant === 'light' ? 'text-white' : 'text-gray-900';
  const sub = variant === 'light' ? 'text-emerald-100/80' : 'text-emerald-600/80';
  const grad =
    variant === 'light'
      ? 'from-lime-300 to-emerald-300'
      : 'from-emerald-500 via-emerald-600 to-teal-600';
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} animated={animated} className="drop-shadow-md shrink-0" />
      <div className="leading-tight">
        <h1 className={`font-extrabold text-lg tracking-tight ${nome}`}>
          Eco<span className={`bg-gradient-to-r ${grad} bg-clip-text text-transparent`}>Viagem</span>
        </h1>
        <p className={`text-[11px] font-medium ${sub}`}>Turismo Sustentável</p>
      </div>
    </div>
  );
}
