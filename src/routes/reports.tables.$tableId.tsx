import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Metric, DataTable, Money, StatusBadge, Id } from "@/components/reports/ui";
import { useReports } from "@/components/reports/context";
import { SESSIONS, inRange, fmtMoney, fmtDuration, fmtShortDate, fmtTime, RANGES } from "@/lib/reports-data";

export const Route = createFileRoute("/reports/tables/$tableId")({
  head: ({ params }) => ({ meta: [
    { title: `طاولة ${params.tableId} — تقرير الطاولات` },
    { name: "description", content: `سجل جلسات ومبيعات طاولة ${params.tableId}.` },
    { property: "og:title", content: `طاولة ${params.tableId} — تقرير الطاولات` },
    { property: "og:description", content: `سجل جلسات ومبيعات طاولة ${params.tableId}.` },
  ] }),
  component: TableDetails,
});

function TableDetails() {
  const { tableId } = Route.useParams();
  const { range } = useReports();
  const nav = useNavigate();
  const list = SESSIONS.filter((s) => s.table === Number(tableId) && inRange(s.startedAt, range));
  const valid = list.filter((s) => s.payment !== "void");
  const sales = valid.reduce((a, s) => a + s.total, 0);
  const active = list.some((s) => s.status === "active");
  return (
    <>
      <Link to="/reports/tables" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"><ChevronRight className="size-4" />تقرير الطاولات</Link>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">طاولة {tableId}</h1>
        <StatusBadge status={active ? "busy" : "closed"} />
        <span className="text-sm text-muted-foreground">{RANGES.find((r) => r.key === range)?.label}</span>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="col-span-2 md:col-span-1 xl:col-span-2"><Metric big label="إجمالي المبيعات" value={fmtMoney(sales)} /></div>
        <Metric label="الجلسات" value={list.length} />
        <Metric label="الضيوف" value={list.reduce((a, s) => a + s.guests, 0)} />
        <Metric label="الطلبات" value={list.reduce((a, s) => a + s.orders.length, 0)} />
        <Metric label="متوسط الجلسة" value={fmtMoney(Math.round(sales / (valid.length || 1)))} hint={`متوسط المدة ${Math.round(list.reduce((a, s) => a + s.durationMin, 0) / (list.length || 1))} دقيقة`} />
      </div>
      <h2 className="mb-3 text-sm font-bold">الجلسات السابقة</h2>
      <DataTable rows={list} rowKey={(s) => s.id} onRowClick={(s) => nav({ to: "/reports/sessions/$sessionId", params: { sessionId: s.id } })}
        empty={{ title: "لا توجد جلسات", text: "لم يتم العثور على جلسات لهذه الطاولة ضمن الفترة المحددة." }}
        rowClass={(s) => (s.payment === "void" ? "opacity-70" : undefined)}
        cols={[
          { header: "الجلسة", cell: (s) => <Id>{s.id}</Id> },
          { header: "التاريخ", cell: (s) => `${fmtShortDate(s.startedAt)} · ${fmtTime(s.startedAt)}` },
          { header: "الضيوف", cell: (s) => s.guests },
          { header: "الطلبات", cell: (s) => s.orders.length },
          { header: "الإجمالي", cell: (s) => <Money v={s.total} className={s.payment === "void" ? "font-bold line-through text-muted-foreground" : "font-bold"} /> },
          { header: "الدفع", cell: (s) => <StatusBadge status={s.payment} /> },
          { header: "المدة", cell: (s) => fmtDuration(s.durationMin) },
          { header: "الكاشير", cell: (s) => <span className="text-muted-foreground">{s.staff.name}</span> },
        ]}
        card={(s) => (
          <>
            <div className="flex items-center justify-between"><Id>{s.id}</Id><StatusBadge status={s.payment} /></div>
            <div className="mt-2 flex items-end justify-between"><span className="text-xs text-muted-foreground">{fmtShortDate(s.startedAt)} · {fmtTime(s.startedAt)} · {s.guests} ضيوف</span><Money v={s.total} className="font-bold" /></div>
          </>
        )} />
    </>
  );
}
