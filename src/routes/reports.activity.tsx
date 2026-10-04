import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PlayCircle, ClipboardList, UtensilsCrossed, Receipt, CreditCard, Ban, Undo2, Percent, User, Settings, LogIn, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, FilterBar, Money, Id, EmptyState, StatusBadge } from "@/components/reports/ui";
import { useReports } from "@/components/reports/context";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { ACTIVITY, STAFF, CATEGORY_LABEL, TABLE_COUNT, inRange, relTime, fmtDateTime, type Activity, type ActivityCategory } from "@/lib/reports-data";

export const Route = createFileRoute("/reports/activity")({
  validateSearch: (s: Record<string, unknown>) => ({ user: typeof s.user === "string" ? s.user : undefined, q: typeof s.q === "string" ? s.q : undefined }),
  head: () => ({ meta: [
    { title: "سجل النشاط — QRServeUp" },
    { name: "description", content: "سجل موحد لجميع العمليات المهمة التي تمت داخل المطعم." },
    { property: "og:title", content: "سجل النشاط — QRServeUp" },
    { property: "og:description", content: "سجل موحد لجميع العمليات المهمة التي تمت داخل المطعم." },
  ] }),
  component: ActivityPage,
});

const ICON: Record<ActivityCategory, [LucideIcon, string]> = {
  sessions: [PlayCircle, "text-primary bg-primary/10"], orders: [ClipboardList, "text-info bg-info/10"], tables: [UtensilsCrossed, "text-muted-foreground bg-muted"],
  invoices: [Receipt, "text-foreground bg-muted"], payments: [CreditCard, "text-success bg-success/10"], void: [Ban, "text-destructive bg-destructive/10"],
  refund: [Undo2, "text-warning bg-warning/15"], discounts: [Percent, "text-info bg-info/10"], users: [User, "text-muted-foreground bg-muted"],
  settings: [Settings, "text-muted-foreground bg-muted"], auth: [LogIn, "text-muted-foreground bg-muted"],
};

