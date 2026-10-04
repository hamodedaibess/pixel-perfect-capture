// SAMPLE DATA ONLY — replace with the existing QRServeUp tenant-scoped APIs.
// Shapes mirror the existing domain: sessions, orders, invoices, payments, voids, refunds, audit logs.

export type PaymentState = "paid" | "unpaid" | "partial" | "refunded" | "void";
export type SessionStatus = "active" | "closed" | "void";
export type Method = "cash" | "card" | "wallet";
export type Role = "مدير المطعم" | "كاشير" | "نادل";

export interface OrderItem { name: string; qty: number; price: number; mods?: { name: string; price: number }[] }
export interface Order { id: string; status: "served" | "kitchen" | "new" | "cancelled"; time: Date; items: OrderItem[] }
export interface Staff { id: string; name: string; role: Role }
export interface Session {
  id: string; table: number; guests: number; startedAt: Date; durationMin: number;
  orders: Order[]; subtotal: number; discount: number; tax: number; service: number; total: number;
  payment: PaymentState; status: SessionStatus; staff: Staff; invoice: string; method: Method;
  voidInfo?: { reason: string; by: Staff; at: Date };
  refundInfo?: { amount: number; reason: string; by: Staff; at: Date };
}
export interface Payment { id: string; invoice: string; sessionId: string; table: number; amount: number; method: Method; cashier: Staff; date: Date; status: "paid" | "partial" | "refunded" | "void" }
export interface Adjustment { id: string; type: "VOID" | "REFUND"; invoice: string; sessionId: string; table: number; original: number; affected: number; reason: string; by: Staff; date: Date }
export type ActivityCategory = "sessions" | "orders" | "tables" | "invoices" | "payments" | "void" | "refund" | "discounts" | "users" | "settings" | "auth";
export interface Activity {
  id: string; category: ActivityCategory; action: string; user: Staff; date: Date;
  entity: string; entityId: string; sessionId?: string; table?: number; invoice?: string; amount?: number;
  before?: Record<string, string>; after?: Record<string, string>; reason?: string;
}

export const NOW = new Date(2026, 9, 5, 13, 20);

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const int = (a: number, b: number) => Math.floor(a + rnd() * (b - a + 1));

export const STAFF: Staff[] = [
  { id: "u1", name: "أحمد سمير", role: "كاشير" },
  { id: "u2", name: "منى خالد", role: "كاشير" },
  { id: "u3", name: "محمود علي", role: "نادل" },
  { id: "u4", name: "يوسف حسن", role: "نادل" },
  { id: "u5", name: "سارة إبراهيم", role: "مدير المطعم" },
];
const MENU = [
  { name: "استيك", price: 90 }, { name: "برجر لحم", price: 140 }, { name: "سلطة سيزر", price: 75 },
  { name: "باستا ألفريدو", price: 120 }, { name: "عصير مانجو", price: 45 }, { name: "قهوة تركي", price: 35 },
  { name: "شيشة تفاح", price: 80 }, { name: "تشيز كيك", price: 65 }, { name: "فراخ مشوية", price: 160 },
];
const MODS = [{ name: "إضافة جبنة", price: 15 }, { name: "صوص إضافي", price: 10 }, { name: "حجم كبير", price: 20 }];
const VOID_REASONS = ["فاتورة مكررة", "خطأ في الإدخال", "طلب العميل الإلغاء"];
const REFUND_REASONS = ["صنف غير مطابق", "تأخر الطلب", "خطأ في الحساب"];
export const TABLE_COUNT = 14;

