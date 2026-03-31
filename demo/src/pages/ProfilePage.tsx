import { useEffect, useState } from 'react';
import {
  ChevronRight,
  Settings,
  Bell,
  HelpCircle,
  FileText,
  LogOut,
  User as UserIcon,
  Mail,
  Phone,
  Copy,
  Gift
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { inviteBenefits, inviteRecords } from '../utils/mockData';

interface UserProfile {
  email: string;
  full_name: string;
  phone: string;
  membership_level: string;
  points: number;
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { push } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const inviteCode = 'JZ8K-2F9Q';
  const inviteLink = `https://jz.example/invite?code=${inviteCode}`;

  useEffect(() => {
    if (!user) {
      setProfile({
        email: 'demo@jz.app',
        full_name: '演示用户',
        phone: '未设置',
        membership_level: 'VIP3',
        points: 1280,
      });
      return;
    }

    let alive = true;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle();
      if (alive && data) setProfile(data);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${inviteLink}`);
      push({ title: '邀请链接已复制', description: inviteCode, variant: 'success' });
    } catch {
      push({ title: '复制失败', description: '请手动复制邀请链接', variant: 'error' });
    }
  };

  const menuSections = [
    {
      items: [
        { icon: Settings, label: '账户设置', action: () => {} },
        { icon: Bell, label: '消息通知', action: () => {} },
      ],
    },
    {
      items: [
        { icon: HelpCircle, label: '帮助中心', action: () => {} },
        { icon: FileText, label: '服务条款', action: () => {} },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <div className="rounded-3xl border border-white/10 bg-[var(--panel)] overflow-hidden">
        <div className="p-6 bg-[radial-gradient(circle_at_20%_30%,rgba(255,45,85,0.25),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(138,43,226,0.25),transparent_55%)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/10">
                <UserIcon className="w-8 h-8 text-[var(--text)]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text)] truncate">{profile?.full_name || '用户'}</h1>
                <div className="mt-1 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <span className="text-gradient font-semibold">{profile?.membership_level?.toUpperCase() || 'REGULAR'}</span>
                  <span>•</span>
                  <span>{profile?.points || 0} 积分</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyInvite}
              className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-white/10 transition"
            >
              <Copy className="h-4 w-4" />
              复制邀请
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[var(--panel)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-[var(--text)]">邀请好友</div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">复制邀请链接与邀请码，享受邀请权益</div>
          </div>
          <Gift className="h-5 w-5 text-[var(--accent)]" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-[var(--text-muted)]">邀请码</div>
            <div className="mt-1 font-mono text-sm text-[var(--text)]">{inviteCode}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-[var(--text-muted)]">邀请链接</div>
            <div className="mt-1 font-mono text-xs text-[var(--text)] break-all">{inviteLink}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {inviteBenefits.map((b) => (
            <span key={b} className="text-xs rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[var(--text-muted)]">
              {b}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-muted)]">邀请成功后奖励将记录在下方列表（原型示意）</div>
          <button
            type="button"
            onClick={handleCopyInvite}
            className="rounded-2xl px-5 py-3 font-semibold text-[var(--text)] bg-[var(--gradient-primary)] hover:brightness-110 transition"
            style={{ boxShadow: 'var(--shadow-glow)' }}
          >
            立即邀请（复制）
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[var(--panel)] p-5">
        <div className="text-lg font-semibold text-[var(--text)]">邀请记录</div>
        <div className="mt-1 text-xs text-[var(--text-muted)]">最近 {inviteRecords.length} 条</div>
        <div className="mt-4 grid gap-2">
          {inviteRecords.map((r) => (
            <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text)] truncate">{r.who}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{r.time}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[var(--text-muted)]">
                    {r.status}
                  </div>
                  <div className="mt-2 text-xs text-[var(--primary)] font-semibold">{r.reward}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[var(--panel)] p-5">
        <div className="text-lg font-semibold text-[var(--text)]">账户信息</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start gap-3">
            <Mail className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs text-[var(--text-muted)]">邮箱</div>
              <div className="mt-1 text-sm text-[var(--text)] truncate">{profile?.email || user?.email || '未登录'}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start gap-3">
            <Phone className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs text-[var(--text-muted)]">手机号</div>
              <div className="mt-1 text-sm text-[var(--text)] truncate">{profile?.phone || '未设置'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[var(--panel)] overflow-hidden">
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.items.map((item, itemIndex) => {
              const Icon = item.icon;
              return (
                <button
                  key={itemIndex}
                  type="button"
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-white/5 transition ${
                    itemIndex !== section.items.length - 1 ? 'border-b border-white/10' : ''
                  }`}
                >
                  <Icon className="w-5 h-5 text-[var(--text-muted)]" />
                  <span className="flex-1 text-left text-[var(--text)]">{item.label}</span>
                  <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="w-full rounded-3xl border border-white/10 bg-[var(--panel)] p-4 hover:bg-white/5 transition flex items-center justify-center gap-2 text-red-200 font-semibold"
      >
        <LogOut className="w-5 h-5" />
        退出登录
      </button>

      <div className="text-center text-xs text-[var(--text-muted)] pt-2">版本 1.0.0</div>
    </div>
  );
}
