import {FastifyPluginAsync} from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

import {AppConfig} from "./config";
import errorHandler from "./plugins/error-handler";
import swagger from "./plugins/swagger";
import {InMemoryKeywordRepository} from "./repositories/keyword.repository";
import keywordRoutes from "./routes/api/v1/keywords";
import root from "./routes/root";
import {KeywordService} from "./services/keyword.service";

const app: FastifyPluginAsync<{config: AppConfig; appPath: string}> = async (fastify): Promise<void> => {
  // Set up Zod type provider compilers
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Register plugins
  await fastify.register(swagger);
  await fastify.register(errorHandler);

  // Register root routes
  await fastify.register(root, {prefix: "/api/v1/"});

  // Wire up keyword dependencies
  const keywordRepository = new InMemoryKeywordRepository();
  const keywordService = new KeywordService(keywordRepository);

  // Register keyword API routes
  await fastify.register(keywordRoutes, {prefix: "/api/v1/", service: keywordService});
};

export default app;
