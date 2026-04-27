export const REST_SCOPES = [
  "cms:read",
  "cms:write",
  "promo:read",
  "promo:write",
  "users:read",
  "users:write",
] as const;

export type RestScope = (typeof REST_SCOPES)[number];

export const REST_SCOPE_LABELS: Record<RestScope, string> = {
  "cms:read": "CMS 只读（公告 / 帖子 / 兑换引导）",
  "cms:write": "CMS 写入",
  "promo:read": "推广只读（短链 / 漏斗 / 代理 / 佣金）",
  "promo:write": "推广写入",
  "users:read": "用户管理只读",
  "users:write": "用户管理写入（角色 / VIP / 封禁 / 积分）",
};

export function hasScope(granted: readonly string[], needed: RestScope): boolean {
  if (granted.includes(needed)) return true;
  if (granted.includes("*")) return true;
  const moduleName = needed.split(":")[0];
  if (granted.includes(`${moduleName}:*`)) return true;
  return false;
}
