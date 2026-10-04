import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Metric, Section, Money, Id, StatusBadge } from "@/components/reports/ui";
import { useReports } from "@/components/reports/context";
import { SESSIONS, PAYMENTS, ADJUSTMENTS, TABLE_COUNT, METHOD_LABEL, inRange, fmtMoney, fmtNum, fmtShortDate, fmtTime } from "@/lib/reports-data";

export const Route = createFileRoute("/reports/")({
  head: () => ({ meta: [
    { title: "نظرة عامة — تقارير QRServeUp" },
    { name: "description", content: "نظرة شاملة على أداء المطعم وحركة الطاولات والجلسات والمبيعات." },
    { property: "og:title", content: "نظرة عامة — تقارير QRServeUp" },
    { property: "og:description", content: "نظرة شاملة على أداء المطعم وحركة الطاولات والجلسات والمبيعات." },
  ] }),
  component: Overview,
});

const tip = { contentStyle: { borderRadius: 8, border: "1px solid var(--border)", fontFamily: "Cairo", fontSize: 12, direction: "rtl" as const } };

function Overview() {
  const { range } = useReports();
  const d = useMemo(() => {
    const ss = SESSIONS.filter((s) => inRange(s.startedAt, range));
    const valid = ss.filter((s) => s.payment !== "void");
    const pays = PAYMENTS.filter((p) => inRange(p.date, range) && p.status !== "void");
    const adj = ADJUSTMENTS.filter((a) => inRange(a.date, range));
    const sales = valid.reduce((a, s) => a + s.total, 0) - adj.filter((a) => a.type === "REFUND").reduce((x, a) => x + a.affected, 0);
    const byDay = new Map<string, { label: string; sales: number; sessions: number }>();
    const hourly = range === "today" || range === "yesterday";
    [...ss].reverse().forEach((s) => {
      const k = hourly ? `${s.startedAt.getHours()}` : s.startedAt.toDateString();
      const label = hourly ? fmtTime(new Date(2026, 0, 1, s.startedAt.getHours())) : fmtShortDate(s.startedAt);
      const e = byDay.get(k) ?? { label, sales: 0, sessions: 0 };
      e.sessions++; if (s.payment !== "void") e.sales += s.total; byDay.set(k, e);
    });
    const methods = (["cash", "card", "wallet"] as const).map((m) => ({ name: METHOD_LABEL[m], value: pays.filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0) }));
    const tables = Array.from({ length: TABLE_COUNT }, (_, i) => ({ name: `${i + 1}`, value: ss.filter((s) => s.table === i + 1).length }));
    const orders = ss.flatMap((s) => s.orders);
    return {
      ss, valid, pays, adj, sales, series: [...byDay.values()], methods, tables,
      usedTables: new Set(ss.map((s) => s.table)).size,
      voids: adj.filter((a) => a.type === "VOID"), refunds: adj.filter((a) => a.type === "REFUND"),
      orderStatus: [{ name: "تم التقديم", value: orders.filter((o) => o.status === "served").length }, { name: "في المطبخ", value: orders.filter((o) => o.status === "kitchen").length }],
    };
  }, [range]);
  const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

  return (
    <>
      <PageHeader title="التقارير" subtitle="نظرة شاملة على أداء المطعم وحركة الطاولات والجلسات والمبيعات." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-2"><Metric big label="إجمالي المبيعات" value={fmtMoney(d.sales)} hint="صافي بعد الاستردادات ودون الفواتير الملغاة" /></div>
        <Metric big label="عدد الجلسات" value={fmtNum(d.ss.length)} hint={`${d.ss.filter((s) => s.status === "active").length} نشطة الآن`} />
        <Metric big label="متوسط قيمة الجلسة" value={fmtMoney(Math.round(d.valid.reduce((a, s) => a + s.total, 0) / (d.valid.length || 1)))} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Metric label="الطاولات المستخدمة" value={`${d.usedTables} / ${TABLE_COUNT}`} />
        <Metric label="عدد الفواتير" value={fmtNum(d.ss.filter((s) => s.status !== "active").length)} />
        <Metric label="المدفوعات" value={fmtMoney(d.pays.reduce((a, p) => a + p.amount, 0))} tone="success" />
        <Metric label="الاستردادات" value={fmtMoney(d.refunds.reduce((a, r) => a + r.affected, 0))} hint={`${d.refunds.length} عملية`} tone="warning" />
        <Metric label="الإلغاءات / VOID" value={fmtMoney(d.voids.reduce((a, r) => a + r.affected, 0))} hint={`${d.voids.length} فاتورة`} tone="danger" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Section title="المبيعات عبر الوقت" className="xl:col-span-2">
          <div className="h-64" dir="ltr">
            <ResponsiveContainer>
              <AreaChart data={d.series} margin={{ left: 0, right: 8, top: 8 }}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-1)" stopOpacity={0.18} /><stop offset="1" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" reversed tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis orientation="right" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                <Tooltip {...tip} formatter={(v: number) => [fmtMoney(v), "المبيعات"]} />
                <Area dataKey="sales" stroke="var(--chart-1)" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="طرق الدفع">
          <div className="h-44" dir="ltr">
            <ResponsiveContainer><PieChart><Pie data={d.methods} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">{d.methods.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip {...tip} formatter={(v: number) => fmtMoney(v)} /></PieChart></ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5">
            {d.methods.map((m, i) => (
              <div key={m.name} className="flex items-center gap-2 text-sm"><span className="size-2.5 rounded-sm" style={{ background: COLORS[i] }} /><span className="flex-1">{m.name}</span><Money v={m.value} className="font-semibold" /></div>
            ))}
          </div>
        </Section>
        <Section title="الجلسات عبر الوقت">
          <div className="h-52" dir="ltr">
            <ResponsiveContainer><BarChart data={d.series}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" reversed tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={16} /><YAxis orientation="right" width={28} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} /><Tooltip {...tip} formatter={(v: number) => [v, "جلسات"]} /><Bar dataKey="sessions" fill="var(--chart-3)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
          </div>
        </Section>
        <Section title="استخدام الطاولات" action={<Link to="/reports/tables" className="text-xs font-semibold text-primary">التفاصيل</Link>}>
          <div className="h-52" dir="ltr">
            <ResponsiveContainer><BarChart data={d.tables}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="name" reversed tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} /><YAxis orientation="right" width={28} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} /><Tooltip {...tip} labelFormatter={(l) => `طاولة ${l}`} formatter={(v: number) => [v, "جلسات"]} /><Bar dataKey="value" fill="var(--chart-1)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
          </div>
        </Section>
        <Section title="حالة الطلبات">
          <div className="space-y-3">
            {d.orderStatus.map((o, i) => {
              const total = d.orderStatus.reduce((a, x) => a + x.value, 0) || 1;
              return (
                <div key={o.name}>
                  <div className="mb-1 flex justify-between text-sm"><span>{o.name}</span><span className="num font-semibold">{o.value}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(o.value / total) * 100}%`, background: COLORS[i === 0 ? 1 : 0] }} /></div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 border-t pt-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">آخر الإلغاءات والاستردادات</div>
            {d.adj.slice(0, 4).map((a) => (
              <Link key={a.id} to="/reports/sessions/$sessionId" params={{ sessionId: a.sessionId }} className="flex items-center gap-2 py-1.5 text-sm">
                <StatusBadge status={a.type} /><Id>{a.invoice}</Id><Money v={a.affected} className="mr-auto font-semibold" />
              </Link>
            ))}
            {!d.adj.length && <p className="text-xs text-muted-foreground">لا توجد عمليات في هذه الفترة.</p>}
          </div>
        </Section>
      </div>
    </>
  );
}
