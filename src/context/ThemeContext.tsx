import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Tema = 'dark' | 'light';
const CHAVE_TEMA = 'unigas_tema_v2'; // tema claro é o padrão
const Ctx = createContext<{ tema: Tema; alternar: () => void; setTema: (t: Tema) => void }>({
  tema: 'light',
  alternar: () => {},
  setTema: () => {},
});

function inicial(): Tema {
  try {
    return localStorage.getItem(CHAVE_TEMA) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(inicial);
  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove('dark', 'light');
    el.classList.add(tema);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'dark' ? '#0B0B0D' : '#F5F6F8');
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch {
      /* ignora */
    }
  }, [tema]);
  return <Ctx.Provider value={{ tema, setTema, alternar: () => setTema((t) => (t === 'dark' ? 'light' : 'dark')) }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
