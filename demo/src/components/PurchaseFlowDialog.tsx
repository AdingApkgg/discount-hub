import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, CreditCard, QrCode, ShieldCheck } from 'lucide-react';
import Modal from './Modal';
import FakeQr from './FakeQr';
import { useToast } from '../contexts/ToastContext';
import type { ScrollItem } from '../utils/mockData';
import { clampInt, formatDateTime, formatExpires, formatMoney } from '../utils/format';

type Step = 'offer' | 'pay' | 'success';

type PayMethod = 'alipay' | 'wechat' | 'unionpay' | 'paypal' | 'crypto';

const payMethods: { id: PayMethod; name: string; hint: string }[] = [
  { id: 'alipay', name: '支付宝', hint: '推荐' },
  { id: 'wechat', name: '微信支付', hint: '快捷' },
  { id: 'unionpay', name: '银联卡', hint: '银行卡' },
  { id: 'paypal', name: 'PayPal', hint: '海外' },
  { id: 'crypto', name: '加密货币', hint: 'Web3' },
];

function createOrderId() {
  const a = Math.random().toString(36).slice(2, 6).toUpperCase();
  const b = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `JZ-${a}-${b}`;
}

function createSerial() {
  const n = Math.floor(Math.random() * 900000000 + 100000000);
  return `SN${n}`;
}

