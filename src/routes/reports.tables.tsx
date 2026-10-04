import { createFileRoute, Outlet, useMatch, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Metric, FilterBar, DataTable, Money, StatusBadge } from "@/components/reports/ui";
import { useReports } from "@/components/reports/context";
import { SESSIONS, TABLE_COUNT, inRange, fmtMoney, fmtNum, fmtTime, fmtShortDate } from "@/lib/reports-data";

export const Route = createFileRoute("/reports/tables")({
  head: () => ({ meta: [
    { title: "تقرير الطاولات — QRServeUp" },
    { name: "description", content: "كيف تم استخدام الطاولات خلال الفترة المحددة: الجلسات والضيوف والمبيعات والمدة." },
    { property: "og:title", content: "تقرير الطاولات — QRServeUp" },
    { property: "og:description", content: "كيف تم استخدام الطاولات خلال الفترة المحددة." },
  ] }),
  component: TablesPage,
});

function TablesPage() {
  const child = useMatch({ from: "/reports/tables/$tableId", shouldThrow: false });
  if (child) return <Outlet />;
  return <TablesReport />;
}

function TablesReport() {
  const { range } = useReports();
  const nav = useNavigate();
  const [f, setF] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const ss = SESSIONS.filter((s) => inRange(s.startedAt, range));
    return Array.from({ length: TABLE_COUNT }, (_, i) => {
      const t = i + 1, list = ss.filter((s) => s.table === t), valid = list.filter((s) => s.payment !== "void");
      const sales = valid.reduce((a, s) => a + s.total, 0);
      return {
        t, sessions: list.length, guests: list.reduce((a, s) => a + s.guests, 0), orders: list.reduce((a, s) => a + s.orders.length, 0), sales,
        avg: valid.length ? sales / valid.length : 0, dur: list.length ? Math.round(list.reduce((a, s) => a + s.durationMin, 0) / list.length) : 0,
        status: list.some((s) => s.status === "active") ? "busy" : "closed", last: list[0]?.startedAt,
      };
    });
  }, [range]);
  const filtered = rows.filter((r) =>
    (!f.status || r.status === f.status) &&
    (!f.sales || (f.sales === "high" ? r.sales >= 5000 : r.sales < 5000)) &&
    (!f.dur || (f.dur === "long" ? r.dur >= 60 : r.dur < 60)) &&
    (!q || String(r.t) === q.replace(/\D/g, "")));
  const used = rows.filter((r) => r.sessions);
  const totalSales = used.reduce((a, r) => a + r.sales, 0), totalSess = used.reduce((a, r) => a + r.sessions, 0);

  return (
    <>
      <PageHeader title="تقرير الطاولات" subtitle="كيف تم استخدام الطاولات خلال الفترة المحددة." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="إجمالي مبيعات الطاولات" value={fmtMoney(totalSales)} />
        <Metric label="الطاولات المستخدمة" value={`${used.length} / ${TABLE_COUNT}`} />
        <Metric label="الطاولات المشغولة" value={rows.filter((r) => r.status === "busy").length} />
        <Metric label="الطاولات المغلقة" value={rows.filter((r) => r.status !== "busy").length} />
        <Metric label="متوسط مدة الجلسة" value={`${Math.round(used.reduce((a, r) => a + r.dur * r.sessions, 0) / (totalSess || 1))} دقيقة`} />
        <Metric label="متوسط قيمة الجلسة" value={fmtMoney(Math.round(totalSales / (totalSess || 1)))} />
      </div>
      <FilterBar search={q} onSearch={setQ} placeholder="رقم الطاولة..." values={f} onChange={(k, v) => setF({ ...f, [k]: v })} filters={[
        { key: "status", label: "حالة الطاولة", options: [{ value: "busy", label: "مشغولة" }, { value: "closed", label: "مغلقة" }] },
        { key: "sales", label: "قيمة المبيعات", options: [{ value: "high", label: "5,000 ج.م فأكثر" }, { value: "low", label: "أقل من 5,000 ج.م" }] },
        { key: "dur", label: "مدة الجلسة", options: [{ value: "long", label: "ساعة فأكثر" }, { value: "short", label: "أقل من ساعة" }] },
      ]} />
      <DataTable rows={filtered} rowKey={(r) => String(r.t)} onRowClick={(r) => nav({ to: "/reports/tables/$tableId", params: { tableId: String(r.t) } })}
        empty={{ title: "لا توجد طاولات", text: "لا توجد طاولات مطابقة للفلاتر الحالية." }}
        cols={[
          { header: "الطاولة", cell: (r) => <span className="font-bold">طاولة {r.t}</span> },
          { header: "الحالة", cell: (r) => <StatusBadge status={r.status} /> },
          { header: "الجلسات", cell: (r) => <span className="num">{r.sessions}</span> },
          { header: "الضيوف", cell: (r) => <span className="num">{r.guests}</span> },
          { header: "الطلبات", cell: (r) => <span className="num">{r.orders}</span> },
          { header: "إجمالي المبيعات", cell: (r) => <Money v={r.sales} className="font-bold" /> },
          { header: "متوسط الجلسة", cell: (r) => <Money v={Math.round(r.avg * 100) / 100} className="text-muted-foreground" /> },
          { header: "متوسط المدة", cell: (r) => <span className="num">{r.dur} د</span> },
          { header: "آخر نشاط", cell: (r) => <span className="text-muted-foreground">{r.last ? `${fmtShortDate(r.last)} · ${fmtTime(r.last)}` : "—"}</span> },
        ]}
        card={(r) => (
          <>
            <div className="flex items-center justify-between"><span className="font-bold">طاولة {r.t}</span><StatusBadge status={r.status} /></div>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-xs text-muted-foreground">{fmtNum(r.sessions)} جلسة · {r.guests} ضيف · {r.dur} د</span>
              <Money v={r.sales} className="text-base font-bold" />
            </div>
          </>
        )} />
    </>
  );
}
