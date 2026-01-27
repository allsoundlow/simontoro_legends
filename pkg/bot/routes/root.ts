import {FastifyInstance} from "fastify";
import z from "zod";

export default function rootRoutes(fastify: FastifyInstance) {
  fastify.route({
    url: "/ping",
    method: "POST",
    schema: {
      tags: ["health"],
      summary: "Health check",
      description: "Simple ping endpoint to verify the server is running",
      response: {
        200: z.string().describe("Returns 'pong'"),
      },
    },
    handler: async function pingHandler({log}) {
      log.debug("Ping received");
      return "pong";
    },
  });
}
