/**
 * Side-effect imports of every REST route module.
 *
 * Importing a module runs its top-level `defineOperation(...)` calls, which
 * in turn populate the registry consumed by /api/v1/openapi.json. Without
 * this barrel, the OpenAPI doc would only show routes that had been hit at
 * least once in the current process.
 *
 * Add a new line whenever you add a new REST route file.
 */

// CMS
import "@/app/api/v1/cms/notices/route";
import "@/app/api/v1/cms/notices/[id]/route";
import "@/app/api/v1/cms/posts/route";
import "@/app/api/v1/cms/posts/[id]/route";
import "@/app/api/v1/cms/redemption-guides/route";
import "@/app/api/v1/cms/redemption-guides/[id]/route";

// Promotion
import "@/app/api/v1/promotion/short-links/route";
import "@/app/api/v1/promotion/invite-events/route";
import "@/app/api/v1/promotion/funnel/route";
import "@/app/api/v1/promotion/agents/route";
import "@/app/api/v1/promotion/agents/applications/route";
import "@/app/api/v1/promotion/agents/applications/[id]/review/route";
import "@/app/api/v1/promotion/commissions/route";
import "@/app/api/v1/promotion/commissions/[id]/pay/route";

// Users
import "@/app/api/v1/users/route";
import "@/app/api/v1/users/[id]/route";
import "@/app/api/v1/users/[id]/points/route";

export {};
