import type {FastifyBaseLogger} from "fastify";
import type {Bot, Context} from "grammy";
import {InlineKeyboard} from "grammy";

import {formatErrorResponse, formatResponse} from "./response-formatter";
import type {CommandDefinition, ErrorResponseConfig} from "./types";

export type TelegramRouterOptions = {
  bot: Bot;
  logger: FastifyBaseLogger;
  commands?: CommandDefinition<unknown, unknown>[];
};

const DEFAULT_ERROR_CONFIG: ErrorResponseConfig = {
  mappings: [],
  defaultTemplate: "Something went wrong. Please try again later.",
};

/**
 * TelegramRouter - Routes incoming Telegram messages to use cases based on declarative command definitions.
 */
export class TelegramRouter {
  private bot: Bot;
  private logger: FastifyBaseLogger;
  private commands: CommandDefinition<unknown, unknown>[] = [];

  /**
   * Creates a new TelegramRouter instance.
   *
   * @param options - Router configuration with bot, logger, and optional commands
   */
  constructor(options: TelegramRouterOptions) {
    this.bot = options.bot;
    this.logger = options.logger;
    if (options.commands) {
      this.commands = options.commands;
    }
  }

  /**
   * Registers a command definition with the router.
   * Commands are stored in registration order for pattern matching.
   *
   * @param command - Command definition to register
   * @returns this for method chaining
   */
  register<TInput, TResult>(command: CommandDefinition<TInput, TResult>): this {
    this.commands.push(command as CommandDefinition<unknown, unknown>);
    return this;
  }

  /**
   * Sets up the grammY message handler to route messages to use cases.
   */
  registerCommands(): void {
    this.bot.on("message:text", async (ctx) => {
      await this.handleMessage(ctx);
    });
  }

  async start(): Promise<void> {
    this.bot.start();
  }

  /**
   * Gracefully stops the bot, completing any in-progress message handling.
   */
  async stop(): Promise<void> {
    await this.bot.stop();
  }

  /**
   * Handles an incoming text message by matching against registered patterns.
   */
  private async handleMessage(ctx: Context): Promise<void> {
    const text = ctx.message?.text;
    if (!text) return;

    const matchedCommand = this.findMatchingCommand(text);
    if (!matchedCommand) {
      return;
    }

    // Check chat filter
    if (!this.matchesChatFilter(ctx, matchedCommand.chatFilter)) {
      return;
    }

    const userId = ctx.from?.id;

    this.logger.debug({userId, pattern: matchedCommand.pattern.source}, "Command matched");

    try {
      const input = matchedCommand.parseInput(ctx);
      const result = await matchedCommand.useCase.run(input);
      this.logger.info({userId, pattern: matchedCommand.pattern.source}, "Command executed successfully");

      await this.sendResponse(ctx, matchedCommand, result);
    } catch (error) {
      await this.handleError(ctx, matchedCommand, error as Error, userId);
    }
  }

  /**
   * Checks if the current chat type matches the command's chat filter.
   */
  private matchesChatFilter(
    ctx: Context,
    filter: "private" | "group" | "all" | undefined,
  ): boolean {
    if (!filter || filter === "all") {
      return true;
    }

    const chatType = ctx.chat?.type;

    if (filter === "private") {
      return chatType === "private";
    }

    if (filter === "group") {
      return chatType === "group" || chatType === "supergroup";
    }

    return true;
  }

  /**
   * Finds the first command whose pattern matches the message text.
   */
  private findMatchingCommand(text: string): CommandDefinition<unknown, unknown> | null {
    for (const command of this.commands) {
      if (command.pattern.test(text)) {
        return command;
      }
    }
    return null;
  }

  /**
   * Sends a formatted response to the user.
   */
  private async sendResponse(
    ctx: Context,
    command: CommandDefinition<unknown, unknown>,
    result: unknown,
  ): Promise<void> {
    const responseConfig = command.response;
    const formattedMessage = formatResponse(
      responseConfig,
      result as Record<string, unknown>,
    );

    if (formattedMessage === null) {
      return;
    }

    if (responseConfig.type === "text_with_keyboard") {
      const keyboard = new InlineKeyboard();
      for (const row of responseConfig.keyboard.buttons) {
        for (const button of row) {
          keyboard.text(button.text, button.callbackData);
        }
        keyboard.row();
      }
      await ctx.reply(formattedMessage, {reply_markup: keyboard});
      return;
    }

    await ctx.reply(formattedMessage);
  }

  /**
   * Handles errors from use case execution.
   */
  private async handleError(
    ctx: Context,
    command: CommandDefinition<unknown, unknown>,
    error: Error,
    userId: number | undefined,
  ): Promise<void> {
    this.logger.error(
      {
        userId,
        pattern: command.pattern.source,
        errorType: error.constructor.name,
        errorMessage: error.message,
        ...error
      },
      "Command execution failed",
    );

    const errorConfig = command.errorResponse ?? DEFAULT_ERROR_CONFIG;
    const errorMessage = formatErrorResponse(errorConfig, error);

    await ctx.reply(errorMessage);
  }
}
