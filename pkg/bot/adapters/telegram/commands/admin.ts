/**
 * Admin command definitions for the Telegram Router
 */

import type {Context} from "grammy";

import type {Admin} from "../../../entities";
import {DeleteAccount, GetStatus, Register} from "../../../services/admin";
import type {Dependencies} from "../../../services/base";
import type {CommandDefinition} from "../types";

type RegisterInput = {
  telegramUserId: string;
  telegramUsername: string | null;
};

type GetStatusInput = {
  telegramUserId: string;
};

type GetStatusOutput = {
  admin: Admin;
  groupCount: number;
};

type DeleteAccountInput = {
  telegramUserId: string;
};

/**
 * Creates admin command definitions with the provided dependencies.
 *
 * @param deps - Use case dependencies (connection, logger, repos)
 * @returns Array of command definitions for admin commands
 */
export function createAdminCommands(deps: Dependencies): CommandDefinition<unknown, unknown>[] {
  return [
    {
      pattern: /^\/register$/,
      useCase: new Register(deps),
      parseInput: (ctx: Context): RegisterInput => ({
        telegramUserId: String(ctx.from!.id),
        telegramUsername: ctx.from!.username ?? null,
      }),
      response: {
        type: "text",
        template:
          "Welcome, {{telegram_username}}! You're now registered as an admin. Use /status to check your account.",
      },
      errorResponse: {
        mappings: [{errorType: "ConflictError", template: "You're already registered!"}],
        defaultTemplate: "Registration failed: {{message}}",
      },
    },
    {
      pattern: /^\/status$/,
      useCase: new GetStatus(deps),
      parseInput: (ctx: Context): GetStatusInput => ({
        telegramUserId: String(ctx.from!.id),
      }),
      response: {
        type: "text",
        template:
          "📊 Your Status\n\nUsername: @{{admin.telegram_username}}\nGroups: {{groupCount}}",
      },
      errorResponse: {
        mappings: [
          {errorType: "NotFoundError", template: "You're not registered. Use /register first."},
        ],
        defaultTemplate: "Could not fetch status: {{message}}",
      },
    },
    {
      pattern: /^\/delete_account$/,
      useCase: new DeleteAccount(deps),
      parseInput: (ctx: Context): DeleteAccountInput => ({
        telegramUserId: String(ctx.from!.id),
      }),
      response: {
        type: "text",
        template: "Your account and all associated groups have been deleted. Goodbye! 👋",
      },
      errorResponse: {
        mappings: [
          {errorType: "NotFoundError", template: "You don't have an account to delete."},
        ],
        defaultTemplate: "Could not delete account: {{message}}",
      },
    },
  ] as CommandDefinition<unknown, unknown>[];
}
