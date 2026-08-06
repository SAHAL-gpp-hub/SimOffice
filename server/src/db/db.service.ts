import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { DB } from 'kysely-codegen';

@Injectable()
export class DbService
  extends Kysely<DB>
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString:
            process.env.DATABASE_URL ||
            'postgres://postgres:postgres@localhost:5433/simoffice',
        }),
      }),
    });
  }

  async onModuleInit() {
    // Optionally check connection here
  }

  async onModuleDestroy() {
    await this.destroy();
  }
}
