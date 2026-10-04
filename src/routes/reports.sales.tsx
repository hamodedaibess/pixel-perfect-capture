import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, Metric, Section, Money } from "@/components/reports/ui";
import { useReports } from "@/components/reports/context";
import { SESSIONS, ADJUSTMENTS, inRange, fmtMoney } from "@/lib/reports-data";

export const Route = createFileRoute("/reports/sales")({
  head: () => ({ meta: [
    { title: "المبيعات والملخص المالي — QRServeUp" },
    { name: "description", content: "إجمالي المبيعات والخصومات والضرائب والخدمة وصافي الإيرادات." },
    { property: "og:title", content: "المبيعات والملخص المالي — QRServeUp" },
    { property: "og:description", content: "إجمالي المبيعات والخصومات والضرائب والخدمة وصافي الإيرادات." },
  ] }),
  component: Sales,
});

function Sales() {
  const { range } = useReports();
  const d = useMemo(() => {
    const ss = SESSIONS.filter((s) => inRange(s.startedAt, range) && s.status !== "active");
    const valid = ss.filter((s) => s.payment !== "void");
    const sum = (k: "subtotal" | "discount" | "tax" | "service" | "total", list = valid) => list.reduce((a, s) => a + s[k], 0);
    const adj = ADJUSTMENTS.filter((a) => inRange(a.date, range));
    const refunds = adj.filter((a) => a.type === "REFUND").reduce((a, x) => a + x.affected, 0);
    const voids = adj.filter((a) => a.type === "VOID").reduce((a, x) => a + x.affected, 0);
    const items = new Map<string, { qty: number; total: number }>();
    valid.flatMap((s) => s.orders.flatMap((o) => o.items)).forEach((it) => { const e = items.get(it.name) ?? { qty: 0, total: 0 }; e.qty += it.qty; e.total += it.qty * it.price; items.set(it.name, e); });
    return { gross: sum("subtotal", ss), voids, subtotal: sum("subtotal"), discount: sum("discount"), tax: sum("tax"), service: sum("service"), total: sum("total"), refunds, items: [...items.entries()].sort((a, b) => b[1].total - a[1].total) };
  }, [range]);
  const net = d.total - d.refunds;
  const maxItem = d.items[0]?.[1].total || 1;
  return (
    <>
      <PageHeader title="المبيعات" subtitle="كيف تم احتساب صافي المبيعات خلال الفترة." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-2"><Metric big label="صافي المبيعات" value={fmtMoney(net)} hint="بعد الخصومات والاستردادات، ودون الفواتير الملغاة" /></div>
        <Metric big label="الضرائب المحصلة" value={fmtMoney(d.tax)} />
        <Metric big label="رسوم الخدمة" value={fmtMoney(d.service)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="من الإجمالي إلى الصافي">
          {[
            ["المبيعات الإجمالية (كل الفواتير)", d.gross, ""],
            ["− فواتير ملغاة (VOID)", -d.voids, "text-destructive"],
            ["المجموع الفرعي", d.subtotal, "font-semibold"],
            ["− الخصومات", -d.discount, ""],
            ["+ الخدمة", d.service, ""],
            ["+ الضريبة", d.tax, ""],
            ["الإجمالي", d.total, "font-semibold"],
            ["− الاستردادات", -d.refunds, "text-warning"],
          ].map(([k, v, c]) => (
            <div key={k as string} className={`flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0 ${c}`}><span>{k}</span><Money v={v as number} /></div>
          ))}
          <div className="mt-2 flex items-center justify-between rounded-md bg-success/[0.07] px-3 py-3"><span className="font-bold">صافي المبيعات</span><Money v={net} className="text-xl font-bold text-success" /></div>
        </Section>
        <Section title="الأصناف الأكثر مبيعاً">
          <div className="space-y-3">
            {d.items.map(([name, v]) => (
              <div key={name}>
                <div className="mb-1 flex items-baseline justify-between text-sm"><span className="font-medium">{name} <span className="text-xs text-muted-foreground">× {v.qty}</span></span><Money v={v.total} className="font-semibold" /></div>
                <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(v.total / maxItem) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
