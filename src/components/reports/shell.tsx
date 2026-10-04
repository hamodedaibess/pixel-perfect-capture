import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, UtensilsCrossed, ClipboardList, ChefHat, Wallet, BarChart3, Users, Settings, Search, Menu, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { SESSIONS, STAFF, TABLE_COUNT, fmtMoney } from "@/lib/reports-data";

const MAIN = [
  { label: "لوحة التحكم", icon: LayoutGrid }, { label: "الطاولات", icon: UtensilsCrossed }, { label: "الطلبات", icon: ClipboardList },
  { label: "المطبخ", icon: ChefHat }, { label: "الكاشير", icon: Wallet }, { label: "التقارير", icon: BarChart3, active: true },
  { label: "الموظفون", icon: Users }, { label: "الإعدادات", icon: Settings },
];
const SUB = [
  { to: "/reports", label: "نظرة عامة", exact: true }, { to: "/reports/tables", label: "الطاولات" }, { to: "/reports/sessions", label: "الجلسات" },
  { to: "/reports/sales", label: "المبيعات" }, { to: "/reports/payments", label: "المدفوعات" }, { to: "/reports/refunds", label: "الاستردادات والإلغاءات" },
  { to: "/reports/staff", label: "نشاط الموظفين" }, { to: "/reports/activity", label: "سجل النشاط" },
] as const;

function Brand() {
  return (
    <div className="flex items-center gap-2 px-4 py-4">
      <div className="grid size-8 place-items-center rounded-md bg-primary text-sm font-black text-primary-foreground">QR</div>
      <div className="leading-tight"><div className="text-sm font-bold">QRServeUp</div><div className="text-[11px] text-muted-foreground">مطعم الياسمين</div></div>
    </div>
  );
}
function MainNav({ compact }: { compact?: boolean }) {
  return (
    <nav className="space-y-0.5 px-2">
      {MAIN.map((m) => (
        <div key={m.label} title={m.label} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
          m.active ? "bg-sidebar-accent text-primary" : "text-sidebar-foreground/80", compact && "justify-center px-0")}>
          <m.icon className="size-[18px] shrink-0" />{!compact && m.label}
        </div>
      ))}
    </nav>
  );
}

function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);
  const go = (fn: () => void) => { setOpen(false); fn(); };
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground">
        <Search className="size-4" /><span className="flex-1 truncate text-right">ابحث عن جلسة، طاولة، فاتورة، طلب...</span>
        <kbd className="hidden rounded border bg-card px-1.5 text-[10px] font-semibold sm:inline" dir="ltr">Ctrl K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div dir="rtl">
          <CommandInput placeholder="رقم جلسة، طاولة، فاتورة، طلب أو اسم موظف..." />
          <CommandList>
            <CommandEmpty>لا توجد نتائج مطابقة.</CommandEmpty>
            <CommandGroup heading="الجلسات">
              {SESSIONS.slice(0, 120).map((s) => (
                <CommandItem key={s.id} value={`جلسة ${s.id} ${s.invoice} ${s.orders.map((o) => o.id).join(" ")}`} onSelect={() => go(() => nav({ to: "/reports/sessions/$sessionId", params: { sessionId: s.id } }))}>
                  <span className="id-tag">#{s.id}</span><span className="text-muted-foreground">طاولة {s.table} · {s.invoice}</span><span className="mr-auto num text-xs">{fmtMoney(s.total)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="الطاولات">
              {Array.from({ length: TABLE_COUNT }, (_, i) => i + 1).map((t) => (
                <CommandItem key={t} value={`طاولة ${t}`} onSelect={() => go(() => nav({ to: "/reports/tables/$tableId", params: { tableId: String(t) } }))}>طاولة {t}</CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="الموظفون">
              {STAFF.map((s) => (
                <CommandItem key={s.id} value={`موظف ${s.name}`} onSelect={() => go(() => nav({ to: "/reports/activity", search: { user: s.id } }))}>{s.name}<span className="text-muted-foreground text-xs">{s.role}</span></CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </div>
      </CommandDialog>
    </>
  );
}

export function ReportsShell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  return (
    <div dir="rtl" className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen shrink-0 border-l bg-sidebar md:block md:w-16 xl:w-60">
        <div className="hidden xl:block"><Brand /></div>
        <div className="grid place-items-center py-4 xl:hidden"><div className="grid size-8 place-items-center rounded-md bg-primary text-xs font-black text-primary-foreground">QR</div></div>
        <div className="hidden xl:block"><MainNav /></div>
        <div className="xl:hidden"><MainNav compact /></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 md:px-6">
            <button onClick={() => setMenu(true)} className="md:hidden" aria-label="القائمة"><Menu className="size-5" /></button>
            <GlobalSearch />
            <div className="mr-auto flex items-center gap-3">
              <span className="hidden items-center gap-1.5 text-xs text-success sm:flex"><span className="size-1.5 animate-pulse rounded-full bg-success" />مباشر</span>
              <Bell className="size-[18px] text-muted-foreground" />
              <div className="grid size-8 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">س</div>
            </div>
          </div>
          <nav className="no-scrollbar flex gap-1 overflow-x-auto px-4 md:px-6">
            {SUB.map((s) => (
              <Link key={s.to} to={s.to} activeOptions={{ exact: "exact" in s }}
                className="relative whitespace-nowrap px-2.5 pb-2.5 pt-1 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "!text-primary after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary" }}>
                {s.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="right" className="w-64 p-0" dir="rtl"><SheetTitle className="sr-only">القائمة</SheetTitle><Brand /><MainNav /></SheetContent>
      </Sheet>
    </div>
  );
}
