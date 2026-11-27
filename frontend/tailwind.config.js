/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Paleta "Verdant": verde-pinheiro + folha/lima sobre papel quente.
        sand: '#F5F4ED',
        paper: '#FBFAF5',
        ink: '#10231B',
        canopy: '#0B241B',
        pine: {
          DEFAULT: '#0E3B2A',
          600: '#124A33',
          500: '#15603F',
        },
        forest: '#15754E',
        leaf: '#6FAE2F',
        sprout: '#8BD34A',
        clay: '#C2410C',
      },
      boxShadow: {
        soft: '0 2px 16px -12px rgba(16,42,32,0.35)',
        lift: '0 18px 40px -20px rgba(16,42,32,0.32)',
        glow: '0 10px 26px -14px rgba(14,59,42,0.7)',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'float-slow': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        'gradient-pan': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '70%,100%': { transform: 'scale(1.7)', opacity: '0' },
        },
        wiggle: {
          '0%,100%': { transform: 'rotate(-7deg)' },
          '50%': { transform: 'rotate(7deg)' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sway: {
          '0%,100%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(4deg)' },
        },
        ride: {
          '0%': { transform: 'translateX(-6%)' },
          '100%': { transform: 'translateX(106%)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 8s ease infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.4,0,0.6,1) infinite',
        wiggle: 'wiggle 1.4s ease-in-out infinite',
        'spin-slow': 'spin-slow 12s linear infinite',
        rise: 'rise 0.6s ease-out both',
        sway: 'sway 3.5s ease-in-out infinite',
        ride: 'ride 5s linear infinite',
      },
      backgroundSize: {
        200: '200% 200%',
      },
    },
  },
  plugins: [],
};
