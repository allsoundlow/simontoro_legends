import {FastifyInstance} from "fastify";
import {ZodTypeProvider} from "fastify-type-provider-zod";

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
import type {Dependencies} from "../../../services/base";
import * as Keyword from "../../../services/keyword";

// Plugin options for dependency injection
export type KeywordRoutesOptions = {
  deps: Dependencies;
};

export default async function keywordRoutes(fastify: FastifyInstance, opts: KeywordRoutesOptions) {
  const {deps} = opts;
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /groups/:groupId/keywords - Create keyword
  server.route({
    method: "POST",
    url: "/groups/:groupId/keywords",
    schema: {
      tags: ["keywords"],
      summary: "Create a keyword",
      description: "Create a new keyword notification for a group",
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

      const createUseCase = new Keyword.Create(deps);
      const result = await createUseCase.run({
        groupId,
        pattern: body.pattern,
        patternType: body.pattern_type,
        caseSensitive: body.case_sensitive,
        cooldownSeconds: body.cooldown_seconds,
      });

      log.info({groupId, keywordPk: result.pk}, "Keyword created");
      return reply.status(201).send({data: result});
    },
  });

  // GET /groups/:groupId/keywords - List keywords
  server.route({
    method: "GET",
    url: "/groups/:groupId/keywords",
    schema: {
      tags: ["keywords"],
      summary: "List keywords",
      description: "List all keywords for a group with pagination",
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

      const listUseCase = new Keyword.List(deps);
      const result = await listUseCase.run({
        groupId,
        patternType: query.pattern_type,
        limit: query.limit,
        offset: query.offset,
      });

      return result;
    },
  });

  // GET /groups/:groupId/keywords/:keywordId - Get single keyword
  server.route({
    method: "GET",
    url: "/groups/:groupId/keywords/:keywordId",
    schema: {
      tags: ["keywords"],
      summary: "Get a keyword",
      description: "Get a single keyword by ID",
      params: keywordIdParamSchema,
      response: {
        200: keywordResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: async function getKeywordHandler({params, log}) {
      const {groupId, keywordId} = params;

      log.debug({groupId, keywordId}, "Getting keyword");

      const getByIdUseCase = new Keyword.GetById(deps);
      const result = await getByIdUseCase.run({groupId, keywordId});

      return {data: result};
    },
  });

  // PATCH /groups/:groupId/keywords/:keywordId - Update keyword
  server.route({
    method: "PATCH",
    url: "/groups/:groupId/keywords/:keywordId",
    schema: {
      tags: ["keywords"],
      summary: "Update a keyword",
      description: "Update an existing keyword",
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

      const updateUseCase = new Keyword.Update(deps);
      const result = await updateUseCase.run({
        groupId,
        keywordId,
        pattern: body.pattern,
        patternType: body.pattern_type,
        caseSensitive: body.case_sensitive,
        cooldownSeconds: body.cooldown_seconds,
      });

      log.info({groupId, keywordId}, "Keyword updated");
      return {data: result};
    },
  });

  // DELETE /groups/:groupId/keywords/:keywordId - Delete keyword
  server.route({
    method: "DELETE",
    url: "/groups/:groupId/keywords/:keywordId",
    schema: {
      tags: ["keywords"],
      summary: "Delete a keyword",
      description: "Delete a keyword by ID",
      params: keywordIdParamSchema,
      response: {
        204: emptyResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: async function deleteKeywordHandler({params, log}, reply) {
      const {groupId, keywordId} = params;

      log.info({groupId, keywordId}, "Deleting keyword");

      const deleteUseCase = new Keyword.Delete(deps);
      await deleteUseCase.run({groupId, keywordId});

      log.info({groupId, keywordId}, "Keyword deleted");
      return reply.status(204).send();
    },
  });
}
