import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { RangeKey } from "@/lib/reports-data";

const Ctx = createContext<{ range: RangeKey; setRange: (r: RangeKey) => void; loading: boolean }>({ range: "month", setRange: () => {}, loading: false });

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [range, setRangeState] = useState<RangeKey>("month");
  const [loading, setLoading] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  const setRange = (r: RangeKey) => {
    setRangeState(r);
    setLoading(true);
    clearTimeout(t.current);
    t.current = setTimeout(() => setLoading(false), 350);
  };
  return <Ctx.Provider value={{ range, setRange, loading }}>{children}</Ctx.Provider>;
}
export const useReports = () => useContext(Ctx);
