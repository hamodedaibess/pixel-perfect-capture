import { useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, X, Inbox, AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { RANGES, fmtMoney } from "@/lib/reports-data";
import { useReports } from "./context";

/* ---------- Status badge ---------- */
type Tone = "success" | "danger" | "warning" | "primary" | "info" | "neutral";
const TONE: Record<Tone, string> = {
  success: "bg-success/10 text-success ring-success/20",
  danger: "bg-destructive/10 text-destructive ring-destructive/25",
  warning: "bg-warning/12 text-warning ring-warning/25",
  primary: "bg-primary/10 text-primary ring-primary/20",
  info: "bg-info/10 text-info ring-info/20",
  neutral: "bg-muted text-muted-foreground ring-border",
};
const STATUS: Record<string, [string, Tone]> = {
  active: ["نشطة", "primary"], closed: ["مغلقة", "neutral"], paid: ["مدفوعة", "success"], unpaid: ["غير مدفوعة", "warning"],
  partial: ["جزئي", "warning"], refunded: ["مستردة", "warning"], void: ["VOID", "danger"], VOID: ["VOID", "danger"], REFUND: ["REFUND", "warning"],
  served: ["تم", "success"], kitchen: ["في المطبخ", "primary"], new: ["جديد", "info"], cancelled: ["ملغى", "danger"],
  busy: ["مشغولة", "primary"], free: ["متاحة", "neutral"],
};
export function StatusBadge({ status, label, tone }: { status?: string; label?: string; tone?: Tone }) {
  const [l, t] = status ? STATUS[status] ?? [status, "neutral"] : [label ?? "", tone ?? "neutral"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONE[tone ?? t])}>
      <span className="size-1.5 rounded-full bg-current" />
      {label ?? l}
    </span>
  );
}

export const Id = ({ children }: { children: ReactNode }) => <span className="id-tag text-muted-foreground">#{children}</span>;
export const Money = ({ v, className }: { v: number; className?: string }) => <span className={cn("num whitespace-nowrap", className)}>{fmtMoney(v)}</span>;

/* ---------- Page header ---------- */
export function PageHeader({ title, subtitle, actions, range = true }: { title: string; subtitle?: string; actions?: ReactNode; range?: boolean }) {
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight md:text-[1.7rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {range && <RangePicker />}
      </div>
    </div>
  );
}

