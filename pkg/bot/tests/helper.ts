import {readFileSync} from "node:fs";
import {resolve} from "node:path";

import fastify, {FastifyInstance} from "fastify";

import app from "../app";
import {AppConfig, validateConfig} from "../config";
import serverConfig from "../config/server-options";

function loadTestConfig(): AppConfig {
  const configPath = process.env.CONFIG_PATH || resolve(__dirname, "../local.test.config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  return validateConfig(config);
}

/**
 * Build a Fastify test instance.
 *
 * This helper directly creates a Fastify instance
 * which provides the same functionality for testing.
 *
 * @param configOverrides - Optional config overrides for testing
 * @returns A ready Fastify instance for testing with inject()
 */
export async function build(configOverrides?: Partial<AppConfig>): Promise<FastifyInstance> {
  const testConfig = loadTestConfig();
  const appConfig: AppConfig = {...testConfig, ...configOverrides};

  const appPath = resolve(__dirname, "..");

  const server = fastify(serverConfig(appConfig));
  await server.register(app, {config: appConfig, appPath});
  await server.ready();

  return server;
}