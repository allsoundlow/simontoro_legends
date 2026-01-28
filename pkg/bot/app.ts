import {FastifyPluginAsync} from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

import {AppConfig} from "./config";
import errorHandler from "./plugins/error-handler";
import swagger from "./plugins/swagger";
import {KeywordRepository} from "./repositories/keyword.repository";
import keywordRoutes from "./routes/api/v1/keywords";
import root from "./routes/root";
import type {Keyword} from "./schemas/keyword";
import {KeywordService} from "./services/keyword.service";
import {createAdapter, createConnection} from "./storage";

const app: FastifyPluginAsync<{config: AppConfig; appPath: string}> = async (fastify, opts): Promise<void> => {
  // Set up Zod type provider compilers
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Register plugins
  await fastify.register(swagger);
  await fastify.register(errorHandler);

  // Register root routes
  await fastify.register(root, {prefix: "/api/v1/"});

  // Create storage connection based on config
  const connection = createConnection({pg: opts.config.pg});

  // Create keyword adapter and repository
  const keywordAdapter = createAdapter<Keyword>(connection, "keywords");
  const keywordRepository = new KeywordRepository(keywordAdapter);
  const keywordService = new KeywordService(keywordRepository);

  // Register keyword API routes
  await fastify.register(keywordRoutes, {prefix: "/api/v1/", service: keywordService});
};

export default app;
