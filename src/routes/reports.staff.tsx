import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, DataTable, StatusBadge } from "@/components/reports/ui";
import { useReports } from "@/components/reports/context";
import { ACTIVITY, STAFF, inRange, relTime } from "@/lib/reports-data";

export const Route = createFileRoute("/reports/staff")({
  head: () => ({ meta: [
    { title: "نشاط الموظفين — QRServeUp" },
    { name: "description", content: "العمليات التشغيلية التي قام بها كل موظف: الجلسات والفواتير والمدفوعات والإلغاءات." },
    { property: "og:title", content: "نشاط الموظفين — QRServeUp" },
    { property: "og:description", content: "العمليات التشغيلية التي قام بها كل موظف." },
  ] }),
  component: StaffPage,
});

function StaffPage() {
  const { range } = useReports();
  const nav = useNavigate();
  const rows = useMemo(() => STAFF.map((s) => {
    const a = ACTIVITY.filter((x) => x.user.id === s.id && inRange(x.date, range));
    const c = (k: string) => a.filter((x) => x.category === k).length;
    return { s, total: a.length, last: a[0]?.date, sessions: c("sessions"), orders: c("orders"), invoices: c("invoices"), payments: c("payments"), voids: c("void"), refunds: c("refund") };
  }).sort((a, b) => b.total - a.total), [range]);
  const Num = ({ v, tone }: { v: number; tone?: string }) => <span className={`num ${v && tone ? tone : v ? "" : "text-muted-foreground"}`}>{v || "—"}</span>;
  return (
    <>
      <PageHeader title="نشاط الموظفين" subtitle="العمليات التشغيلية حسب الموظف. اضغط على موظف لعرض سجل نشاطه." />
      <DataTable rows={rows} rowKey={(r) => r.s.id} onRowClick={(r) => nav({ to: "/reports/activity", search: { user: r.s.id } })}
        empty={{ title: "لا توجد عمليات", text: "لا توجد أنشطة ضمن الفترة المحددة." }}
        cols={[
          { header: "الموظف", cell: (r) => <div><div className="font-semibold">{r.s.name}</div><div className="text-xs text-muted-foreground">{r.s.role}</div></div> },
          { header: "عدد العمليات", cell: (r) => <span className="num font-bold">{r.total}</span> },
          { header: "الجلسات", cell: (r) => <Num v={r.sessions} /> },
          { header: "الطلبات", cell: (r) => <Num v={r.orders} /> },
          { header: "الفواتير", cell: (r) => <Num v={r.invoices} /> },
          { header: "المدفوعات", cell: (r) => <Num v={r.payments} tone="text-success" /> },
          { header: "الإلغاءات", cell: (r) => <Num v={r.voids} tone="text-destructive font-semibold" /> },
          { header: "الاستردادات", cell: (r) => <Num v={r.refunds} tone="text-warning font-semibold" /> },
          { header: "آخر نشاط", cell: (r) => <span className="text-muted-foreground">{r.last ? relTime(r.last) : "—"}</span> },
        ]}
        card={(r) => (
          <>
            <div className="flex items-center justify-between"><div><div className="font-semibold">{r.s.name}</div><div className="text-xs text-muted-foreground">{r.s.role} · {r.last ? relTime(r.last) : "—"}</div></div><span className="num text-lg font-bold">{r.total}</span></div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.payments > 0 && <StatusBadge label={`${r.payments} دفع`} tone="success" />}
              {r.voids > 0 && <StatusBadge label={`${r.voids} VOID`} tone="danger" />}
              {r.refunds > 0 && <StatusBadge label={`${r.refunds} استرداد`} tone="warning" />}
              {r.orders > 0 && <StatusBadge label={`${r.orders} طلب`} tone="neutral" />}
            </div>
          </>
        )} />
    </>
  );
}
