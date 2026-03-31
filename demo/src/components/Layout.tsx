import { CreditCard, Home, Ticket, User } from 'lucide-react';
import type React from 'react';

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? 'bg-[rgba(255,45,85,0.12)] border border-[var(--primary)]/40 text-[var(--text)] shadow-[var(--shadow-glow)]'
          : 'border border-white/10 bg-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text)]'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

interface LayoutProps {
  children: React.ReactNode;
  currentTab: 'home' | 'coupons' | 'member' | 'profile';
  onTabChange: (tab: 'home' | 'coupons' | 'member' | 'profile') => void;
}

export default function Layout({ children, currentTab, onTabChange }: LayoutProps) {
  const tabs = [
    { id: 'home' as const, icon: Home, label: '首页' },
    { id: 'coupons' as const, icon: Ticket, label: '卷包' },
    { id: 'member' as const, icon: CreditCard, label: '会员' },
    { id: 'profile' as const, icon: User, label: '我的' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-2xl bg-[var(--gradient-primary)]" style={{ boxShadow: 'var(--shadow-glow)' }} />
            <div className="min-w-0 max-w-[10rem] sm:max-w-none">
              <div className="text-sm font-semibold text-[var(--text)] leading-tight truncate">折扣中心</div>
              <div className="text-xs text-[var(--text-muted)] leading-tight truncate">诱惑优惠，先到先得</div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            {tabs.map((t) => (
              <TabButton
                key={t.id}
                active={currentTab === t.id}
                onClick={() => onTabChange(t.id)}
                icon={t.icon}
                label={t.label}
              />
            ))}
          </div>

          <div className="sm:hidden flex items-center gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={`h-10 w-10 rounded-2xl border transition ${
                  currentTab === t.id
                    ? 'border-[var(--primary)]/40 bg-[rgba(255,45,85,0.12)]'
                    : 'border-white/10 bg-white/5'
                }`}
                aria-label={t.label}
              >
                <t.icon className={`mx-auto h-5 w-5 ${currentTab === t.id ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`} />
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
