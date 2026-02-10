import z from "zod";

import type { OpenRouterClient } from "../../connectors/openrouter/client";
import { NotFoundError, ValidationError } from "../../errors";
import type { RateLimiter } from "../../utils/rate-limiter";
import { Base, type Dependencies } from "../base";

const inputSchema = z.object({
    targetUsername: z.string().min(1),
    level: z.enum(["soft", "hard", "extra"]),
    context: z.string().max(500).optional(),
    groupId: z.string(),
    requesterId: z.string(),
});

type Input = z.infer<typeof inputSchema>;

type Result = { roast: string };

export type AiDependencies = Dependencies & {
    openRouterClient: OpenRouterClient;
    rateLimiter: RateLimiter;
};

/**
 * Generate a playful AI roast of a user in a group chat.
 * Validates group registration, enforces rate limits, and calls OpenRouter API.
 */
export class GenerateRoast extends Base<Input, Result> {
    protected inputSchema = inputSchema;
    private openRouterClient: OpenRouterClient;
    private rateLimiter: RateLimiter;

    constructor(deps: AiDependencies) {
        super(deps);
        this.openRouterClient = deps.openRouterClient;
        this.rateLimiter = deps.rateLimiter;
    }

    protected async checkPermissions(data: Input): Promise<void> {
        // Verify group is registered and active
        const group = await this.repos.group.findActiveByTelegramGroupId(data.groupId);
        if (!group) {
            // Check if group exists but is not active
            const anyGroup = await this.repos.group.findByTelegramGroupId(data.groupId);
            if (anyGroup) {
                throw new ValidationError("This group is not active");
            }
            throw new NotFoundError("Group not registered");
        }
    }

    protected async execute(data: Input): Promise<Result> {
        // Check rate limits (user, group, global)
        await this.rateLimiter.checkLimit(`roast:user:${data.requesterId}`, 5, 60);
        await this.rateLimiter.checkLimit(`roast:group:${data.groupId}`, 20, 60);
        await this.rateLimiter.checkLimit("roast:global", 100, 60);

        // Construct prompts
        const systemPrompt = this.buildSystemPrompt(data.level);
        const userPrompt = this.buildUserPrompt(data.targetUsername, data.context);

        this.logger.info(
            {
                targetUsername: data.targetUsername,
                level: data.level,
                hasContext: !!data.context,
                groupId: data.groupId,
                requesterId: data.requesterId,
            },
            "Generating roast",
        );

        // Call OpenRouter API
        const roast = await this.openRouterClient.generateCompletion({
            systemPrompt,
            userPrompt,
            temperature: 0.8,
            maxTokens: 150,
        });

        this.logger.info(
            {
                targetUsername: data.targetUsername,
                level: data.level,
                groupId: data.groupId,
                requesterId: data.requesterId,
                roastLength: roast.length,
            },
            "Roast generated successfully",
        );

        return { roast };
    }

    private buildSystemPrompt(level: "soft" | "hard" | "extra"): string {
        const baseGuidelines = `You are a witty roast master in a friendly gaming group chat. Your job is to generate playful, humorous roasts that make everyone laugh.

CONTENT GUARDRAILS (MUST FOLLOW):
- NEVER include racist, sexist, homophobic, transphobic, or discriminatory content
- NEVER reference violence, self-harm, or threats
- NEVER use slurs or hate speech of any kind
- NEVER make fun of disabilities, mental health, or medical conditions
- NEVER include sexual or explicit content
- NEVER reveal or reference personal information beyond the username provided
- Keep all humor friendly and in good spirit - the goal is laughter, not harm

LANGUAGE RULES:
- Respond in the SAME LANGUAGE!!! as the user's context/request 
- If no context is provided, respond in English by default

OUTPUT FORMAT:
- Generate exactly 2-3 sentences
- Be creative and original
- Focus on the provided context if available`;

        const levelInstructions = {
            soft: `ROAST LEVEL: SOFT (Gentle Teasing)
- Light and gentle humor, like teasing a good friend
- Keep it wholesome and warm-hearted
- Use playful observations rather than burns
- Think "friendly ribbing" not "roasting"
- Avoid anything that could be taken the wrong way
- Compliment-adjacent jokes are perfect here`,

            hard: `ROAST LEVEL: HARD (Classic Roast)
- Witty burns and clever insults that make everyone laugh
- Humorous and creative, but not mean-spirited
- Sharp observations and playful jabs
- Think comedy roast style - punchy but fun
- The target should laugh along with everyone else
- Balance cleverness with good humor`,

            extra: `ROAST LEVEL: EXTRA (Maximum Roast Energy)
- Go all out with savage humor - no mercy!
- Maximum roast energy while staying friendly
- Devastating burns that are still clearly jokes
- Think "absolutely destroyed but in a fun way"
- Push the boundaries of humor without crossing into harmful territory
- The goal is "I can't believe you said that!" followed by laughter`,
        };

        return `${baseGuidelines}

${levelInstructions[level]}

Generate a roast:`;
    }

    private buildUserPrompt(targetUsername: string, context?: string): string {
    if (context) {
        return `Target: @${targetUsername}
Context (in user's language): ${context}

CRITICAL: Respond in the EXACT same language as the context. Match the language precisely.`;
    }
    return `Target: @${targetUsername}`;
}

}
