import { useCallback, useEffect, useState } from 'react';

/**
 * Executa uma função assíncrona no carregamento (e quando `deps` muda),
 * controlando data/loading/erro. Evita repetir useEffect + useState em cada página.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const executar = useCallback(() => {
    setLoading(true);
    setErro('');
    fn()
      .then(setData)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, deps);

  useEffect(() => { executar(); }, [executar]);

  return { data, loading, erro, recarregar: executar };
}
