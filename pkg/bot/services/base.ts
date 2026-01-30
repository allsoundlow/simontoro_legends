import type {FastifyBaseLogger} from "fastify";

import {Repositories} from "../repositories";
import type {Connection} from "../storage";
import {BaseService} from "./base.service";

export type Dependencies = {
  connection: Connection;
  logger: FastifyBaseLogger;
  repos: Repositories;
};

/**
 * Project-specific base class for use cases.
 * Extends BaseService with project dependencies (storage, logger, repositories).
 * Automatically wraps execute() in a database transaction for postgres connections.
 *
 * All concrete use cases should extend this class.
 */
export abstract class Base<TInput = unknown, TResult = unknown> extends BaseService<
  TInput,
  TResult
> {
  protected connection: Connection;
  protected logger: FastifyBaseLogger;
  private baseRepos: Repositories;

  // Transaction-bound repositories (set during aroundExecute)
  private trxRepos?: Repositories;

  constructor(deps: Dependencies) {
    super();
    this.connection = deps.connection;
    this.logger = deps.logger;
    this.baseRepos = deps.repos;
  }

  /**
   * Returns transaction-aware repositories.
   * During transaction, returns repos bound to the transaction.
   * Outside transaction, returns the base repos.
   */
  protected get repos(): Repositories {
    return this.trxRepos ?? this.baseRepos;
  }

  /**
   * Wraps execute() in a database transaction for postgres connections.
   * For memory connections, just calls proceed directly.
   */
  protected override async aroundExecute(
    cleanData: TInput,
    proceed: (data: TInput) => Promise<TResult>,
  ): Promise<TResult> {
    if (this.connection.type === "memory") {
      // Memory connection — no transaction needed
      return super.aroundExecute(cleanData, proceed);
    }

    // Wrap in Kysely transaction
    return this.connection.db.transaction().execute(async (trx) => {
      this.trxRepos = this.baseRepos.withTransaction(trx);
      try {
        return await super.aroundExecute(cleanData, proceed);
      } finally {
        this.trxRepos = undefined;
      }
    });
  }
}
