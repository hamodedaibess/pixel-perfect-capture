import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, ChevronDown, AlertTriangle, Undo2, PlayCircle, ClipboardList, ChefHat, CheckCircle2, Receipt, CreditCard, Lock, Ban, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { Section, Money, StatusBadge, Id, KV } from "@/components/reports/ui";
import { sessionById, METHOD_LABEL, fmtDate, fmtTime, fmtDuration, fmtDateTime, type Session } from "@/lib/reports-data";

export const Route = createFileRoute("/reports/sessions/$sessionId")({
  loader: ({ params }) => { const s = sessionById(params.sessionId); if (!s) throw notFound(); return { id: s.id }; },
  head: ({ params }) => ({ meta: [
    { title: `جلسة #${params.sessionId} — QRServeUp` },
    { name: "description", content: "تفاصيل الجلسة: الطلبات، الخط الزمني، والملخص المالي." },
    { property: "og:title", content: `جلسة #${params.sessionId} — QRServeUp` },
    { property: "og:description", content: "تفاصيل الجلسة: الطلبات، الخط الزمني، والملخص المالي." },
  ] }),
  notFoundComponent: () => <div className="surface p-10 text-center text-sm">الجلسة غير موجودة.</div>,
  component: SessionDetails,
});

function SessionDetails() {
  const { id } = Route.useLoaderData();
  const s = sessionById(id)!;
  const isVoid = s.payment === "void";
  return (
    <>
      <Link to="/reports/sessions" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"><ChevronRight className="size-4" />تقرير الجلسات</Link>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5"><h1 className="text-2xl font-bold">جلسة <span className="id-tag text-[0.85em] text-foreground">#{s.id}</span></h1><StatusBadge status={s.payment} /></div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link to="/reports/tables/$tableId" params={{ tableId: String(s.table) }} className="font-semibold text-foreground hover:text-primary">طاولة {s.table}</Link> · {fmtDate(s.startedAt)} · {fmtTime(s.startedAt)} · الفاتورة <Id>{s.invoice}</Id>
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border shadow-card md:grid-cols-4">
        {[["الضيوف", s.guests], ["الطلبات", s.orders.length], ["المدة", fmtDuration(s.durationMin)]].map(([k, v]) => (
          <div key={k} className="bg-card p-4"><div className="text-xs text-muted-foreground">{k}</div><div className="num mt-1 text-lg font-bold">{v}</div></div>
        ))}
        <div className="bg-card p-4"><div className="text-xs text-muted-foreground">الإجمالي</div><Money v={s.total} className={cn("mt-1 block text-xl font-bold", isVoid && "text-destructive line-through")} /></div>
      </div>

      {s.voidInfo && <VoidPanel s={s} />}
      {s.refundInfo && <RefundPanel s={s} />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Section title={`الطلبات (${s.orders.length})`}><div className="space-y-2">{s.orders.map((o, i) => <OrderCard key={o.id} o={o} open={i === 0} />)}</div></Section>
          <Section title="الخط الزمني للجلسة"><Timeline s={s} /></Section>
        </div>
        <div className="space-y-4">
          <Financial s={s} />
          <Section title="معلومات الجلسة">
            <KV k="الكاشير" v={s.staff.name} />
            <KV k="طريقة الدفع" v={s.payment === "unpaid" ? "—" : METHOD_LABEL[s.method]} />
            <KV k="حالة الجلسة" v={<StatusBadge status={s.status} />} />
            <KV k="بدأت" v={fmtTime(s.startedAt)} />
          </Section>
        </div>
      </div>
    </>
  );
}

function VoidPanel({ s }: { s: Session }) {
  const v = s.voidInfo!;
  return (
    <div className="mb-4 rounded-lg border border-destructive/25 bg-destructive/[0.04] p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-md bg-destructive/10"><AlertTriangle className="size-4 text-destructive" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-destructive">الفاتورة ملغاة (VOID)</h3><StatusBadge status="void" /></div>
          <p className="mt-0.5 text-xs text-muted-foreground">هذه الفاتورة لم تعد جزءاً من المبيعات الفعلية.</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">المبلغ الملغى</dt><dd className="font-bold text-destructive"><Money v={s.total} /></dd></div>
            <div><dt className="text-xs text-muted-foreground">السبب</dt><dd className="font-semibold">{v.reason}</dd></div>
            <div><dt className="text-xs text-muted-foreground">تم الإلغاء بواسطة</dt><dd className="font-semibold">{v.by.name} <span className="text-xs font-normal text-muted-foreground">({v.by.role})</span></dd></div>
            <div><dt className="text-xs text-muted-foreground">التاريخ</dt><dd className="font-semibold">{fmtDateTime(v.at)}</dd></div>
          </dl>
          <Link to="/reports/activity" search={{ q: s.invoice }} className="mt-3 inline-block text-xs font-semibold text-destructive hover:underline">عرض حدث السجل المرتبط ←</Link>
        </div>
      </div>
    </div>
  );
}
function RefundPanel({ s }: { s: Session }) {
  const r = s.refundInfo!;
  return (
    <div className="mb-4 rounded-lg border border-warning/30 bg-warning/[0.05] p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-md bg-warning/15"><Undo2 className="size-4 text-warning" /></div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-warning">تم استرداد مبلغ من هذه الفاتورة</h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">المبلغ المسترد</dt><dd className="font-bold text-warning"><Money v={r.amount} /></dd></div>
            <div><dt className="text-xs text-muted-foreground">السبب</dt><dd className="font-semibold">{r.reason}</dd></div>
            <div><dt className="text-xs text-muted-foreground">بواسطة</dt><dd className="font-semibold">{r.by.name}</dd></div>
            <div><dt className="text-xs text-muted-foreground">التاريخ</dt><dd className="font-semibold">{fmtDateTime(r.at)}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ o, open: initial }: { o: Session["orders"][number]; open: boolean }) {
  const [open, setOpen] = useState(initial);
  const lineTotal = (it: (typeof o.items)[number]) => it.qty * (it.price + (it.mods?.reduce((a, m) => a + m.price, 0) ?? 0));
  const total = o.items.reduce((a, it) => a + lineTotal(it), 0);
  return (
    <div className="overflow-hidden rounded-md border">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-3 py-2.5 text-right hover:bg-muted/40">
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        <span className="font-semibold">طلب <Id>{o.id}</Id></span>
        <StatusBadge status={o.status} />
        <span className="hidden text-xs text-muted-foreground sm:inline">{fmtTime(o.time)} · {o.items.length} صنف</span>
        <Money v={total} className="mr-auto font-bold" />
      </button>
      {open && (
        <div className="border-t bg-muted/30 px-3 py-2">
          <div className="grid grid-cols-[minmax(0,1fr)_40px_64px_88px] gap-2 py-1 text-[11px] font-semibold text-muted-foreground"><span>الصنف</span><span className="text-center">الكمية</span><span>السعر</span><span className="text-left">الإجمالي</span></div>
          {o.items.map((it, i) => (
            <div key={i} className="border-t border-border/60 py-1.5 text-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_40px_64px_88px] gap-2"><span className="truncate font-medium">{it.name}</span><span className="num text-center">{it.qty}</span><span className="num text-muted-foreground">{it.price}</span><Money v={lineTotal(it)} className="text-left font-semibold" /></div>
              {it.mods?.map((m) => <div key={m.name} className="mr-3 text-xs text-muted-foreground">↳ {m.name} <span className="num">+{m.price}</span></div>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Timeline({ s }: { s: Session }) {
  const end = new Date(s.startedAt.getTime() + s.durationMin * 60000);
  const ev: { icon: typeof PlayCircle; name: string; at: Date; who?: string; amount?: number; ref?: string; tone?: string }[] = [
    { icon: PlayCircle, name: "الجلسة بدأت", at: s.startedAt, ref: `طاولة ${s.table}` },
  ];
  s.orders.forEach((o) => {
    ev.push({ icon: ClipboardList, name: "تم إنشاء الطلب", at: o.time, ref: `#${o.id}` });
    ev.push({ icon: ChefHat, name: "تم إرسال الطلب للمطبخ", at: new Date(o.time.getTime() + 60000), ref: `#${o.id}` });
    if (o.status === "served") ev.push({ icon: CheckCircle2, name: "تم تقديم الطلب", at: new Date(o.time.getTime() + 15 * 60000), ref: `#${o.id}` });
  });
  if (s.status !== "active") {
    if (s.discount) ev.push({ icon: Percent, name: "تم تطبيق خصم", at: new Date(end.getTime() - 180000), amount: s.discount });
    ev.push({ icon: Receipt, name: "تم إنشاء الفاتورة", at: new Date(end.getTime() - 120000), who: s.staff.name, amount: s.total, ref: s.invoice });
    ev.push({ icon: CreditCard, name: `تم الدفع (${METHOD_LABEL[s.method]})`, at: new Date(end.getTime() - 60000), who: s.staff.name, amount: s.payment === "partial" ? Math.round(s.total * 0.6) : s.total, tone: "success" });
    ev.push({ icon: Lock, name: "تم إغلاق الجلسة", at: end, who: s.staff.name });
  }
  if (s.voidInfo) ev.push({ icon: Ban, name: "تم إلغاء الفاتورة (VOID)", at: s.voidInfo.at, who: s.voidInfo.by.name, amount: s.total, ref: s.invoice, tone: "danger" });
  if (s.refundInfo) ev.push({ icon: Undo2, name: "تم استرداد مبلغ", at: s.refundInfo.at, who: s.refundInfo.by.name, amount: s.refundInfo.amount, ref: s.invoice, tone: "warning" });
  ev.sort((a, b) => a.at.getTime() - b.at.getTime());
  return (
    <ol className="relative">
      {ev.map((e, i) => (
        <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
          {i < ev.length - 1 && <span className="absolute right-[13px] top-7 bottom-0 w-px bg-border" />}
          <span className={cn("z-10 grid size-7 shrink-0 place-items-center rounded-full border bg-card",
            e.tone === "danger" ? "border-destructive/30 text-destructive" : e.tone === "warning" ? "border-warning/40 text-warning" : e.tone === "success" ? "border-success/30 text-success" : "text-muted-foreground")}>
            <e.icon className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className={cn("text-sm font-semibold", e.tone === "danger" && "text-destructive", e.tone === "warning" && "text-warning")}>{e.name}</span>
              <span className="num text-xs text-muted-foreground">{fmtTime(e.at)}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {e.who && <span>{e.who}</span>}{e.ref && <span className="id-tag">{e.ref}</span>}{e.amount != null && <Money v={e.amount} className="font-semibold text-foreground" />}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Financial({ s }: { s: Session }) {
  const isVoid = s.payment === "void";
  const Row = ({ k, v, muted }: { k: string; v: number; muted?: boolean }) => (
    <div className="flex items-center justify-between py-1.5 text-sm"><span className="text-muted-foreground">{k}</span><Money v={v} className={muted ? "text-muted-foreground" : "font-medium"} /></div>
  );
  return (
    <section className={cn("surface overflow-hidden", isVoid && "border-destructive/25")}>
      <div className="flex items-center justify-between border-b px-4 py-3"><h2 className="text-sm font-bold">الملخص المالي</h2><StatusBadge status={s.payment} /></div>
      <div className="px-4 py-2">
        <Row k="المجموع الفرعي" v={s.subtotal} />
        {s.discount > 0 && <Row k="الخصم" v={-s.discount} />}
        <Row k="الخدمة (12%)" v={s.service} />
        <Row k="الضريبة (14%)" v={s.tax} />
        <div className="mt-1 flex items-center justify-between border-t pt-3 pb-1">
          <span className="font-bold">{s.refundInfo ? "المبلغ الأصلي" : "الإجمالي"}</span>
          <Money v={s.total} className={cn("text-xl font-bold", isVoid && "text-destructive line-through")} />
        </div>
        {s.refundInfo && (
          <>
            <div className="flex items-center justify-between py-1.5 text-sm text-warning"><span>المبلغ المسترد</span><Money v={-s.refundInfo.amount} className="font-semibold" /></div>
            <div className="flex items-center justify-between border-t py-2"><span className="font-bold">الصافي بعد الاسترداد</span><Money v={s.total - s.refundInfo.amount} className="text-xl font-bold" /></div>
          </>
        )}
        {isVoid && <div className="my-2 rounded-md bg-destructive/[0.06] px-3 py-2 text-xs font-medium text-destructive">لا يُحتسب هذا المبلغ ضمن المبيعات — الصافي 0 ج.م</div>}
        {s.payment === "partial" && <div className="my-2 rounded-md bg-warning/10 px-3 py-2 text-xs font-medium text-warning">مدفوع جزئياً: <Money v={Math.round(s.total * 0.6)} /> — المتبقي <Money v={s.total - Math.round(s.total * 0.6)} /></div>}
      </div>
    </section>
  );
}
