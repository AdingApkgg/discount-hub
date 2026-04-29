/**
 * Default values for editable site content.
 *
 * This catalog drives both the admin "站点文案" tab and the consumer-side fallback:
 * if a key is not yet in the DB, the consumer page renders the default below.
 *
 * Keep keys stable — they are referenced by code via `useSiteContent("category")`.
 */

export type SiteContentValueType =
  | "string"
  | "text"
  | "number"
  | "boolean"
  | "array"
  | "object";

export type SiteContentDefault = {
  key: string;
  category: string;
  label: string;
  description?: string;
  valueType: SiteContentValueType;
  default: unknown;
  sortOrder?: number;
};

export const SITE_CONTENT_CATEGORIES: { id: string; label: string; description: string }[] = [
  { id: "company", label: "公司信息", description: "About 页 / 全站品牌信息" },
  { id: "support", label: "客服联系", description: "Contact 页客服邮箱、电话、工作时间、AI 欢迎语" },
  { id: "homepage", label: "首页文案", description: "首页搜索栏、邀请徽章等" },
  { id: "invite", label: "邀请页", description: "邀请页标题、奖励描述、分享话术" },
  { id: "member", label: "会员页", description: "会员页 slogan、区块标题" },
  { id: "agent", label: "代理页", description: "代理申请步骤、表单提示、代理中心文案" },
  { id: "footprints", label: "足迹页", description: "近 N 天浏览相关" },
  { id: "notice", label: "公告", description: "公告 toast 时长、最大显示数" },
  { id: "earn", label: "刷内容赚积分", description: "首页 / 会员页「刷内容赚积分」卡片列表" },
];

