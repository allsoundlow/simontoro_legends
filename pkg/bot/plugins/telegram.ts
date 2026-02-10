/**
 * Telegram bot Fastify plugin
 * Initializes the Telegram router and manages bot lifecycle
 */

import {FastifyPluginAsync} from "fastify";
import fp from "fastify-plugin";
import {Bot} from "grammy";

import {commandRegistry, createAdminCommands, createFunCommands, createGroupCommands, createHelpCommand, TelegramRouter} from "../adapters/telegram";
import type {OpenRouterConfig, TelegramConfig} from "../config";
import {OpenRouterClient} from "../connectors/openrouter/client";
import type {Dependencies} from "../services/base";
import {RateLimiter} from "../utils/rate-limiter";

type TelegramPluginOptions = {
  config: TelegramConfig;
  deps: Dependencies;
  openRouterConfig?: OpenRouterConfig;
};

const telegramPlugin: FastifyPluginAsync<TelegramPluginOptions> = async (fastify, opts) => {
  const bot = new Bot(opts.config.token);
  
  // Create admin commands (this also registers their metadata with commandRegistry)
  const adminCommands = createAdminCommands(opts.deps);
  
  // Create group commands (this also registers their metadata with commandRegistry)
  const groupCommands = createGroupCommands(opts.deps);
  
  // Create help command with the registry
  const helpCommand = createHelpCommand(commandRegistry);

  // Collect all commands
  const allCommands = [helpCommand, ...adminCommands, ...groupCommands];

  // Initialize AI dependencies if OpenRouter config is provided
  let cleanupInterval: ReturnType<typeof setInterval> | undefined;

  if (opts.openRouterConfig) {
    // Initialize OpenRouter client
    const openRouterClient = new OpenRouterClient(opts.openRouterConfig, fastify.log);

    // Initialize rate limiter with periodic cleanup (every 60s)
    const rateLimiter = new RateLimiter();
    cleanupInterval = setInterval(() => rateLimiter.cleanup(), 60000);

    // Create extended deps for AI features
    const aiDeps = {...opts.deps, openRouterClient, rateLimiter};

    // Create fun commands (this also registers their metadata with commandRegistry)
    const funCommands = createFunCommands(aiDeps);
    allCommands.push(...funCommands);

    fastify.log.info("AI roast feature enabled with OpenRouter integration");
  }
  
  const router = new TelegramRouter({
    bot,
    logger: fastify.log,
    commands: allCommands,
  });

  router.registerCommands();

  fastify.addHook("onReady", async () => {
    fastify.log.info("Starting Telegram bot...");
    await router.start();
  });

  fastify.addHook("onClose", async () => {
    fastify.log.info("Stopping Telegram bot...");
    // Clear the cleanup interval to prevent memory leaks
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
    await router.stop();
  });
};

export default fp(telegramPlugin, {
  name: "telegram",
});
