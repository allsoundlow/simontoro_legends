import {FastifyPluginAsync} from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

import {AppConfig} from "./config";
import errorHandler from "./plugins/error-handler";
import {InMemoryKeywordRepository} from "./repositories/keyword.repository";
import keywordRoutes from "./routes/api/v1/keywords";
import root from "./routes/root";
import {KeywordService} from "./services/keyword.service";

const app: FastifyPluginAsync<{config: AppConfig; appPath: string}> = async (
  fastify,
  opts,
): Promise<void> => {
  // Set up Zod type provider compilers
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Register error handler plugin
  fastify.register(errorHandler);

  // Register root routes
  fastify.register(root, {prefix: "/api/v1/"});

  // Wire up keyword dependencies
  const keywordRepository = new InMemoryKeywordRepository();
  const keywordService = new KeywordService(keywordRepository);

  // Register keyword API routes
  fastify.register(keywordRoutes, {prefix: "/api/v1/", service: keywordService});
};

export default app;
