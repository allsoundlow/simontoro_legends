/**
 * Group command definitions for the Telegram Router
 */

import type {Context} from "grammy";

import type {Dependencies} from "../../../services/base";
import {Register} from "../../../services/group";
import {commandRegistry} from "../command-registry";
import type {CommandDefinition} from "../types";

type ConnectGroupInput = {
  adminTelegramId: string;
  telegramGroupId: string;
  groupName: string;
};

/**
 * Creates group command definitions with the provided dependencies.
 *
 * @param deps - Use case dependencies (connection, logger, repos)
 * @returns Array of command definitions for group commands
 */
export function createGroupCommands(deps: Dependencies): CommandDefinition<unknown, unknown>[] {
  // Register metadata for help menu
  commandRegistry.register({
    command: "/connect_group",
    description: "Connect this group to the bot",
    category: "Group Commands",
  });

  return [
    {
      pattern: /^\/connect_group$/,
      chatFilter: "group",
      useCase: new Register(deps),
      parseInput: (ctx: Context): ConnectGroupInput => ({
        adminTelegramId: String(ctx.from!.id),
        telegramGroupId: String(ctx.chat!.id),
        groupName: (ctx.chat as {title?: string}).title ?? "Unnamed Group",
      }),
      response: {
        type: "text",
        template:
          "🎉 *{{group_name}}* is now connected!\n\nI can help with:\n• Keyword notifications\n• Game stats lookup\n• Custom commands\n\nUse /help for more info.",
      },
      errorResponse: {
        mappings: [
          {
            errorType: "NotFoundError",
            template: "You need to register first. Send /register to me in a private chat.",
          },
          {
            errorType: "ConflictError",
            template: "This group is already connected! 👍",
          },
        ],
        defaultTemplate: "Failed to connect group: {{message}}",
      },
    },
  ] as CommandDefinition<unknown, unknown>[];
}
