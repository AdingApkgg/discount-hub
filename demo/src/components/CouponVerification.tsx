import { useState } from 'react';
import { X, QrCode, KeyRound, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CouponVerificationProps {
  onClose: () => void;
}

interface CouponRow {
  id: string;
  code: string;
  status: 'active' | 'used' | 'expired' | string;
  expires_at: string;
  discount_amount: number;
}

export default function CouponVerification({ onClose }: CouponVerificationProps) {
  const [step, setStep] = useState<'scan' | 'input' | 'success'>('scan');
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedCoupon, setVerifiedCoupon] = useState<CouponRow | null>(null);
  const { user } = useAuth();

  const handleVerify = async () => {
    if (!supabase) {
      setError('Supabase 未配置，当前仅提供原型演示');
      return;
    }
    if (!couponCode.trim()) {
      setError('请输入券码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim())
        .maybeSingle<CouponRow>();

      if (!coupon) {
        setError('券码不存在');
        return;
      }

      if (coupon.status === 'used') {
        setError('该券已使用');
        return;
      }

      if (new Date(coupon.expires_at) < new Date()) {
        setError('该券已过期');
        return;
      }

      await supabase
        .from('coupons')
        .update({ status: 'used', used_at: new Date().toISOString() })
        .eq('id', coupon.id);

      await supabase
        .from('verification_records')
        .insert({
          coupon_id: coupon.id,
          verified_by: user?.id,
          notes: '券码核销成功',
        });

      setVerifiedCoupon(coupon);
      setStep('success');
    } catch {
      setError('核销失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900/95 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {step === 'scan' && (
          <div className="bg-white rounded-3xl p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-slate-600" />
            </button>

            <h2 className="text-2xl font-bold text-center mb-8 mt-2">会员券核销</h2>

            <div className="aspect-square bg-slate-900 rounded-2xl mb-6 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-8 border-4 border-white rounded-2xl opacity-50"></div>
              <div className="grid grid-cols-2 gap-4 p-8">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-white rounded-lg animate-pulse"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  ></div>
                ))}
              </div>
            </div>

            <p className="text-center text-slate-600 text-sm mb-8">
              将核销码对准取景框进行扫描核销
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setStep('input')}
                className="flex items-center justify-center gap-2 bg-slate-100 text-slate-900 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                <KeyRound className="w-5 h-5" />
                输入券码
              </button>
              <button
                className="bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors"
              >
                核销记录
              </button>
            </div>

            <div className="mt-6 p-4 bg-slate-50 rounded-xl">
              <h3 className="font-medium text-slate-900 mb-2 text-sm">使用规则</h3>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>1. 在读书台场代理机构的关联应产品得12位券码即仅允许核销</li>
                <li>2. 将定产品含兑换有效期，期间内无核销无换奖次</li>
                <li>3. 一经出售的兑换券非客观因不进行退款</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'input' && (
          <div className="bg-white rounded-3xl p-6 relative">
            <button
              onClick={() => setStep('scan')}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-slate-600" />
            </button>

            <h2 className="text-2xl font-bold text-center mb-8 mt-2">输入券码核销</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                券码
              </label>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="请输入12位券码"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all text-center text-lg font-mono tracking-wider"
                maxLength={12}
              />
            </div>

            {error && (
              <div className="mb-6 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={loading || !couponCode.trim()}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '核销中...' : '确认核销'}
            </button>

            <button
              onClick={() => setStep('scan')}
              className="w-full mt-3 bg-slate-100 text-slate-900 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              扫码核销
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="bg-white rounded-3xl p-8 text-center">
            <div className="w-20 h-20 bg-emerald-500 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Check className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">核销成功</h2>
            <p className="text-slate-600 mb-8">
              您已完成抵会员券卡的兑换券核销
              <br />
              已获得相应会员权益，现在就去使用吧
            </p>

            {verifiedCoupon && (
              <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">券码</span>
                  <span className="font-mono text-slate-900">{verifiedCoupon.code}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">金额</span>
                  <span className="font-bold text-slate-900">
                    ¥{verifiedCoupon.discount_amount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">核销时间</span>
                  <span className="text-sm text-slate-900">
                    {new Date().toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors"
            >
              即刻使用
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
