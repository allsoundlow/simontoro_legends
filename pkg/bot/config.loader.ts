import {readFileSync} from "node:fs";
import {resolve} from "node:path";

import {AppConfig, validateAiConfig, validateConfig} from "./config";

export default function loadConfig(path: {appPath: string}): AppConfig {
  const configPath = resolve(path.appPath, process.env.CONFIG_PATH || "local.config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const validatedConfig = validateConfig(config);

  // Validate AI feature-specific requirements
  validateAiConfig(validatedConfig);

  return validatedConfig;
}
