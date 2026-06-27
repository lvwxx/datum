import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { THEMES, ThemeName } from "./tokens";

interface ThemeCtx { name: ThemeName; toggle: () => void; }
const Ctx = createContext<ThemeCtx | null>(null);

function applyTokens(name: ThemeName) {
  const tokens = THEMES[name];
  for (const [k, v] of Object.entries(tokens)) {
    document.documentElement.style.setProperty(k, v);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<ThemeName>(
    () => (localStorage.getItem("theme") as ThemeName) || "dark"
  );
  useEffect(() => { applyTokens(name); localStorage.setItem("theme", name); }, [name]);
  const toggle = () => setName((n) => (n === "dark" ? "light" : "dark"));
  return <Ctx.Provider value={{ name, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be inside ThemeProvider");
  return c;
}
