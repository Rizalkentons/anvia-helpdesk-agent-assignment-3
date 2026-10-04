#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/d5b3e0e6b3978d0d8d45c98fdf76cd68a45547f2b291b70ea6128d45525110db/contract';
import endContract from '../../snapshots/d5b3e0e6b3978d0d8d45c98fdf76cd68a45547f2b291b70ea6128d45525110db/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'AgentMemoryError',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('error', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('memorySessionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('messages', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('runId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'AgentMemoryMessage',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('memorySessionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('message', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('position', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('runId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('turn', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'AgentMemorySession',
        columns: [
          col('compactionState', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('scopeKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sessionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'AgentMemoryMessage',
        constraint: 'AgentMemoryMessage_memorySessionId_position_key',
        columns: ['memorySessionId', 'position'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'AgentMemorySession',
        constraint: 'AgentMemorySession_scopeKey_key',
        columns: ['scopeKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentMemoryError',
        index: 'AgentMemoryError_memorySessionId_idx_e2496344',
        columns: ['memorySessionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentMemoryError',
        index: 'AgentMemoryError_runId_idx_a6016437',
        columns: ['runId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentMemoryMessage',
        index: 'AgentMemoryMessage_memorySessionId_idx_e2496344',
        columns: ['memorySessionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentMemoryMessage',
        index: 'AgentMemoryMessage_runId_idx_a6016437',
        columns: ['runId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AgentMemorySession',
        index: 'AgentMemorySession_sessionId_userId_idx_3d9f8c77',
        columns: ['sessionId', 'userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AgentMemoryError',
        foreignKey: {
          name: 'AgentMemoryError_memorySessionId_fkey',
          columns: ['memorySessionId'],
          references: { schema: 'public', table: 'AgentMemorySession', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AgentMemoryMessage',
        foreignKey: {
          name: 'AgentMemoryMessage_memorySessionId_fkey',
          columns: ['memorySessionId'],
          references: { schema: 'public', table: 'AgentMemorySession', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
