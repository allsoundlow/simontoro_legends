import {FastifyError, FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import fp from "fastify-plugin";

import {AppError} from "../errors";

function errorHandler(
  error: FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const requestId = request.id || `req_${Date.now()}`;

  // Handle application errors
  if (error instanceof AppError) {
    request.log.warn({err: error, requestId}, error.message);
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        request_id: requestId,
        ...(error.details && {details: error.details}),
      },
    });
  }

  // Handle Fastify validation errors (from Zod schemas)
  if (error.validation) {
    request.log.warn({err: error, requestId}, "Validation error");
    const details = error.validation.map((v) => ({
      field: v.instancePath || v.params?.missingProperty || "unknown",
      message: v.message || "Invalid value",
    }));
    return reply.status(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        request_id: requestId,
        details,
      },
    });
  }

  // Handle unexpected errors
  request.log.error({err: error, requestId}, "Unexpected error");
  return reply.status(500).send({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      request_id: requestId,
    },
  });
}

async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler(errorHandler);
}

export default fp(errorHandlerPlugin, {name: "error-handler"});
