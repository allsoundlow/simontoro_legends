/**
 * Fun command definitions for the Telegram Router
 */

import type {Context} from "grammy";

import {type AiDependencies,GenerateRoast} from "../../../services/ai";
import {commandRegistry} from "../command-registry";
import type {CommandDefinition} from "../types";

type RoastInput = {
  targetUsername: string;
  level: "soft" | "hard" | "extra";
  context?: string;
  groupId: string;
  requesterId: string;
};

// Pattern: /roast @username [level] [context]
// Level keywords are case-insensitive
const ROAST_PATTERN = /^\/roast(?:\s+@(\w+))?(?:\s+(soft|hard|extra))?(?:\s+(.+))?$/i;

/**
 * Parses the roast command input from message text.
 * Handles cases where level keyword is omitted but context is provided.
 */
function parseRoastCommand(text: string): {username?: string; level: "soft" | "hard" | "extra"; context?: string} {
  const match = text.match(ROAST_PATTERN);
  
  if (!match) {
    return {level: "hard"};
  }

  const [, username, levelMatch, contextMatch] = match;
  
  // If we have a level keyword, use it
  if (levelMatch) {
    return {
      username,
      level: levelMatch.toLowerCase() as "soft" | "hard" | "extra",
      context: contextMatch?.trim() || undefined,
    };
  }
  
  // No level keyword - check if contextMatch starts with a level keyword
  // This handles: /roast @user some context without level
  if (contextMatch) {
    const contextLevelMatch = contextMatch.match(/^(soft|hard|extra)\s+(.+)$/i);
    if (contextLevelMatch) {
      return {
        username,
        level: contextLevelMatch[1].toLowerCase() as "soft" | "hard" | "extra",
        context: contextLevelMatch[2].trim() || undefined,
      };
    }
    // Context provided but no level keyword - use default level
    return {
      username,
      level: "hard",
      context: contextMatch.trim(),
    };
  }
  
  return {
    username,
    level: "hard",
  };
}

/**
 * Creates fun command definitions with the provided dependencies.
 *
 * @param deps - Use case dependencies including openRouterClient and rateLimiter
 * @returns Array of command definitions for fun commands
 */
export function createFunCommands(deps: AiDependencies): CommandDefinition<unknown, unknown>[] {
  // Register metadata for help menu
  commandRegistry.register({
    command: "/roast",
    description: "Generate a playful AI roast of a user",
    usage: "/roast @username [soft|hard|extra] [context]",
    category: "Fun Commands",
  });

  return [
    {
      pattern: ROAST_PATTERN,
      chatFilter: "group",
      useCase: new GenerateRoast(deps),
      parseInput: (ctx: Context): RoastInput => {
        const text = ctx.message?.text ?? "";
        const parsed = parseRoastCommand(text);
        console.log("parsed ", parsed)
        if (!parsed.username) {
          throw new Error("Usage: /roast @username [soft|hard|extra] [optional context]");
        }

        // Validate context length
        if (parsed.context && parsed.context.length > 500) {
          throw new Error("Context too long! Maximum 500 characters.");
        }

        if (!ctx.chat) {
          throw new Error("This command can only be used in group chats.");
        }

        if (!ctx.from) {
          throw new Error("Could not identify the requester.");
        }

        return {
          targetUsername: parsed.username,
          level: parsed.level,
          context: parsed.context,
          groupId: String(ctx.chat.id),
          requesterId: String(ctx.from.id),
        };
      },
      response: {
        type: "text",
        template: "{{roast}}",
      },
      errorResponse: {
        mappings: [
          {
            errorType: "NotFoundError",
            template: "This group is not connected. Use /connect_group first.",
          },
          {
            errorType: "ValidationError",
            template: "{{message}}",
          },
          {
            errorType: "RateLimitError",
            template: "Too many roasts! Try again in {{retryAfter}} seconds 🔥",
          },
        ],
        defaultTemplate: "Failed to generate roast: {{message}}",
      },
    },
  ] as CommandDefinition<unknown, unknown>[];
}
