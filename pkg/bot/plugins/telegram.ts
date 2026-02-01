/**
 * Telegram bot Fastify plugin
 * Initializes the Telegram router and manages bot lifecycle
 */

import {FastifyPluginAsync} from "fastify";
import fp from "fastify-plugin";
import {Bot} from "grammy";

import {commandRegistry, createAdminCommands, createHelpCommand, TelegramRouter} from "../adapters/telegram";
import type {TelegramConfig} from "../config";
import type {Dependencies} from "../services/base";

type TelegramPluginOptions = {
  config: TelegramConfig;
  deps: Dependencies;
};

const telegramPlugin: FastifyPluginAsync<TelegramPluginOptions> = async (fastify, opts) => {
  const bot = new Bot(opts.config.token);
  
  // Create admin commands (this also registers their metadata with commandRegistry)
  const adminCommands = createAdminCommands(opts.deps);
  
  // Create help command with the registry
  const helpCommand = createHelpCommand(commandRegistry);
  
  const router = new TelegramRouter({
    bot,
    logger: fastify.log,
    commands: [helpCommand, ...adminCommands],
  });

  router.registerCommands();

  fastify.addHook("onReady", async () => {
    fastify.log.info("Starting Telegram bot...");
    await router.start();
  });

  fastify.addHook("onClose", async () => {
    fastify.log.info("Stopping Telegram bot...");
    await router.stop();
  });
};

export default fp(telegramPlugin, {
  name: "telegram",
});
