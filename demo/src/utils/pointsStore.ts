export type VipTier = {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  perks: string[];
};

const POINTS_KEY = 'jz.points';
const CHECKIN_KEY = 'jz.checkin';
const DAILY_KEY = 'jz.dailyTasks';
const CONTENT_KEY = 'jz.contentEarn';
const PURCHASE_KEY = 'jz.purchase';

type CheckinState = { lastDate: string | null; dayIndex: number };
type DailyTaskState = Record<string, { lastDate: string | null } | undefined>;
type ContentEarnState = Record<string, { claimed: boolean } | undefined>;
type PurchaseState = { lastDate: string | null; total: number };

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function pad2(x: number) {
  return String(x).padStart(2, '0');
}

export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function isYesterday(dateStr: string, base = new Date()) {
  const yesterday = todayStr(addDays(base, -1));
  return dateStr === yesterday;
}

export function getPoints(defaultPoints = 1280) {
  const raw = window.localStorage.getItem(POINTS_KEY);
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return defaultPoints;
  return Math.max(0, Math.floor(n));
}

export function setPoints(points: number) {
  window.localStorage.setItem(POINTS_KEY, String(Math.max(0, Math.floor(points))));
}

export function addPoints(delta: number) {
  const next = getPoints() + Math.floor(delta);
  setPoints(next);
  return next;
}

export function getVipLevel(points: number) {
  if (points < 500) return 0;
  return Math.min(10, Math.floor(points / 500));
}

export function getVipLabel(level: number) {
  return level <= 0 ? 'VIP' : `VIP${level}`;
}

export function getVipProgress(points: number) {
  const level = getVipLevel(points);
  const min = level * 500;
  const max = level >= 10 ? min + 500 : (level + 1) * 500;
  const ratio = Math.max(0, Math.min(1, (points - min) / (max - min)));
  return { level, min, max, ratio };
}

export function getVipTiers(): VipTier[] {
  const perksByLevel: Record<number, string[]> = {
    0: ['新人专享券', '每日签到加成', '热门权益优先看到'],
    1: ['每周 1 张折扣卷', '任务积分 +5%', '专属客服通道'],
    2: ['每周 2 张折扣卷', '任务积分 +8%', '兑换优先处理（原型）'],
    3: ['每周 3 张折扣卷', '任务积分 +10%', '限时神卷优先购'],
    4: ['每周 4 张折扣卷', '任务积分 +12%', '专属活动位'],
    5: ['每周 5 张折扣卷', '任务积分 +15%', '兑换额外返积分'],
    6: ['每周 6 张折扣卷', '任务积分 +18%', '更高折扣池'],
    7: ['每周 7 张折扣卷', '任务积分 +20%', '隐藏福利掉落'],
    8: ['每周 8 张折扣卷', '任务积分 +22%', '权益榜单置顶'],
    9: ['每周 9 张折扣卷', '任务积分 +25%', '高级专属券'],
    10: ['每周 10 张折扣卷', '任务积分 +30%', '至尊权益池'],
  };

  return Array.from({ length: 11 }).map((_, i) => {
    const minPoints = i * 500;
    const maxPoints = (i + 1) * 500;
    return {
      level: i,
      name: getVipLabel(i),
      minPoints,
      maxPoints,
      perks: perksByLevel[i] ?? [],
    };
  });
}

export function getCheckinState(): CheckinState {
  return safeJsonParse<CheckinState>(window.localStorage.getItem(CHECKIN_KEY), {
    lastDate: null,
    dayIndex: 0,
  });
}

export function checkinRewardForDayIndex(dayIndex: number) {
  const rewards = [200, 3000, 300, 500];
  const i = Math.max(1, Math.min(rewards.length, dayIndex));
  return rewards[i - 1];
}

export function canCheckin(now = new Date()) {
  const s = getCheckinState();
  const t = todayStr(now);
  return s.lastDate !== t;
}

export function doCheckin(now = new Date()) {
  const s = getCheckinState();
  const t = todayStr(now);

  if (s.lastDate === t) {
    return { ok: false as const, dayIndex: s.dayIndex, reward: 0 };
  }

  const nextDayIndex = s.lastDate && isYesterday(s.lastDate, now) ? Math.min(4, s.dayIndex + 1) : 1;
  const reward = checkinRewardForDayIndex(nextDayIndex);
  window.localStorage.setItem(CHECKIN_KEY, JSON.stringify({ lastDate: t, dayIndex: nextDayIndex } satisfies CheckinState));
  const points = addPoints(reward);
  return { ok: true as const, dayIndex: nextDayIndex, reward, points };
}

export function getDailyTaskState(): DailyTaskState {
  return safeJsonParse<DailyTaskState>(window.localStorage.getItem(DAILY_KEY), {});
}

export function isDailyTaskDone(taskId: string, now = new Date()) {
  const s = getDailyTaskState();
  const rec = s[taskId];
  return rec?.lastDate === todayStr(now);
}

export function markDailyTaskDone(taskId: string, now = new Date()) {
  const s = getDailyTaskState();
  s[taskId] = { lastDate: todayStr(now) };
  window.localStorage.setItem(DAILY_KEY, JSON.stringify(s));
}

export function getContentEarnState(): ContentEarnState {
  return safeJsonParse<ContentEarnState>(window.localStorage.getItem(CONTENT_KEY), {});
}

export function isContentClaimed(id: string) {
  const s = getContentEarnState();
  return Boolean(s[id]?.claimed);
}

export function claimContent(id: string) {
  const s = getContentEarnState();
  s[id] = { claimed: true };
  window.localStorage.setItem(CONTENT_KEY, JSON.stringify(s));
}

export function getPurchaseState(): PurchaseState {
  return safeJsonParse<PurchaseState>(window.localStorage.getItem(PURCHASE_KEY), { lastDate: null, total: 0 });
}

export function markPurchase(now = new Date()) {
  const s = getPurchaseState();
  const next = { lastDate: todayStr(now), total: Math.max(0, Math.floor(s.total)) + 1 } satisfies PurchaseState;
  window.localStorage.setItem(PURCHASE_KEY, JSON.stringify(next));
  return next;
}