export const SITE_CONTENT_DEFAULTS: SiteContentDefault[] = [
  // ───── 公司信息 ─────
  { key: "company.name", category: "company", label: "公司/品牌名称", valueType: "string", default: "Discount Hub", sortOrder: 1 },
  { key: "company.description_long", category: "company", label: "公司简介（长文）", valueType: "text", default: "Discount Hub 是一个折扣权益交易平台，致力于为用户提供最优质的数字权益兑换服务。", sortOrder: 2 },
  { key: "company.value_proposition", category: "company", label: "价值主张", valueType: "text", default: "我们通过积分+现金的混合支付模式，让每一位用户都能用更少的钱享受更多优质权益。", sortOrder: 3 },
  { key: "company.supported_payment_methods", category: "company", label: "支持的支付方式", valueType: "text", default: "平台支持多种支付方式，包括支付宝、微信支付、银联卡、PayPal 及加密货币等。", sortOrder: 4 },
  { key: "company.version", category: "company", label: "版本号", valueType: "string", default: "1.0.0", sortOrder: 5 },
  { key: "company.copyright_year", category: "company", label: "版权年份", valueType: "string", default: "2026", sortOrder: 6 },

  // ───── 客服联系 ─────
  { key: "support.email", category: "support", label: "客服邮箱", valueType: "string", default: "support@discount-hub.com", sortOrder: 1 },
  { key: "support.email_label", category: "support", label: "邮箱渠道名", valueType: "string", default: "邮件支持", sortOrder: 2 },
  { key: "support.phone", category: "support", label: "客服电话", valueType: "string", default: "400-888-0000", sortOrder: 3 },
  { key: "support.phone_label", category: "support", label: "电话渠道名", valueType: "string", default: "电话支持", sortOrder: 4 },
  { key: "support.working_hours", category: "support", label: "客服工作时间", valueType: "string", default: "工作日 9:00-18:00", sortOrder: 5 },
  { key: "support.ai_welcome", category: "support", label: "AI 客服欢迎语", valueType: "text", default: "您好！我是 AI 智能助手，可以帮您解答积分、签到、优惠券、会员等级等常见问题。如有复杂问题，可随时转接人工客服。", sortOrder: 6 },
  { key: "support.human_recorded", category: "support", label: "人工客服已记录留言提示", valueType: "text", default: "已记录您的留言，人工客服将尽快回复。工作时间：工作日 9:00-18:00", sortOrder: 7 },
  { key: "support.page_title", category: "support", label: "客服页标题", valueType: "string", default: "智能客服", sortOrder: 8 },

  // ───── 首页文案 ─────
  { key: "homepage.search_tagline", category: "homepage", label: "搜索栏占位词", valueType: "string", default: "搜神券 · 省到抽筋", sortOrder: 1 },
  { key: "homepage.shortcuts", category: "homepage", label: "金刚区图标（数组）", description: "每项 { id, label, tone, linkUrl, emoji?, iconUrl?, badge? }；tone 取值 red/gold/pink/orange/gradient；emoji 与 iconUrl 至少填一个，iconUrl 优先；linkUrl 可填站内路径（/invite）或外链（https://...）", valueType: "array", default: [
    { id: "video", emoji: "🎬", label: "视频VIP", tone: "red", badge: "HOT", linkUrl: "/member" },
    { id: "music", emoji: "🎵", label: "音乐会员", tone: "pink", linkUrl: "/member" },
    { id: "game", emoji: "🎮", label: "游戏直充", tone: "red", badge: "-90%", linkUrl: "/member" },
    { id: "phone", emoji: "📱", label: "话费充值", tone: "orange", linkUrl: "/member" },
    { id: "food", emoji: "🍜", label: "外卖美食", tone: "orange", linkUrl: "/member" },
    { id: "shop", emoji: "🛍️", label: "品牌券包", tone: "pink", badge: "新", linkUrl: "/coupons" },
    { id: "learn", emoji: "📚", label: "学习知识", tone: "gold", linkUrl: "/member" },
    { id: "rebate", emoji: "🎁", label: "邀请返利", tone: "gold", badge: "¥100", linkUrl: "/invite" },
    { id: "zero", emoji: "💎", label: "0元兑", tone: "gradient", badge: "爆", linkUrl: "/promotions" },
    { id: "all", emoji: "🧭", label: "全部分类", tone: "orange", linkUrl: "/feed" },
  ], sortOrder: 2 },
  { key: "homepage.hot_posts", category: "homepage", label: "薅羊毛攻略列表（数组）", description: "每项 { id, title, excerpt, likeText, app }", valueType: "array", default: [
    { id: "p1", title: "今天刷到的隐藏福利，真的香", excerpt: "限时神卷叠加后到手价太离谱了…", likeText: "2.4w", app: "抖音" },
    { id: "p2", title: "0 元兑专区怎么用最划算", excerpt: "签到拿积分，三天就能换到钻石包。", likeText: "1.1w", app: "抖音" },
    { id: "p3", title: "今日值得兑：首充礼的正确打开方式", excerpt: "别直接买，先领券再叠加，立省更多。", likeText: "8.7k", app: "抖音" },
  ], sortOrder: 3 },

  // ───── 邀请页 ─────
  { key: "invite.page_title", category: "invite", label: "邀请页标题", valueType: "string", default: "邀请好友", sortOrder: 1 },
  { key: "invite.page_subtitle", category: "invite", label: "邀请页副标题", valueType: "string", default: "邀请好友注册并下单，双方均可获得丰厚奖励", sortOrder: 2 },
  { key: "invite.share_text_template", category: "invite", label: "分享话术模板（{code} 替换为邀请码）", valueType: "text", default: "使用我的邀请码 {code} 注册，双方均可获得丰厚积分奖励！", sortOrder: 3 },
  { key: "invite.reward_descriptions", category: "invite", label: "奖励项展示（数组：{label, value}）", valueType: "array", default: [
    { label: "邀请成功", value: "¥10000 积分" },
    { label: "优惠券", value: "专属折扣券" },
    { label: "30 钻石", value: "虚拟货币奖励" },
  ], sortOrder: 4 },
  { key: "invite.benefit_tags", category: "invite", label: "邀请权益标签（数组）", valueType: "array", default: [
    "积分优惠券",
    "抖音钻石",
    "限时神卷优先购资格",
    "专属折扣加成",
  ], sortOrder: 5 },
  { key: "invite.steps", category: "invite", label: "邀请步骤说明（数组）", valueType: "array", default: [
    "分享邀请链接或图片给好友",
    "好友通过您的邀请码注册并完成首单",
    "双方各获得对应积分和优惠券奖励",
  ], sortOrder: 6 },
  { key: "invite.short_link_expiry_days", category: "invite", label: "短链有效期（天）", valueType: "number", default: 90, sortOrder: 7 },

  // ───── 会员页 ─────
  { key: "member.tagline", category: "member", label: "会员页 slogan", valueType: "string", default: "刷任务、签到、邀请 · 积分当钱花", sortOrder: 1 },
  { key: "member.regular_label", category: "member", label: "普通会员标签", valueType: "string", default: "普通会员", sortOrder: 2 },
  { key: "member.benefits_title", category: "member", label: "权益区标题", valueType: "string", default: "会员权益", sortOrder: 3 },
  { key: "member.checkin_title", category: "member", label: "签到区标题", valueType: "string", default: "连续签到", sortOrder: 4 },
  { key: "member.vip_benefits_by_level", category: "member", label: "各级 VIP 权益描述（对象：{ \"1\": [\"...\"], \"2\": [...] }）", valueType: "object", default: {
    "1": ["基础兑换权益", "每日签到奖励 +5%"],
    "2": ["VIP1 全部权益", "每日签到奖励 +10%", "专属客服通道"],
    "3": ["VIP2 全部权益", "每日签到奖励 +15%", "专享优惠券"],
    "4": ["VIP3 全部权益", "每日签到奖励 +20%", "生日福利"],
    "5": ["VIP4 全部权益", "每日签到奖励 +25%", "提前抢购资格"],
  }, sortOrder: 5 },

  // ───── 代理页 ─────
  { key: "agent.application_steps", category: "agent", label: "代理申请步骤（数组）", valueType: "array", default: [
    "填写资料",
    "审批中",
    "审核通过",
    "完成",
  ], sortOrder: 1 },
  { key: "agent.region_placeholder", category: "agent", label: "区域填写示例", valueType: "string", default: "如：中国, 北京, 朝阳", sortOrder: 2 },
  { key: "agent.platforms_placeholder", category: "agent", label: "代理平台填写示例", valueType: "string", default: "如 YOUTUBE, TikTok, X, Instagram", sortOrder: 3 },
  { key: "agent.approved_message", category: "agent", label: "审核通过文案", valueType: "string", default: "恭喜成为官方代理商！", sortOrder: 4 },
  { key: "agent.not_agent_title", category: "agent", label: "非代理商提示标题", valueType: "string", default: "您还不是代理商", sortOrder: 5 },
  { key: "agent.not_agent_subtitle", category: "agent", label: "非代理商提示副标题", valueType: "string", default: "成为代理商后可在此查看下级与佣金", sortOrder: 6 },
  { key: "agent.center_title", category: "agent", label: "代理中心标题", valueType: "string", default: "代理商中心", sortOrder: 10 },
  { key: "agent.welcome_tagline", category: "agent", label: "代理中心欢迎语", valueType: "string", default: "邀请下单 · 持续返佣 · 团队躺赚", sortOrder: 11 },
  { key: "agent.withdrawal_min_amount", category: "agent", label: "最低提现金额（元）", valueType: "number", default: 10, sortOrder: 20 },
  { key: "agent.withdrawal_fee_rate", category: "agent", label: "提现手续费率（0-1）", description: "例如 0.006 代表 0.6%；最终到账 = 金额 × (1 - 费率)", valueType: "number", default: 0, sortOrder: 21 },
  { key: "agent.withdrawal_rules", category: "agent", label: "提现规则说明（数组）", valueType: "array", default: [
    "已结算佣金可申请提现，未结算佣金需等订单确认收货",
    "提现申请提交后 1-3 个工作日内审核",
    "审核通过后预计 1-5 个工作日到账",
    "请确保收款账户实名信息与本人一致",
  ], sortOrder: 22 },
  { key: "agent.training_links", category: "agent", label: "新手培训链接（数组：{ title, url }）", valueType: "array", default: [
    { title: "代理新手指南", url: "/about" },
    { title: "如何快速建立团队", url: "/about" },
    { title: "佣金结算规则说明", url: "/about" },
  ], sortOrder: 30 },

  // ───── 足迹页 ─────
  { key: "footprints.recent_days", category: "footprints", label: "最近 N 天", valueType: "number", default: 30, sortOrder: 1 },
  { key: "footprints.empty_text", category: "footprints", label: "空态文案", valueType: "string", default: "看过的好物都会留在这", sortOrder: 2 },

  // ───── 公告 ─────
  { key: "notice.critical_toast_duration_ms", category: "notice", label: "重要公告 toast 时长（毫秒）", valueType: "number", default: 12000, sortOrder: 1 },
  { key: "notice.max_visible_banners", category: "notice", label: "最多显示的置顶公告数", valueType: "number", default: 1, sortOrder: 2 },

  // ───── 刷内容赚积分 ─────
  { key: "earn.contents", category: "earn", label: "刷内容卡片列表（数组）", description: "每项 { id, title, subtitle, app, rewardPoints, gradient }；id 必须对应 taskRewards 中的 taskId（如 c1/c2/c3/c4）才能领奖", valueType: "array", default: [
    { id: "c1", title: "你养龙虾了吗？openclaw 爆火出圈，怎么抓住机会", subtitle: "去抖音观看", app: "抖音", rewardPoints: 30, gradient: "from-[#FE2C55]/25 via-[#FF6E37]/20 to-[#3D1A12]" },
    { id: "c2", title: "三分钟看懂：限时神卷叠加玩法，立省翻倍", subtitle: "去抖音观看", app: "抖音", rewardPoints: 30, gradient: "from-[#FF4D8D]/25 via-[#FE2C55]/15 to-[#3D1A12]" },
    { id: "c3", title: "新用户首充礼到底值不值？这样买最划算", subtitle: "去抖音观看", app: "抖音", rewardPoints: 40, gradient: "from-[#F5B800]/20 via-[#FF6E37]/20 to-[#3D1A12]" },
    { id: "c4", title: "0 元兑专区隐藏福利：连续签到 4 天直接起飞", subtitle: "去抖音观看", app: "抖音", rewardPoints: 50, gradient: "from-[#FFA64D]/20 via-[#FE2C55]/20 to-[#3D1A12]" },
  ], sortOrder: 1 },
];

export function getSiteContentDefault(key: string): SiteContentDefault | undefined {
  return SITE_CONTENT_DEFAULTS.find((d) => d.key === key);
}

/** Merge a DB-fetched key→value map with defaults; missing keys fall back to the default. */
export function mergeSiteContent(
  category: string,
  dbValues: Record<string, unknown> | undefined | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const def of SITE_CONTENT_DEFAULTS) {
    if (def.category !== category) continue;
    const fromDb = dbValues?.[def.key];
    out[def.key] = fromDb !== undefined ? fromDb : def.default;
  }
  return out;
}