const cashiers = STAFF.filter((s) => s.role !== "نادل");
const sessions: Session[] = [];
for (let d = 0; d < 30; d++) {
  const n = d === 0 ? 14 : int(10, 20);
  for (let i = 0; i < n; i++) {
    const start = new Date(NOW);
    start.setDate(NOW.getDate() - d);
    start.setHours(int(11, 23), int(0, 59), 0, 0);
    if (start > NOW) start.setHours(int(11, 12));
    const orders: Order[] = Array.from({ length: int(1, 4) }, (_, k) => ({
      id: String(8000 + sessions.length * 4 + k),
      status: "served" as const,
      time: new Date(start.getTime() + k * 12 * 60000),
      items: Array.from({ length: int(1, 3) }, () => {
        const m = pick(MENU);
        return { ...m, qty: int(1, 4), mods: rnd() > 0.7 ? [pick(MODS)] : undefined };
      }),
    }));
    const subtotal = orders.flatMap((o) => o.items).reduce((s, it) => s + it.qty * (it.price + (it.mods?.reduce((a, m) => a + m.price, 0) ?? 0)), 0);
    const discount = rnd() > 0.8 ? Math.round(subtotal * 0.1) : 0;
    const service = Math.round((subtotal - discount) * 0.12);
    const tax = Math.round((subtotal - discount + service) * 0.14);
    const total = subtotal - discount + service + tax;
    const active = d === 0 && i < 4;
    if (active) orders[orders.length - 1].status = "kitchen";
    const r = rnd();
    const staff = pick(cashiers);
    const s: Session = {
      id: String(1286888 - sessions.length * 7), table: int(1, TABLE_COUNT), guests: int(1, 6), startedAt: start,
      durationMin: active ? Math.max(5, Math.round((NOW.getTime() - start.getTime()) / 60000)) : int(25, 110),
      orders, subtotal, discount, tax, service, total, staff, method: pick(["cash", "cash", "card", "card", "wallet"] as Method[]),
      invoice: `INV-${String(4200 - sessions.length).padStart(4, "0")}`,
      payment: active ? "unpaid" : r < 0.05 ? "void" : r < 0.09 ? "refunded" : r < 0.12 ? "partial" : "paid",
      status: active ? "active" : r < 0.05 ? "void" : "closed",
    };
    if (s.payment === "void") s.voidInfo = { reason: pick(VOID_REASONS), by: staff, at: new Date(start.getTime() + s.durationMin * 60000) };
    if (s.payment === "refunded") s.refundInfo = { amount: Math.round(total * pick([0.2, 0.35, 1])), reason: pick(REFUND_REASONS), by: STAFF[4], at: new Date(start.getTime() + s.durationMin * 60000 + 300000) };
    sessions.push(s);
  }
}
// Make the hero example deterministic: session #1286888 on table 1 is VOID.
Object.assign(sessions[0], { table: 1, status: "closed", payment: "void", voidInfo: { reason: "فاتورة مكررة", by: STAFF[0], at: new Date(2026, 9, 5, 12, 45) }, startedAt: new Date(2026, 9, 5, 12, 44), durationMin: 18 });

export const SESSIONS = sessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

export const PAYMENTS: Payment[] = SESSIONS.filter((s) => s.payment !== "unpaid").map((s, i) => ({
  id: `p${i}`, invoice: s.invoice, sessionId: s.id, table: s.table, method: s.method, cashier: s.staff,
  amount: s.payment === "partial" ? Math.round(s.total * 0.6) : s.total,
  date: new Date(s.startedAt.getTime() + s.durationMin * 60000),
  status: s.payment === "unpaid" ? "partial" : (s.payment as Payment["status"]),
}));

export const ADJUSTMENTS: Adjustment[] = SESSIONS.flatMap((s) => {
  if (s.voidInfo) return [{ id: `a${s.id}`, type: "VOID" as const, invoice: s.invoice, sessionId: s.id, table: s.table, original: s.total, affected: s.total, reason: s.voidInfo.reason, by: s.voidInfo.by, date: s.voidInfo.at }];
  if (s.refundInfo) return [{ id: `a${s.id}`, type: "REFUND" as const, invoice: s.invoice, sessionId: s.id, table: s.table, original: s.total, affected: s.refundInfo.amount, reason: s.refundInfo.reason, by: s.refundInfo.by, date: s.refundInfo.at }];
  return [];
});

