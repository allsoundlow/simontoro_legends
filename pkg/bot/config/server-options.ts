import {randomBytes} from "node:crypto";

import {FastifyServerOptions} from "fastify";

import {AppConfig} from "./";

export type AppOptions = FastifyServerOptions;

const config = ({logger}: AppConfig): AppOptions => {
  const targets = [
    {target: logger.pretty ? "pino-pretty" : "pino/file", options: {destination: 1}},
  ];
  return {
    logger: {
      level: logger.logLevel || "info",
      transport: {targets},
      timestamp: () => {
        const dateString = new Date(Date.now()).toISOString();
        return `,"@timestamp":"${dateString}"`;
      },
    },
    disableRequestLogging: true,
    requestIdLogLabel: "traceId",
    requestIdHeader: "x-req-id",
    genReqId: function () {
      return randomBytes(16).toString("hex");
    },
    ajv: {customOptions: {removeAdditional: "all"}},
  };
};
export default (app: AppConfig) => config(app);
