import {FastifyPluginAsync} from "fastify";
import {serializerCompiler, validatorCompiler} from "fastify-type-provider-zod";

import {AppConfig} from "./config";
import errorHandler from "./plugins/error-handler";
import swagger from "./plugins/swagger";
import {createRepositories} from "./repositories";
import keywordRoutes from "./routes/api/v1/keywords";
import root from "./routes/root";
import type {Dependencies} from "./services/base";
import {createConnection} from "./storage";

const app: FastifyPluginAsync<{config: AppConfig; appPath: string}> = async (
  fastify,
  opts,
): Promise<void> => {
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

  // Create repository registry
  const repos = createRepositories(connection);

  // Create dependencies object for use cases
  const deps: Dependencies = {
    connection,
    logger: fastify.log,
    repos,
  };

  // Register keyword API routes
  await fastify.register(keywordRoutes, {prefix: "/api/v1/", deps});
};

export default app;
