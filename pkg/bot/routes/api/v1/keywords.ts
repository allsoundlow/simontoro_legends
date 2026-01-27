import {FastifyInstance} from "fastify";
import {ZodTypeProvider} from "fastify-type-provider-zod";

import {ConflictError, NotFoundError} from "../../../errors";
import {emptyResponseSchema, errorResponseSchema} from "../../../schemas/common/error";
import {
  createKeywordSchema,
  groupIdParamSchema,
  keywordIdParamSchema,
  keywordListSchema,
  keywordResponseSchema,
  listKeywordsQuerySchema,
  updateKeywordSchema,
} from "../../../schemas/keyword";
import {KeywordService} from "../../../services/keyword.service";

// Plugin options for dependency injection
export type KeywordRoutesOptions = {
  service: KeywordService;
};

export default function keywordRoutes(fastify: FastifyInstance, opts: KeywordRoutesOptions) {
  const {service} = opts;
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /groups/:groupId/keywords - Create keyword
  server.route({
    method: "POST",
    url: "/groups/:groupId/keywords",
    schema: {
      params: groupIdParamSchema,
      body: createKeywordSchema,
      response: {
        201: keywordResponseSchema,
        400: errorResponseSchema,
        404: errorResponseSchema,
        409: errorResponseSchema,
      },
    },
    handler: async function createKeywordHandler({params, body, log}, reply) {
      const {groupId} = params;

      log.info({groupId, pattern: body.pattern}, "Creating keyword");

      const result = await service.create(groupId, body);

      if (result.ok === false) {
        if (result.error.type === "conflict") {
          throw new ConflictError(result.error.message);
        }
        throw new NotFoundError(result.error.message);
      }

      log.info({groupId, keywordId: result.data.id}, "Keyword created");
      return reply.status(201).send({data: result.data});
    },
  });

  // GET /groups/:groupId/keywords - List keywords
  server.route({
    method: "GET",
    url: "/groups/:groupId/keywords",
    schema: {
      params: groupIdParamSchema,
      querystring: listKeywordsQuerySchema,
      response: {
        200: keywordListSchema,
        404: errorResponseSchema,
      },
    },
    handler: async function listKeywordsHandler({params, query, log}) {
      const {groupId} = params;

      log.debug({groupId, ...query}, "Listing keywords");

      const result = await service.list(groupId, query);

      if (result.ok === false) {
        throw new NotFoundError(result.error.message);
      }

      return result.data;
    },
  });

  // GET /groups/:groupId/keywords/:keywordId - Get single keyword
  server.route({
    method: "GET",
    url: "/groups/:groupId/keywords/:keywordId",
    schema: {
      params: keywordIdParamSchema,
      response: {
        200: keywordResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: async function getKeywordHandler({params, log}) {
      const {groupId, keywordId} = params;

      log.debug({groupId, keywordId}, "Getting keyword");

      const result = await service.getById(groupId, keywordId);

      if (result.ok === false) {
        throw new NotFoundError(result.error.message);
      }

      return {data: result.data};
    },
  });

  // PATCH /groups/:groupId/keywords/:keywordId - Update keyword
  server.route({
    method: "PATCH",
    url: "/groups/:groupId/keywords/:keywordId",
    schema: {
      params: keywordIdParamSchema,
      body: updateKeywordSchema,
      response: {
        200: keywordResponseSchema,
        400: errorResponseSchema,
        404: errorResponseSchema,
        409: errorResponseSchema,
      },
    },
    handler: async function updateKeywordHandler({params, body, log}) {
      const {groupId, keywordId} = params;

      log.info({groupId, keywordId}, "Updating keyword");

      const result = await service.update(groupId, keywordId, body);

      if (result.ok === false) {
        if (result.error.type === "conflict") {
          throw new ConflictError(result.error.message);
        }
        throw new NotFoundError(result.error.message);
      }

      log.info({groupId, keywordId}, "Keyword updated");
      return {data: result.data};
    },
  });

  // DELETE /groups/:groupId/keywords/:keywordId - Delete keyword
  server.route({
    method: "DELETE",
    url: "/groups/:groupId/keywords/:keywordId",
    schema: {
      params: keywordIdParamSchema,
      response: {
        204: emptyResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: async function deleteKeywordHandler({params, log}, reply) {
      const {groupId, keywordId} = params;

      log.info({groupId, keywordId}, "Deleting keyword");

      const result = await service.delete(groupId, keywordId);

      if (result.ok === false) {
        throw new NotFoundError(result.error.message);
      }

      log.info({groupId, keywordId}, "Keyword deleted");
      return reply.status(204).send();
    },
  });
}
