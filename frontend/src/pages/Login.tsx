import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import { useAuth } from '../context/auth';
import { ErroBox } from '../components';
import { LogoMark } from '../components/Logo';

type Step = 'login' | '2fa' | 'forgot' | 'reset';

export default function Login() {
  const { entrar } = useAuth();
  const [step, setStep] = useState<Step>('login');
  const [modo, setModo] = useState<'login' | 'cadastro'>('login');
  const [form, setForm] = useState({ nome: '', email: 'joao@email.com', senha: 'senha123' });
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [emailFluxo, setEmailFluxo] = useState('');
  const [codigoDemo, setCodigoDemo] = useState('');
  const [erro, setErro] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const limpar = () => { setErro(''); setInfo(''); };

  async function enviarCredenciais(e: React.FormEvent) {
    e.preventDefault(); limpar(); setLoading(true);
    try {
      const r = modo === 'login' ? await api.login(form.email, form.senha) : await api.register(form);
      setEmailFluxo(r.email);
      setCodigoDemo(r.codigo_demo ?? '');
      setCodigo('');
      setStep('2fa');
    } catch (err: any) { setErro(err.message); } finally { setLoading(false); }
  }

  async function confirmar2fa(e: React.FormEvent) {
    e.preventDefault(); limpar(); setLoading(true);
    try {
      const u = await api.confirmar2fa(emailFluxo, codigo.trim());
      entrar(u);
    } catch (err: any) { setErro(err.message); } finally { setLoading(false); }
  }

  async function enviarForgot(e: React.FormEvent) {
    e.preventDefault(); limpar(); setLoading(true);
    try {
      const r = await api.esqueciSenha(form.email);
      setEmailFluxo(form.email);
      setCodigoDemo(r.codigo_demo ?? '');
      setCodigo(''); setNovaSenha('');
      setStep('reset');
    } catch (err: any) { setErro(err.message); } finally { setLoading(false); }
  }

  async function enviarReset(e: React.FormEvent) {
    e.preventDefault(); limpar(); setLoading(true);
    try {
      await api.redefinirSenha(emailFluxo, codigo.trim(), novaSenha);
      setStep('login'); setModo('login');
      setInfo('Senha redefinida! Faça login com a nova senha.');
    } catch (err: any) { setErro(err.message); } finally { setLoading(false); }
  }

  function social(provedor: string) {
    limpar();
    setInfo(`Login com ${provedor} requer configurar as credenciais OAuth do provedor (veja o README). A interface já está pronta.`);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-forest via-pine to-canopy bg-200 animate-gradient-pan p-4 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-sprout/20 blur-3xl animate-float-slow" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-leaf/15 blur-3xl animate-float" />
      <div className="absolute top-1/3 left-8 w-40 h-40 rounded-full bg-sprout/10 blur-2xl animate-float-slow" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl w-full max-w-md p-8 relative"
      >
        {/* Logo centralizado */}
        <div className="flex flex-col items-center text-center mb-6">
          <motion.div
            initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
            className="relative mb-3"
          >
            <span className="absolute inset-0 rounded-[1.1rem] bg-forest/40 blur-lg animate-pulse-ring" />
            <LogoMark size={64} className="relative" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            <span className="text-ink">Eco</span>
            <span className="bg-gradient-to-r from-leaf via-forest to-pine bg-clip-text text-transparent">Viagem</span>
          </h1>
          <p className="text-pine/50 text-sm mt-0.5">Plataforma de Turismo Sustentável</p>
        </div>

        {info && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm mb-3">
            {info}
          </div>
        )}
        {erro && <ErroBox msg={erro} />}

        <AnimatePresence mode="wait">
          {step === 'login' && (
            <Fade key="login">
              <div className="flex gap-2 mb-6 bg-gray-100 rounded-lg p-1">
                {(['login', 'cadastro'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setModo(m); limpar(); }}
                    className={`flex-1 py-2 rounded-md text-sm font-medium capitalize transition ${
                      modo === m ? 'bg-white shadow text-forest' : 'text-pine/50'
                    }`}
                  >
                    {m === 'login' ? 'Entrar' : 'Cadastrar'}
                  </button>
                ))}
              </div>

              <form onSubmit={enviarCredenciais} className="space-y-4">
                {modo === 'cadastro' && <Input label="Nome" value={form.nome} onChange={set('nome')} required />}
                <Input label="E-mail" type="email" value={form.email} onChange={set('email')} required />
                <Input label="Senha" type="password" value={form.senha} onChange={set('senha')} required />
                {modo === 'login' && (
                  <div className="text-right -mt-1">
                    <button type="button" onClick={() => { limpar(); setStep('forgot'); }}
                      className="text-xs text-forest hover:text-pine font-medium">
                      Esqueci minha senha
                    </button>
                  </div>
                )}
                <Primario loading={loading} texto={modo === 'login' ? 'Entrar' : 'Criar conta'} />
              </form>

              {/* Login social */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">ou continue com</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Social onClick={() => social('Google')} rotulo="Google"><GoogleIcon /></Social>
                <Social onClick={() => social('Apple')} rotulo="Apple"><AppleIcon /></Social>
                <Social onClick={() => social('Microsoft')} rotulo="Microsoft"><MicrosoftIcon /></Social>
              </div>

              {modo === 'login' && (
                <p className="text-xs text-gray-400 text-center mt-5">Demo: joao@email.com / senha123</p>
              )}
            </Fade>
          )}

          {step === '2fa' && (
            <Fade key="2fa">
              <StepHeader titulo="Verificação em duas etapas" />
              <p className="text-sm text-gray-500 mb-4">
                Enviamos um código de 6 dígitos para <strong>{emailFluxo}</strong>.
              </p>
              {codigoDemo && <DemoBanner codigo={codigoDemo} />}
              <form onSubmit={confirmar2fa} className="space-y-4">
                <CodeInput value={codigo} onChange={setCodigo} />
                <Primario loading={loading} texto="Confirmar e entrar" />
              </form>
              <Voltar onClick={() => { limpar(); setStep('login'); }} />
            </Fade>
          )}

          {step === 'forgot' && (
            <Fade key="forgot">
              <StepHeader titulo="Recuperar senha" />
              <p className="text-sm text-gray-500 mb-4">Informe seu e-mail para receber um código de redefinição.</p>
              <form onSubmit={enviarForgot} className="space-y-4">
                <Input label="E-mail" type="email" value={form.email} onChange={set('email')} required />
                <Primario loading={loading} texto="Enviar código" />
              </form>
              <Voltar onClick={() => { limpar(); setStep('login'); }} />
            </Fade>
          )}

          {step === 'reset' && (
            <Fade key="reset">
              <StepHeader titulo="Nova senha" />
              <p className="text-sm text-gray-500 mb-4">
                Digite o código enviado para <strong>{emailFluxo}</strong> e a nova senha.
              </p>
              {codigoDemo && <DemoBanner codigo={codigoDemo} />}
              <form onSubmit={enviarReset} className="space-y-4">
                <CodeInput value={codigo} onChange={setCodigo} />
                <Input label="Nova senha (mín. 6)" type="password" value={novaSenha}
                  onChange={(e: any) => setNovaSenha(e.target.value)} required />
                <Primario loading={loading} texto="Redefinir senha" />
              </form>
              <Voltar onClick={() => { limpar(); setStep('login'); }} />
            </Fade>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* --------------------------------------------------------------------------- */

function Fade({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}

function StepHeader({ titulo }: { titulo: string }) {
  return <h2 className="text-lg font-bold text-gray-900 mb-1">{titulo}</h2>;
}

function DemoBanner({ codigo }: { codigo: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm mb-4">
      <strong>Modo demonstração</strong> (sem SMTP configurado). Seu código é:{' '}
      <span className="font-mono font-bold tracking-widest">{codigo}</span>
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink/80">{label}</span>
      <input
        {...props}
        className="mt-1 w-full border border-ink/[0.12] rounded-lg px-3 py-2 focus:ring-2 focus:ring-forest/40 focus:border-forest outline-none transition"
      />
    </label>
  );
}

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      inputMode="numeric"
      placeholder="000000"
      required
      className="w-full border border-ink/[0.12] rounded-lg px-3 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-forest/40 focus:border-forest outline-none"
    />
  );
}

function Primario({ loading, texto }: { loading: boolean; texto: string }) {
  return (
    <motion.button
      disabled={loading}
      whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}
      className="w-full bg-gradient-to-r from-forest to-pine hover:from-pine-500 hover:to-pine text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 shadow-glow"
    >
      {loading ? '...' : texto}
    </motion.button>
  );
}

