import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma";
import { createTRPCRouter, protectedProcedure, sensitiveProcedure } from "../init";
import { env } from "@/env";

const DEFAULT_SYSTEM_PROMPT = `你是「折扣购物 APP」的 AI 客服助手。请用简洁、友好的中文回答用户问题，回答控制在 200 字以内。如果用户问到平台外、超出你能力或可能涉及个人订单详情的问题，请礼貌建议「转接人工客服」。不要编造你不知道的具体数字或政策。`;

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 512;

const FALLBACK_NO_MATCH =
  "抱歉，我暂时无法回答这个问题。建议您点击下方「转接人工客服」获得更专业的帮助，或者换个方式描述您的问题。";

type FaqEntry = { keywords: string[]; answer: string };

export function matchFAQ(input: string, faqs: FaqEntry[]): string | null {
  const lower = input.toLowerCase();
  for (const item of faqs) {
    if (item.keywords.some((kw) => kw && lower.includes(kw.toLowerCase()))) {
      return item.answer;
    }
  }
  return null;
}

type AnthropicMessage = { role: "user" | "assistant"; content: string };

async function callAnthropic(
  apiKey: string,
  modelName: string,
  maxTokens: number,
  systemPrompt: string,
  messages: AnthropicMessage[],
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("Anthropic returned no text content");
  }
  return text;
}

type DbLike = Pick<PrismaClient, "supportConfig" | "supportFaq">;

async function loadActiveSupport(db: DbLike) {
  const [config, faqs] = await Promise.all([
    db.supportConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.supportFaq.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { keywords: true, answer: true },
    }),
  ]);
  return {
    systemPrompt: config?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    modelName: config?.modelName || DEFAULT_MODEL,
    maxTokens: config?.maxTokens ?? DEFAULT_MAX_TOKENS,
    transferWaitSeconds: config?.transferWaitSeconds ?? 30,
    faqs: faqs as FaqEntry[],
  };
}

export const supportRouter = createTRPCRouter({
  getPublicConfig: protectedProcedure.query(async ({ ctx }) => {
    const cfg = await ctx.prisma.supportConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      select: { transferWaitSeconds: true },
    });
    return {
      transferWaitSeconds: cfg?.transferWaitSeconds ?? 30,
    };
  }),

  listFaqs: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.supportFaq.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, question: true, answer: true },
    });
  }),

  askAI: sensitiveProcedure
    .input(
      z.object({
        message: z.string().min(1).max(500),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "ai"]),
              content: z.string().max(2000),
            }),
          )
          .max(20)
          .default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cfg = await loadActiveSupport(ctx.prisma);
      const apiKey = env.ANTHROPIC_API_KEY;

      if (!apiKey) {
        const faq = matchFAQ(input.message, cfg.faqs);
        return {
          answer: faq ?? FALLBACK_NO_MATCH,
          provider: "faq" as const,
        };
      }

      try {
        const messages: AnthropicMessage[] = [
          ...input.history.map((m) => ({
            role: (m.role === "ai" ? "assistant" : "user") as
              | "user"
              | "assistant",
            content: m.content,
          })),
          { role: "user", content: input.message },
        ];

        const answer = await callAnthropic(
          apiKey,
          cfg.modelName,
          cfg.maxTokens,
          cfg.systemPrompt,
          messages,
        );
        return { answer, provider: "anthropic" as const };
      } catch (err) {
        console.error("[support.askAI] Anthropic call failed:", err);
        const faq = matchFAQ(input.message, cfg.faqs);
        return {
          answer: faq ?? FALLBACK_NO_MATCH,
          provider: "fallback" as const,
        };
      }
    }),
});