export function RangePicker() {
  const { range, setRange } = useReports();
  return (
    <div className="flex w-full overflow-x-auto no-scrollbar rounded-lg border bg-card p-0.5 shadow-card sm:w-auto">
      {RANGES.map((r) => (
        <button key={r.key} onClick={() => setRange(r.key)}
          className={cn("flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:flex-none",
            range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
          {r.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Metrics ---------- */
export function Metric({ label, value, hint, tone, big }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "danger" | "warning" | "success"; big?: boolean }) {
  const { loading } = useReports();
  return (
    <div className={cn("surface p-4", big && "md:p-5")}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {tone && <span className={cn("size-1.5 rounded-full", tone === "danger" ? "bg-destructive" : tone === "warning" ? "bg-warning" : "bg-success")} />}
        {label}
      </div>
      {loading ? <Skeleton className={cn("mt-2", big ? "h-8 w-32" : "h-6 w-20")} /> : (
        <div className={cn("num mt-1.5 font-bold tracking-tight", big ? "text-2xl md:text-[1.75rem]" : "text-lg",
          tone === "danger" && "text-destructive", tone === "warning" && "text-warning")}>{value}</div>
      )}
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("surface", className)}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-bold">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/* ---------- Filters ---------- */
export interface FilterDef { key: string; label: string; options: { value: string; label: string }[] }
export function FilterBar({ filters, values, onChange, search, onSearch, placeholder = "بحث..." }: {
  filters: FilterDef[]; values: Record<string, string>; onChange: (k: string, v: string) => void;
  search?: string; onSearch?: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const active = filters.filter((f) => values[f.key]);
  const clear = () => { filters.forEach((f) => onChange(f.key, "")); onSearch?.(""); };
  const selects = (stacked: boolean) => filters.map((f) => (
    <label key={f.key} className={cn("block", stacked ? "w-full" : "")}>
      {stacked && <span className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</span>}
      <select value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)}
        className={cn("h-9 rounded-md border bg-card px-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-ring", stacked ? "w-full text-sm" : "", values[f.key] && "border-primary/40 text-primary")}>
        <option value="">{stacked ? "الكل" : f.label}</option>
        {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  ));
  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-2">
        {onSearch && (
          <div className="relative min-w-0 flex-1 lg:max-w-xs">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder}
              className="h-9 w-full rounded-md border bg-card pr-9 pl-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
        )}
        <div className="hidden flex-wrap items-center gap-2 md:flex">{selects(false)}</div>
        <button onClick={() => setOpen(true)} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-semibold md:hidden">
          <SlidersHorizontal className="size-4" /> الفلاتر
          {active.length > 0 && <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">{active.length}</span>}
        </button>
      </div>
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {active.map((f) => (
            <button key={f.key} onClick={() => onChange(f.key, "")} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
              {f.options.find((o) => o.value === values[f.key])?.label} <X className="size-3" />
            </button>
          ))}
          <button onClick={clear} className="px-1 text-xs font-semibold text-muted-foreground hover:text-foreground">مسح الكل</button>
        </div>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl" dir="rtl">
          <SheetHeader><SheetTitle className="text-right">الفلاتر</SheetTitle></SheetHeader>
          <div className="grid gap-3 px-4 pb-2">{selects(true)}</div>
          <div className="flex gap-2 p-4">
            <button onClick={() => setOpen(false)} className="h-10 flex-1 rounded-md bg-primary text-sm font-semibold text-primary-foreground">عرض النتائج</button>
            <button onClick={clear} className="h-10 rounded-md border px-4 text-sm font-semibold">مسح الكل</button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ---------- Responsive data table ---------- */
export interface Col<T> { header: string; cell: (r: T) => ReactNode; className?: string }
export function DataTable<T>({ rows, cols, card, onRowClick, rowKey, empty, rowClass }: {
  rows: T[]; cols: Col<T>[]; card: (r: T) => ReactNode; onRowClick?: (r: T) => void; rowKey: (r: T) => string;
  empty: { title: string; text: string }; rowClass?: (r: T) => string | undefined;
}) {
  const { loading } = useReports();
  const [limit, setLimit] = useState(30);
  if (loading) return <div className="surface space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>;
  if (!rows.length) return <EmptyState {...empty} />;
  const shown = rows.slice(0, limit);
  return (
    <>
      <div className="surface hidden overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {cols.map((c) => <th key={c.header} className={cn("whitespace-nowrap px-3 py-2.5 text-right text-[11px] font-semibold text-muted-foreground", c.className)}>{c.header}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={rowKey(r)} onClick={() => onRowClick?.(r)} className={cn("border-b last:border-0 transition-colors", onRowClick && "cursor-pointer hover:bg-accent/50", rowClass?.(r))}>
                  {cols.map((c) => <td key={c.header} className={cn("whitespace-nowrap px-3 py-2.5", c.className)}>{c.cell(r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:hidden">
        {shown.map((r) => (
          <button key={rowKey(r)} onClick={() => onRowClick?.(r)} className={cn("surface block w-full p-3.5 text-right", rowClass?.(r))}>{card(r)}</button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>عرض {shown.length} من {rows.length}</span>
        {rows.length > limit && <button onClick={() => setLimit(limit + 30)} className="rounded-md border bg-card px-3 py-1.5 font-semibold text-foreground">عرض المزيد</button>}
      </div>
    </>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="surface flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-muted"><Inbox className="size-5 text-muted-foreground" /></div>
      <h3 className="mt-3 text-sm font-bold">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="surface flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-destructive/10"><AlertTriangle className="size-5 text-destructive" /></div>
      <h3 className="mt-3 text-sm font-bold">تعذر تحميل التقرير</h3>
      <p className="mt-1 text-xs text-muted-foreground">حدث خطأ أثناء تحميل البيانات. حاول مرة أخرى.</p>
      <button onClick={onRetry} className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"><RotateCcw className="size-3.5" />إعادة المحاولة</button>
    </div>
  );
}

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex items-center justify-between gap-3 py-1.5 text-sm"><span className="text-muted-foreground">{k}</span><span className="text-left font-medium">{v}</span></div>;
}
