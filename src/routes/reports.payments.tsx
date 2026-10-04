import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Metric, FilterBar, DataTable, Money, StatusBadge, Id } from "@/components/reports/ui";
import { useReports } from "@/components/reports/context";
import { PAYMENTS, STAFF, METHOD_LABEL, inRange, fmtMoney, fmtShortDate, fmtTime } from "@/lib/reports-data";

export const Route = createFileRoute("/reports/payments")({
  head: () => ({ meta: [
    { title: "تقرير المدفوعات — QRServeUp" },
    { name: "description", content: "جميع عمليات الدفع حسب الطريقة والكاشير والحالة." },
    { property: "og:title", content: "تقرير المدفوعات — QRServeUp" },
    { property: "og:description", content: "جميع عمليات الدفع حسب الطريقة والكاشير والحالة." },
  ] }),
  component: Payments,
});

const PSTATUS: Record<string, string> = { paid: "paid", partial: "partial", refunded: "refunded", void: "void" };

function Payments() {
  const { range } = useReports();
  const nav = useNavigate();
  const [f, setF] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const base = useMemo(() => PAYMENTS.filter((p) => inRange(p.date, range)), [range]);
  const rows = base.filter((p) => (!f.method || p.method === f.method) && (!f.status || p.status === f.status) && (!f.cashier || p.cashier.id === f.cashier) &&
    (!q || p.invoice.toLowerCase().includes(q.toLowerCase()) || p.sessionId.includes(q)));
  const ok = base.filter((p) => p.status !== "void");
  const total = ok.reduce((a, p) => a + p.amount, 0);
  const by = (m: string) => ok.filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0);
  return (
    <>
      <PageHeader title="تقرير المدفوعات" subtitle="المدفوعات المسجلة حسب الطريقة والكاشير." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="col-span-2 md:col-span-1 xl:col-span-2"><Metric big label="إجمالي المدفوعات" value={fmtMoney(total)} hint="دون الفواتير الملغاة" tone="success" /></div>
        <Metric label="عدد العمليات" value={ok.length} hint={`متوسط ${fmtMoney(Math.round(total / (ok.length || 1)))}`} />
        <Metric label="نقدي" value={fmtMoney(by("cash"))} />
        <Metric label="بطاقات" value={fmtMoney(by("card"))} />
        <Metric label="محافظ" value={fmtMoney(by("wallet"))} />
      </div>
      <FilterBar search={q} onSearch={setQ} placeholder="رقم الفاتورة أو الجلسة..." values={f} onChange={(k, v) => setF({ ...f, [k]: v })} filters={[
        { key: "method", label: "طريقة الدفع", options: [{ value: "cash", label: "نقدي" }, { value: "card", label: "بطاقة" }, { value: "wallet", label: "محفظة" }] },
        { key: "status", label: "الحالة", options: [{ value: "paid", label: "مدفوع" }, { value: "partial", label: "جزئي" }, { value: "refunded", label: "مسترد" }, { value: "void", label: "ملغى" }] },
        { key: "cashier", label: "الكاشير", options: STAFF.filter((s) => s.role !== "نادل").map((s) => ({ value: s.id, label: s.name })) },
      ]} />
      <DataTable rows={rows} rowKey={(p) => p.id} onRowClick={(p) => nav({ to: "/reports/sessions/$sessionId", params: { sessionId: p.sessionId } })}
        empty={{ title: "لا توجد مدفوعات", text: "لا توجد مدفوعات مطابقة للفلاتر الحالية." }}
        rowClass={(p) => (p.status === "void" ? "bg-destructive/[0.03]" : undefined)}
        cols={[
          { header: "الفاتورة", cell: (p) => <Id>{p.invoice}</Id> },
          { header: "الجلسة", cell: (p) => <Id>{p.sessionId}</Id> },
          { header: "الطاولة", cell: (p) => p.table },
          { header: "المبلغ", cell: (p) => <Money v={p.amount} className={p.status === "void" ? "font-bold text-destructive line-through" : "font-bold"} /> },
          { header: "الطريقة", cell: (p) => METHOD_LABEL[p.method] },
          { header: "الكاشير", cell: (p) => <span className="text-muted-foreground">{p.cashier.name}</span> },
          { header: "التاريخ", cell: (p) => <span className="text-muted-foreground">{fmtShortDate(p.date)} · {fmtTime(p.date)}</span> },
          { header: "الحالة", cell: (p) => <StatusBadge status={PSTATUS[p.status]} label={p.status === "paid" ? "مدفوع" : p.status === "refunded" ? "مسترد" : undefined} /> },
        ]}
        card={(p) => (
          <>
            <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Id>{p.invoice}</Id><span className="text-xs text-muted-foreground">طاولة {p.table}</span></span><StatusBadge status={PSTATUS[p.status]} label={p.status === "paid" ? "مدفوع" : undefined} /></div>
            <div className="mt-2 flex items-end justify-between"><span className="text-xs text-muted-foreground">{METHOD_LABEL[p.method]} · {p.cashier.name} · {fmtTime(p.date)}</span><Money v={p.amount} className={p.status === "void" ? "font-bold text-destructive line-through" : "text-base font-bold"} /></div>
          </>
        )} />
    </>
  );
}
