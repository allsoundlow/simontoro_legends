import {readFileSync} from "node:fs";
import {resolve} from "node:path";

import {FastifyInstance} from "fastify";
import helper from "fastify-cli/helper";

import {AppConfig, validateConfig} from "../config";
import serverConfig from "../config/server-options";

function loadTestConfig(): AppConfig {
  const configPath = process.env.CONFIG_PATH || resolve(__dirname, "../local.test.config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  return validateConfig(config);
}

export async function build(configOverrides?: Partial<AppConfig>): Promise<FastifyInstance> {
  const testConfig = loadTestConfig();
  const appConfig: AppConfig = {...testConfig, ...configOverrides};

  const appPath = resolve(__dirname, "../app.ts");

  const argv = ["-l", "info", appPath, "--options"];

  const app = (await helper.build(
    argv,
    {config: appConfig, appPath: resolve(__dirname, "..")},
    serverConfig(appConfig),
  )) as FastifyInstance;

  return app;
}