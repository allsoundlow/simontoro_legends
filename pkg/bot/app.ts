import {FastifyPluginAsync} from "fastify";

import {AppConfig} from "./config";
import root from "./routes/root";

const app: FastifyPluginAsync<{config: AppConfig; appPath: string}> = async (
  fastify,
  opts,
): Promise<void> => {
  // Register root routes
  fastify.register(root, {prefix: "/oicp/v2.3/"});
};

export default app;
