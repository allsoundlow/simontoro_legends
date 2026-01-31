import type {Kysely} from "kysely";

import type {Entity, FieldFilter, InsertData, ListQuery, ListResult, StorageAdapter, UpdateData} from "../adapter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = Record<string, any>;

export class PostgresAdapter<T extends Entity> implements StorageAdapter<T> {
  constructor(
    private db: Kysely<AnyDatabase>,
    private table: string,
  ) {}

  async get(pk: number): Promise<T | null> {
    const result = await this.db
      .selectFrom(this.table)
      .selectAll()
      .where("pk", "=", pk)
      .executeTakeFirst();
    return (result as T | undefined) ?? null;
  }

  async getOneByFields(fields: FieldFilter<T>): Promise<T | null> {
    let query = this.db.selectFrom(this.table).selectAll();

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        query = query.where(key, "=", value);
      }
    }

    const result = await query.executeTakeFirst();
    return (result as T | undefined) ?? null;
  }

  async getAllByFields(fields: FieldFilter<T>, query: ListQuery = {}): Promise<ListResult<T>> {
    const {limit = 50, offset = 0} = query;

    let baseQuery = this.db.selectFrom(this.table);

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        baseQuery = baseQuery.where(key, "=", value);
      }
    }

    const [data, countResult] = await Promise.all([
      baseQuery.selectAll().limit(limit).offset(offset).execute(),
      baseQuery
        .select((eb) => eb.fn.countAll().as("count"))
        .executeTakeFirst(),
    ]);

    return {
      data: data as T[],
      pagination: {
        total: Number(countResult?.count ?? 0),
        limit,
        offset,
      },
    };
  }

  async insert(data: InsertData<T>): Promise<number> {
    const result = await this.db
      .insertInto(this.table)
      .values(data)
      .returning("pk")
      .executeTakeFirstOrThrow();
    return result.pk as number;
  }

  async update(pk: number, data: UpdateData<T>): Promise<number | null> {
    // Filter out undefined values to preserve existing fields
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );

    if (!Object.keys(filteredData).length) {
      return pk;
    }

    const result = await this.db
      .updateTable(this.table)
      .set(filteredData)
      .where("pk", "=", pk)
      .returning("pk")
      .executeTakeFirst();
    return (result?.pk as number | undefined) ?? null;
  }

  async remove(pk: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom(this.table)
      .where("pk", "=", pk)
      .executeTakeFirst();
    return result.numDeletedRows > 0n;
  }

  async count(fields: FieldFilter<T>): Promise<number> {
    let query = this.db.selectFrom(this.table);

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        query = query.where(key, "=", value);
      }
    }

    const result = await query
      .select((eb) => eb.fn.countAll().as("count"))
      .executeTakeFirst();
    return Number(result?.count ?? 0);
  }
}