const acts: Activity[] = [];
for (const s of SESSIONS.slice(0, 260)) {
  const end = new Date(s.startedAt.getTime() + s.durationMin * 60000);
  acts.push({ id: `e${acts.length}`, category: "sessions", action: "تم فتح جلسة", user: pick(STAFF.filter((x) => x.role === "نادل")), date: s.startedAt, entity: "جلسة", entityId: s.id, sessionId: s.id, table: s.table });
  s.orders.forEach((o) => acts.push({ id: `e${acts.length}`, category: "orders", action: "تم إنشاء طلب", user: pick(STAFF.filter((x) => x.role === "نادل")), date: o.time, entity: "طلب", entityId: o.id, sessionId: s.id, table: s.table, amount: o.items.reduce((a, it) => a + it.qty * it.price, 0) }));
  if (s.status === "active") continue;
  acts.push({ id: `e${acts.length}`, category: "invoices", action: "تم إنشاء فاتورة", user: s.staff, date: new Date(end.getTime() - 120000), entity: "فاتورة", entityId: s.invoice, sessionId: s.id, table: s.table, invoice: s.invoice, amount: s.total });
  acts.push({ id: `e${acts.length}`, category: "payments", action: "تم تسجيل دفعة", user: s.staff, date: new Date(end.getTime() - 60000), entity: "فاتورة", entityId: s.invoice, sessionId: s.id, table: s.table, invoice: s.invoice, amount: s.total, before: { status: "UNPAID" }, after: { status: "PAID" } });
  if (s.voidInfo) acts.push({ id: `e${acts.length}`, category: "void", action: "تم إلغاء فاتورة", user: s.voidInfo.by, date: s.voidInfo.at, entity: "فاتورة", entityId: s.invoice, sessionId: s.id, table: s.table, invoice: s.invoice, amount: s.total, before: { status: "PAID" }, after: { status: "VOID" }, reason: s.voidInfo.reason });
  if (s.refundInfo) acts.push({ id: `e${acts.length}`, category: "refund", action: "تم استرداد مبلغ", user: s.refundInfo.by, date: s.refundInfo.at, entity: "فاتورة", entityId: s.invoice, sessionId: s.id, table: s.table, invoice: s.invoice, amount: s.refundInfo.amount, before: { status: "PAID", refunded: "0" }, after: { status: "REFUNDED", refunded: String(s.refundInfo.amount) }, reason: s.refundInfo.reason });
  if (s.discount) acts.push({ id: `e${acts.length}`, category: "discounts", action: "تم تطبيق خصم", user: STAFF[4], date: new Date(end.getTime() - 150000), entity: "فاتورة", entityId: s.invoice, sessionId: s.id, table: s.table, invoice: s.invoice, amount: s.discount, before: { discount: "0" }, after: { discount: String(s.discount) } });
  acts.push({ id: `e${acts.length}`, category: "sessions", action: "تم إغلاق جلسة", user: s.staff, date: end, entity: "جلسة", entityId: s.id, sessionId: s.id, table: s.table });
}
acts.push({ id: "eauth", category: "auth", action: "تسجيل دخول", user: STAFF[0], date: new Date(2026, 9, 5, 11, 2), entity: "مستخدم", entityId: "u1" });
acts.push({ id: "eset", category: "settings", action: "تعديل نسبة الخدمة", user: STAFF[4], date: new Date(2026, 9, 4, 10, 15), entity: "إعدادات", entityId: "service_charge", before: { service_charge: "10%" }, after: { service_charge: "12%" } });
export const ACTIVITY = acts.sort((a, b) => b.date.getTime() - a.date.getTime());

// ---------- helpers ----------
export type RangeKey = "today" | "yesterday" | "week" | "month";
export const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "اليوم" }, { key: "yesterday", label: "أمس" }, { key: "week", label: "هذا الأسبوع" }, { key: "month", label: "هذا الشهر" },
];
export function inRange(d: Date, r: RangeKey) {
  const start = new Date(NOW); start.setHours(0, 0, 0, 0);
  if (r === "today") return d >= start;
  if (r === "yesterday") { const y = new Date(start); y.setDate(y.getDate() - 1); return d >= y && d < start; }
  const s = new Date(start); s.setDate(s.getDate() - (r === "week" ? 6 : 29));
  return d >= s;
}

export const fmtMoney = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ج.م`;
export const fmtNum = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });
export const fmtTime = (d: Date) => { const h = d.getHours(); return `${((h + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "ص" : "م"}`; };
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
export const fmtDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
export const fmtShortDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const fmtDateTime = (d: Date) => `${fmtDate(d)} - ${fmtTime(d)}`;
export const fmtDuration = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} س ${m % 60} د` : `${m} دقيقة`);
export const relTime = (d: Date) => {
  const m = Math.round((NOW.getTime() - d.getTime()) / 60000);
  if (m < 60) return `منذ ${m} دقيقة`;
  if (m < 1440) return `منذ ${Math.round(m / 60)} ساعة`;
  return fmtShortDate(d);
};
export const METHOD_LABEL: Record<Method, string> = { cash: "نقدي", card: "بطاقة", wallet: "محفظة" };
export const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  sessions: "جلسات", orders: "طلبات", tables: "طاولات", invoices: "فواتير", payments: "مدفوعات", void: "VOID", refund: "REFUND",
  discounts: "خصومات", users: "مستخدمون", settings: "إعدادات", auth: "دخول وخروج",
};
export const sessionById = (id: string) => SESSIONS.find((s) => s.id === id);