function Voltar({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-4 text-xs text-gray-400 hover:text-gray-600 w-full text-center">
      ← Voltar ao login
    </button>
  );
}

function Social({ children, rotulo, onClick }: { children: React.ReactNode; rotulo: string; onClick: () => void }) {
  return (
    <motion.button
      type="button" onClick={onClick} title={`Entrar com ${rotulo}`}
      whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
      className="flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 hover:border-gray-300 transition"
    >
      {children}
    </motion.button>
  );
}

/* Ícones das marcas (SVG — compatíveis com navegadores antigos) */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z" />
      <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.6-3.9-12.4-9.1H4.3v5.7C7.9 41.1 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.6 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 6.9 4.3 14.2l7.3 5.7c1.8-5.2 6.6-9.1 12.4-9.1z" />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="#000">
      <path d="M16.37 12.78c.03 2.9 2.55 3.86 2.58 3.87-.02.07-.4 1.38-1.33 2.73-.8 1.17-1.64 2.33-2.96 2.35-1.3.03-1.72-.77-3.2-.77-1.49 0-1.95.75-3.18.8-1.27.05-2.24-1.26-3.05-2.42-1.65-2.39-2.91-6.76-1.22-9.71.84-1.47 2.35-2.4 3.98-2.42 1.25-.03 2.43.84 3.2.84.76 0 2.2-1.04 3.7-.89.63.03 2.4.26 3.54 1.92-.09.06-2.11 1.23-2.09 3.67M13.99 4.3c.68-.82 1.14-1.97.01-3.14-.99.04-2.19.66-2.89 1.48-.63.72-1.18 1.89-1.03 3 .11.44 1.12.46 2.1-.34" />
    </svg>
  );
}
function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M0 0h11.4v11.4H0z" />
      <path fill="#7FBA00" d="M12.6 0H24v11.4H12.6z" />
      <path fill="#00A4EF" d="M0 12.6h11.4V24H0z" />
      <path fill="#FFB900" d="M12.6 12.6H24V24H12.6z" />
    </svg>
  );
}
