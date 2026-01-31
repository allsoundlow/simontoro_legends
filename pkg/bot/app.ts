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
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  await fastify.register(swagger);
  await fastify.register(errorHandler);

  await fastify.register(root, {prefix: "/api/v1/"});

  const connection = createConnection({pg: opts.config.pg});

  const repos = createRepositories(connection);

  const deps: Dependencies = {
    connection,
    logger: fastify.log,
    repos,
  };

  await fastify.register(keywordRoutes, {prefix: "/api/v1/", deps});
};

export default app;
