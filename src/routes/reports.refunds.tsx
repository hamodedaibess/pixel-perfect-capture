import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Ban, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, Metric, FilterBar, DataTable, Money, Id } from "@/components/reports/ui";
import { useReports } from "@/components/reports/context";
import { ADJUSTMENTS, STAFF, inRange, fmtMoney, fmtShortDate, fmtTime, type Adjustment } from "@/lib/reports-data";

export const Route = createFileRoute("/reports/refunds")({
  head: () => ({ meta: [
    { title: "الاستردادات والإلغاءات — QRServeUp" },
    { name: "description", content: "جميع عمليات VOID والاسترداد مع السبب والمنفذ والمبلغ المتأثر." },
    { property: "og:title", content: "الاستردادات والإلغاءات — QRServeUp" },
    { property: "og:description", content: "جميع عمليات VOID والاسترداد مع السبب والمنفذ والمبلغ المتأثر." },
  ] }),
  component: Refunds,
});

function TypeTag({ t }: { t: Adjustment["type"] }) {
  const v = t === "VOID";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold", v ? "bg-destructive text-destructive-foreground" : "bg-warning/15 text-warning")}>
      {v ? <Ban className="size-3" /> : <Undo2 className="size-3" />}{t}
    </span>
  );
}

function Refunds() {
  const { range } = useReports();
  const nav = useNavigate();
  const [tab, setTab] = useState<"all" | "VOID" | "REFUND">("all");
  const [f, setF] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const base = useMemo(() => ADJUSTMENTS.filter((a) => inRange(a.date, range)), [range]);
  const reasons = [...new Set(ADJUSTMENTS.map((a) => a.reason))];
  const rows = base.filter((a) => (tab === "all" || a.type === tab) && (!f.by || a.by.id === f.by) && (!f.reason || a.reason === f.reason) &&
    (!q || a.invoice.toLowerCase().includes(q.toLowerCase()) || a.sessionId.includes(q)));
  const v = base.filter((a) => a.type === "VOID"), r = base.filter((a) => a.type === "REFUND");
  return (
    <>
      <PageHeader title="الاستردادات والإلغاءات" subtitle="كل عملية أثرت على مبلغ فاتورة بعد إصدارها." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="فواتير VOID" value={v.length} tone="danger" />
        <Metric label="المبلغ الملغى" value={fmtMoney(v.reduce((a, x) => a + x.affected, 0))} tone="danger" />
        <Metric label="عمليات REFUND" value={r.length} tone="warning" />
        <Metric label="المبلغ المسترد" value={fmtMoney(r.reduce((a, x) => a + x.affected, 0))} tone="warning" />
      </div>
      <div className="mb-3 inline-flex rounded-lg border bg-card p-0.5">
        {([["all", "الكل", base.length], ["VOID", "VOID", v.length], ["REFUND", "REFUND", r.length]] as const).map(([k, l, n]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("rounded-md px-3.5 py-1.5 text-xs font-semibold", tab === k ? "bg-foreground text-background" : "text-muted-foreground")}>{l} <span className="num opacity-70">{n}</span></button>
        ))}
      </div>
      <FilterBar search={q} onSearch={setQ} placeholder="رقم الفاتورة أو الجلسة..." values={f} onChange={(k, val) => setF({ ...f, [k]: val })} filters={[
        { key: "by", label: "المنفذ", options: STAFF.filter((s) => s.role !== "نادل").map((s) => ({ value: s.id, label: s.name })) },
        { key: "reason", label: "السبب", options: reasons.map((x) => ({ value: x, label: x })) },
      ]} />
      <DataTable rows={rows} rowKey={(a) => a.id} onRowClick={(a) => nav({ to: "/reports/sessions/$sessionId", params: { sessionId: a.sessionId } })}
        empty={{ title: "لا توجد عمليات", text: "لا توجد إلغاءات أو استردادات ضمن الفترة المحددة." }}
        rowClass={(a) => (a.type === "VOID" ? "border-r-2 border-r-destructive" : "border-r-2 border-r-warning")}
        cols={[
          { header: "النوع", cell: (a) => <TypeTag t={a.type} /> },
          { header: "الفاتورة", cell: (a) => <Id>{a.invoice}</Id> },
          { header: "الجلسة", cell: (a) => <Id>{a.sessionId}</Id> },
          { header: "الطاولة", cell: (a) => a.table },
          { header: "المبلغ الأصلي", cell: (a) => <Money v={a.original} className="text-muted-foreground" /> },
          { header: "المبلغ المتأثر", cell: (a) => <Money v={a.affected} className={cn("font-bold", a.type === "VOID" ? "text-destructive" : "text-warning")} /> },
          { header: "السبب", cell: (a) => a.reason },
          { header: "بواسطة", cell: (a) => <span className="text-muted-foreground">{a.by.name}</span> },
          { header: "التاريخ", cell: (a) => <span className="text-muted-foreground">{fmtShortDate(a.date)} · {fmtTime(a.date)}</span> },
        ]}
        card={(a) => (
          <>
            <div className="flex items-center justify-between"><span className="flex items-center gap-2"><TypeTag t={a.type} /><Id>{a.invoice}</Id></span><Money v={a.affected} className={cn("font-bold", a.type === "VOID" ? "text-destructive" : "text-warning")} /></div>
            <div className="mt-2 text-xs text-muted-foreground">{a.reason} · {a.by.name} · طاولة {a.table} · {fmtTime(a.date)}</div>
          </>
        )} />
    </>
  );
}