function createCouponCode(scrollId: string) {
  const core = scrollId
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase();
  const tail = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CP-${core}-${tail}`;
}

function sumCash(scroll: ScrollItem, qty: number) {
  return scroll.cashPrice * qty;
}

function sumPoints(scroll: ScrollItem, qty: number) {
  return scroll.pointsPrice * qty;
}

export default function PurchaseFlowDialog({
  open,
  scroll,
  onOpenChange,
  onGoMy,
}: {
  open: boolean;
  scroll: ScrollItem;
  onOpenChange: (v: boolean) => void;
  onGoMy: () => void;
}) {
  const { push } = useToast();
  const [step, setStep] = useState<Step>('offer');
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<PayMethod>('alipay');
  const [paying, setPaying] = useState(false);

  const [order, setOrder] = useState<{
    orderId: string;
    serial: string;
    paidAt: string;
    couponCode: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep('offer');
    setQty(1);
    setMethod('alipay');
    setPaying(false);
    setOrder(null);
  }, [open, scroll.id]);

  const summary = useMemo(() => {
    const cash = sumCash(scroll, qty);
    const points = sumPoints(scroll, qty);
    return { cash, points };
  }, [qty, scroll]);

  const payNow = async () => {
    if (paying) return;
    setPaying(true);
    await new Promise((r) => window.setTimeout(r, 900));
    const now = new Date();
    const orderId = createOrderId();
    const serial = createSerial();
    const couponCode = createCouponCode(scroll.id);
    setOrder({ orderId, serial, paidAt: formatDateTime(now), couponCode });
    setPaying(false);
    setStep('success');
    push({ title: '支付成功', description: '券码已生成，可立即兑换', variant: 'success' });

    window.dispatchEvent(
      new CustomEvent('jz:purchaseSuccess', {
        detail: {
          scrollId: scroll.id,
          app: scroll.app,
          title: scroll.title,
          couponCode,
          paidAt: now.toISOString(),
        },
      })
    );
  };

  const copyText = async (text: string, okText: string) => {
    try {
      await navigator.clipboard.writeText(text);
      push({ title: okText, variant: 'success' });
    } catch {
      push({ title: '复制失败', description: '请手动复制', variant: 'error' });
    }
  };

  return (
    <Modal
      open={open}
      title={
        step === 'offer'
          ? '去兑换'
          : step === 'pay'
            ? '支付订单'
            : '支付成功'
      }
      onClose={() => onOpenChange(false)}
      bodyClassName="overflow-hidden"
      className="overflow-hidden"
    >
      <div className="flex flex-col max-h-[80vh]">
        <div className="flex-1 overflow-auto px-5 py-5">
          {step === 'offer' ? (
            <div className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-[var(--panel2)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-[var(--text-muted)]">{scroll.app}</div>
                    <div className="mt-1 text-lg font-semibold text-[var(--text)] truncate">
                      {scroll.title}
                    </div>
                    <div className="mt-1 text-sm text-[var(--text-muted)]">{scroll.subtitle}</div>
                  </div>
                  <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                    <div className="text-xs text-[var(--text-muted)]">失效时间</div>
                    <div className="mt-1 text-base font-semibold text-[var(--text)]">{formatExpires(scroll.expiresAt)}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {scroll.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[var(--text-muted)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-4 text-sm text-[var(--text-muted)]">{scroll.description}</div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[var(--panel2)] p-4">
                <div className="flex items-end justify-between gap-3">
                  <div className="text-sm text-[var(--text-muted)]">兑换价格</div>
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-2">
                      <div className="text-lg font-semibold text-[var(--text)]">
                        {scroll.pointsPrice} 积分 + {formatMoney(scroll.cashPrice)}
                      </div>
                      {typeof scroll.originalCashPrice === 'number' ? (
                        <div className="text-sm text-[var(--text-muted)] line-through">
                          {formatMoney(scroll.originalCashPrice)}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{scroll.availableCountText}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[var(--panel2)] p-4">
                <div className="text-sm font-semibold text-[var(--text)]">规则说明</div>
                <div className="mt-3 grid gap-2 text-sm text-[var(--text-muted)]">
                  <div className="flex gap-2">
                    <span className="text-[var(--accent)]">1</span>
                    <span>购买方式：选择任一支付方式完成支付。</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[var(--accent)]">2</span>
                    <span>兑换核销：成功后生成券码与二维码，用于核销。</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[var(--accent)]">3</span>
                    <span>限购一张：本原型限制为 1 张。</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 'pay' ? (
            <div className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-[var(--panel2)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-[var(--text-muted)]">{scroll.app}</div>
                    <div className="mt-1 text-lg font-semibold text-[var(--text)] truncate">
                      {scroll.title}
                    </div>
                    <div className="mt-1 text-sm text-[var(--text-muted)]">{scroll.subtitle}</div>
                  </div>
                  <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                    <div className="text-xs text-[var(--text-muted)]">订单价格</div>
                    <div className="mt-1 text-base font-semibold text-[var(--text)]">{formatMoney(summary.cash)}</div>
                    <div className="mt-0.5 text-xs text-[var(--text-muted)]">消耗 {summary.points} 积分</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-sm text-[var(--text-muted)]">购买数量</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty((v) => clampInt(v - 1, 1, 1))}
                      className="h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-[var(--text)] hover:bg-white/10 transition"
                      aria-label="减少数量"
                    >
                      -
                    </button>
                    <div className="w-10 text-center font-mono text-[var(--text)]">{qty}</div>
                    <button
                      type="button"
                      onClick={() => setQty((v) => clampInt(v + 1, 1, 1))}
                      className="h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-[var(--text)] hover:bg-white/10 transition"
                      aria-label="增加数量"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[var(--panel2)] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[var(--text)]">选择支付方式</div>
                  <div className="text-xs text-[var(--text-muted)]">共 {payMethods.length} 种</div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {payMethods.map((m) => {
                    const active = method === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id)}
                        className={`rounded-2xl border px-3 py-3 text-left transition ${
                          active
                            ? 'border-[var(--primary)]/50 bg-[rgba(255,45,85,0.10)] shadow-[var(--shadow-glow)]'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-[var(--text)]">{m.name}</div>
                          <div className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[var(--text-muted)]">
                            {m.hint}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">安全支付 · 仅原型演示</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {step === 'success' && order ? (
            <div className="space-y-5">
              <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text)]">支付成功</div>
                    <div className="mt-0.5 text-xs text-[var(--text-muted)]">券码已生成，请及时兑换核销</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
                <div className="rounded-3xl border border-white/10 bg-[var(--panel2)] p-4">
                  <div className="text-sm font-semibold text-[var(--text)]">支付结果</div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-[var(--text-muted)]">实付</div>
                      <div className="mt-1 font-semibold text-[var(--text)]">{formatMoney(summary.cash)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-[var(--text-muted)]">消耗积分</div>
                      <div className="mt-1 font-semibold text-[var(--text)]">{summary.points}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-[var(--text-muted)]">数量</div>
                      <div className="mt-1 font-semibold text-[var(--text)]">{qty}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-[var(--text-muted)]">订单时间</div>
                      <div className="mt-1 font-mono text-xs text-[var(--text)]">{order.paidAt}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-[var(--text-muted)]">券码</div>
                        <div className="mt-1 font-mono text-sm text-[var(--text)]">{order.couponCode}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(order.couponCode, '券码已复制')}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text)] hover:bg-white/10 transition inline-flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        复制
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>订单号：{order.orderId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      <span>流水号：{order.serial}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      <span>有效期：{formatExpires(scroll.expiresAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[var(--panel2)] p-4">
                  <div className="text-sm font-semibold text-[var(--text)]">二维码（示意）</div>
                  <div className="mt-3 flex justify-center">
                    <FakeQr value={order.couponCode} />
                  </div>
                  <div className="mt-3 text-xs text-[var(--text-muted)] text-center">核销时出示券码或二维码</div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[var(--panel2)] p-4">
                <div className="text-sm font-semibold text-[var(--text)]">使用须知</div>
                <div className="mt-3 text-sm text-[var(--text-muted)]">
                  该券一经出售不可退款，券码具有有效期，请及时兑换核销。
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/10 bg-[var(--panel)] px-5 py-4">
          {step === 'offer' ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-[var(--text-muted)]">限购 1 张</div>
              <button
                type="button"
                onClick={() => setStep('pay')}
                className="rounded-2xl px-5 py-3 font-semibold text-[var(--text)] bg-[var(--gradient-primary)] hover:brightness-110 transition"
                style={{ boxShadow: 'var(--shadow-glow)' }}
              >
                立即购买
              </button>
            </div>
          ) : null}

          {step === 'pay' ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('offer')}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--text)] border border-white/10 bg-white/5 hover:bg-white/10 transition"
                disabled={paying}
              >
                返回
              </button>
              <button
                type="button"
                onClick={payNow}
                className="rounded-2xl px-5 py-3 font-semibold text-[var(--text)] bg-[var(--gradient-primary)] hover:brightness-110 transition disabled:opacity-60"
                style={{ boxShadow: 'var(--shadow-glow)' }}
                disabled={paying}
              >
                {paying ? '支付中…' : `确认支付 ${formatMoney(summary.cash)}`}
              </button>
            </div>
          ) : null}

          {step === 'success' ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--text)] border border-white/10 bg-white/5 hover:bg-white/10 transition"
              >
                继续逛
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onGoMy();
                }}
                className="rounded-2xl px-5 py-3 font-semibold text-[var(--text)] bg-[var(--gradient-primary)] hover:brightness-110 transition"
                style={{ boxShadow: 'var(--shadow-glow)' }}
              >
                查看我的
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