function ActivityPage() {
  const search = Route.useSearch();
  const { range, loading } = useReports();
  const mobile = useIsMobile();
  const [f, setF] = useState<Record<string, string>>({ user: search.user ?? "" });
  const [q, setQ] = useState(search.q ?? "");
  const [sel, setSel] = useState<Activity | null>(null);
  const [limit, setLimit] = useState(40);
  const rows = useMemo(() => ACTIVITY.filter((a) => inRange(a.date, range) &&
    (!f.user || a.user.id === f.user) && (!f.role || a.user.role === f.role) && (!f.cat || a.category === f.cat) && (!f.table || a.table === Number(f.table)) &&
    (!q || [a.action, a.sessionId, a.invoice, a.entityId, a.user.name, a.table && `طاولة ${a.table}`].some((x) => x && String(x).toLowerCase().includes(q.toLowerCase())))), [range, f, q]);

  return (
    <>
      <PageHeader title="سجل النشاط" subtitle="سجل موحد لجميع العمليات المهمة التي تمت داخل المطعم." />
      <FilterBar search={q} onSearch={setQ} placeholder="ابحث في النشاط..." values={f} onChange={(k, v) => setF({ ...f, [k]: v })} filters={[
        { key: "user", label: "المستخدم", options: STAFF.map((s) => ({ value: s.id, label: s.name })) },
        { key: "role", label: "الدور", options: ["مدير المطعم", "كاشير", "نادل"].map((r) => ({ value: r, label: r })) },
        { key: "cat", label: "نوع العملية", options: (Object.keys(CATEGORY_LABEL) as ActivityCategory[]).map((k) => ({ value: k, label: CATEGORY_LABEL[k] })) },
        { key: "table", label: "الطاولة", options: Array.from({ length: TABLE_COUNT }, (_, i) => ({ value: String(i + 1), label: `طاولة ${i + 1}` })) },
      ]} />
      {loading ? <div className="surface space-y-3 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        : !rows.length ? <EmptyState title="لا توجد عمليات" text="لا توجد أنشطة مطابقة للفلاتر الحالية." />
        : (
          <div className="surface divide-y">
            {rows.slice(0, limit).map((a) => {
              const [Icon, tone] = ICON[a.category];
              const danger = a.category === "void", warn = a.category === "refund";
              return (
                <button key={a.id} onClick={() => setSel(a)} className={cn("flex w-full items-start gap-3 px-4 py-3 text-right transition-colors hover:bg-accent/40", danger && "bg-destructive/[0.025]")}>
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-md", tone)}><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className={cn("text-sm font-semibold", danger && "text-destructive", warn && "text-warning")}>{a.action}</span>
                      <span className="text-xs text-muted-foreground">{relTime(a.date)}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">{a.user.name}</span>
                      {a.invoice && <Id>{a.invoice}</Id>}
                      {a.sessionId && <span>جلسة <Id>{a.sessionId}</Id></span>}
                      {a.table && <span>طاولة {a.table}</span>}
                      {a.amount != null && <Money v={a.amount} className={cn("font-semibold text-foreground", danger && "text-destructive", warn && "text-warning")} />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      {rows.length > limit && <div className="mt-3 text-center"><button onClick={() => setLimit(limit + 40)} className="rounded-md border bg-card px-4 py-2 text-xs font-semibold">عرض المزيد ({rows.length - limit})</button></div>}

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent side={mobile ? "bottom" : "left"} dir="rtl" className={cn("overflow-y-auto", mobile ? "max-h-[88vh] rounded-t-xl" : "w-full sm:max-w-md")}>
          {sel && <Detail a={sel} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Detail({ a }: { a: Activity }) {
  const [Icon, tone] = ICON[a.category];
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="flex justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0"><span className="text-muted-foreground">{k}</span><span className="text-left font-medium">{v}</span></div>;
  const keys = [...new Set([...Object.keys(a.before ?? {}), ...Object.keys(a.after ?? {})])];
  return (
    <>
      <SheetHeader className="text-right">
        <div className="flex items-center gap-3"><span className={cn("grid size-9 place-items-center rounded-md", tone)}><Icon className="size-4" /></span>
          <div><SheetTitle className="text-right">{a.action}</SheetTitle><p className="text-xs text-muted-foreground">{fmtDateTime(a.date)}</p></div></div>
      </SheetHeader>
      <div className="space-y-4 px-4 pb-6">
        <div className="rounded-lg border px-3">
          <Row k="نوع العملية" v={<StatusBadge label={CATEGORY_LABEL[a.category]} tone={a.category === "void" ? "danger" : a.category === "refund" ? "warning" : "neutral"} />} />
          <Row k="المستخدم" v={a.user.name} />
          <Row k="الدور" v={a.user.role} />
          <Row k="الكيان" v={a.entity} />
          <Row k="Entity ID" v={<span className="id-tag">{a.entityId}</span>} />
          {a.sessionId && <Row k="الجلسة" v={<Link to="/reports/sessions/$sessionId" params={{ sessionId: a.sessionId }} className="id-tag text-primary hover:underline">#{a.sessionId}</Link>} />}
          {a.table && <Row k="الطاولة" v={<Link to="/reports/tables/$tableId" params={{ tableId: String(a.table) }} className="text-primary hover:underline">طاولة {a.table}</Link>} />}
          {a.invoice && <Row k="الفاتورة" v={<span className="id-tag">{a.invoice}</span>} />}
          {a.amount != null && <Row k="المبلغ" v={<Money v={a.amount} className="font-bold" />} />}
        </div>
        {keys.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-bold text-muted-foreground">التغييرات</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border bg-muted/40 p-3"><div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">قبل العملية</div>
                {keys.map((k) => <div key={k} className="id-tag text-xs text-foreground" dir="ltr">{k} = {a.before?.[k] ?? "—"}</div>)}</div>
              <div className={cn("rounded-lg border p-3", a.category === "void" ? "border-destructive/30 bg-destructive/[0.05]" : a.category === "refund" ? "border-warning/30 bg-warning/[0.06]" : "border-primary/20 bg-accent/50")}>
                <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">بعد العملية</div>
                {keys.map((k) => <div key={k} className="id-tag text-xs font-semibold text-foreground" dir="ltr">{k} = {a.after?.[k] ?? "—"}</div>)}</div>
            </div>
          </div>
        )}
        {a.reason && <div className="rounded-lg border px-3 py-2.5 text-sm"><span className="text-muted-foreground">السبب: </span><span className="font-semibold">{a.reason}</span></div>}
      </div>
    </>
  );
}
