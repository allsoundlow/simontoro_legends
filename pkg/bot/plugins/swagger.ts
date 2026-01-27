import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import {FastifyInstance} from "fastify";
import fp from "fastify-plugin";
import {jsonSchemaTransform} from "fastify-type-provider-zod";

async function swagger(fastify: FastifyInstance) {
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Saimontoro Bot API",
        description: "API for the Saimontoro gaming group chatbot",
        version: "1.0.0",
      },
      tags: [
        {name: "keywords", description: "Keyword notification management"},
        {name: "health", description: "Health check endpoints"},
      ],
    },
    transform: jsonSchemaTransform,
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: "/docs",
  });
}

export default fp(swagger, {
  name: "swagger",
});
