import { createFileRoute, Outlet, useMatch, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, FilterBar, DataTable, Money, StatusBadge, Id } from "@/components/reports/ui";
import { useReports } from "@/components/reports/context";
import { SESSIONS, STAFF, TABLE_COUNT, inRange, fmtDuration, fmtShortDate, fmtTime, fmtMoney } from "@/lib/reports-data";

export const Route = createFileRoute("/reports/sessions")({
  head: () => ({ meta: [
    { title: "تقرير الجلسات — QRServeUp" },
    { name: "description", content: "جميع جلسات الطاولات وحالتها وحركتها المالية." },
    { property: "og:title", content: "تقرير الجلسات — QRServeUp" },
    { property: "og:description", content: "جميع جلسات الطاولات وحالتها وحركتها المالية." },
  ] }),
  component: SessionsPage,
});

function SessionsPage() {
  const child = useMatch({ from: "/reports/sessions/$sessionId", shouldThrow: false });
  return child ? <Outlet /> : <SessionsReport />;
}

function SessionsReport() {
  const { range } = useReports();
  const nav = useNavigate();
  const [f, setF] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const rows = useMemo(() => SESSIONS.filter((s) => inRange(s.startedAt, range) &&
    (!f.table || s.table === Number(f.table)) && (!f.status || s.status === f.status) && (!f.payment || s.payment === f.payment) &&
    (!f.staff || s.staff.id === f.staff) && (!f.amount || (f.amount === "high" ? s.total >= 1000 : s.total < 1000)) &&
    (!q || s.id.includes(q) || s.invoice.toLowerCase().includes(q.toLowerCase()) || `طاولة ${s.table}` === q.trim())), [range, f, q]);
  const totals = rows.filter((s) => s.payment !== "void").reduce((a, s) => a + s.total, 0);

  return (
    <>
      <PageHeader title="تقرير الجلسات" subtitle="جميع جلسات الطاولات وحالتها وحركتها المالية." />
      <FilterBar search={q} onSearch={setQ} placeholder="رقم الجلسة أو الفاتورة..." values={f} onChange={(k, v) => setF({ ...f, [k]: v })} filters={[
        { key: "table", label: "الطاولة", options: Array.from({ length: TABLE_COUNT }, (_, i) => ({ value: String(i + 1), label: `طاولة ${i + 1}` })) },
        { key: "status", label: "حالة الجلسة", options: [{ value: "active", label: "نشطة" }, { value: "closed", label: "مغلقة" }, { value: "void", label: "VOID" }] },
        { key: "payment", label: "حالة الدفع", options: [{ value: "paid", label: "مدفوعة" }, { value: "unpaid", label: "غير مدفوعة" }, { value: "partial", label: "جزئي" }, { value: "refunded", label: "مستردة" }, { value: "void", label: "VOID" }] },
        { key: "staff", label: "الموظف", options: STAFF.filter((s) => s.role !== "نادل").map((s) => ({ value: s.id, label: s.name })) },
        { key: "amount", label: "المبلغ", options: [{ value: "high", label: "1,000 ج.م فأكثر" }, { value: "low", label: "أقل من 1,000 ج.م" }] },
      ]} />
      <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span><b className="num text-foreground">{rows.length}</b> جلسة</span>
        <span>صافي <b className="num text-foreground">{fmtMoney(totals)}</b></span>
      </div>
      <DataTable rows={rows} rowKey={(s) => s.id} onRowClick={(s) => nav({ to: "/reports/sessions/$sessionId", params: { sessionId: s.id } })}
        empty={{ title: "لا توجد جلسات", text: "لم يتم العثور على جلسات ضمن الفترة المحددة." }}
        rowClass={(s) => (s.payment === "void" ? "bg-destructive/[0.03]" : undefined)}
        cols={[
          { header: "الجلسة", cell: (s) => <Id>{s.id}</Id> },
          { header: "الطاولة", cell: (s) => <span className="font-semibold">{s.table}</span> },
          { header: "الضيوف", cell: (s) => s.guests },
          { header: "البدء", cell: (s) => <span className="text-muted-foreground">{fmtShortDate(s.startedAt)} · {fmtTime(s.startedAt)}</span> },
          { header: "المدة", cell: (s) => fmtDuration(s.durationMin) },
          { header: "الطلبات", cell: (s) => s.orders.length },
          { header: "الفرعي", cell: (s) => <Money v={s.subtotal} className="text-muted-foreground" /> },
          { header: "الخصم", cell: (s) => (s.discount ? <Money v={-s.discount} className="text-muted-foreground" /> : <span className="text-muted-foreground">—</span>) },
          { header: "الضريبة", cell: (s) => <Money v={s.tax} className="text-muted-foreground" /> },
          { header: "الخدمة", cell: (s) => <Money v={s.service} className="text-muted-foreground" /> },
          { header: "الإجمالي", cell: (s) => <Money v={s.total} className={s.payment === "void" ? "font-bold text-destructive line-through" : "font-bold"} /> },
          { header: "الدفع", cell: (s) => <StatusBadge status={s.payment} /> },
          { header: "الحالة", cell: (s) => <StatusBadge status={s.status} /> },
        ]}
        card={(s) => (
          <>
            <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><span className="font-bold">طاولة {s.table}</span><Id>{s.id}</Id></span><StatusBadge status={s.payment} /></div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <span className="text-xs text-muted-foreground">{fmtTime(s.startedAt)} · {fmtDuration(s.durationMin)} · {s.orders.length} طلب</span>
              <Money v={s.total} className={s.payment === "void" ? "font-bold text-destructive line-through" : "text-base font-bold"} />
            </div>
          </>
        )} />
    </>
  );
}
