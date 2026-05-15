import { randomUUID } from 'node:crypto';

export type AuthIdentityIdStrategy = 'increment' | 'uuid';
export type AuthIdentityIdSource = 'module' | 'storage';

export interface AuthIdentityIdGeneratorOptions {
  strategy?: AuthIdentityIdStrategy;
  source?: AuthIdentityIdSource;
  prefix?: boolean;
  startAt?: number;
}

export interface AuthIdentityIdGenerator {
  generate(scope?: string): string;
}

export class AutoIncrementIdGenerator implements AuthIdentityIdGenerator {
  private readonly counters = new Map<string, number>();
  private readonly prefix: boolean;
  private readonly startAt: number;

  constructor(options: AuthIdentityIdGeneratorOptions = {}) {
    this.prefix = options.prefix ?? false;
    this.startAt = options.startAt ?? 1;
  }

  generate(scope = 'default'): string {
    const next = this.counters.get(scope) ?? this.startAt;
    this.counters.set(scope, next + 1);
    return this.prefix && scope ? `${scope}_${next}` : String(next);
  }
}

export class RandomUuidGenerator implements AuthIdentityIdGenerator {
  private readonly prefix: boolean;

  constructor(options: AuthIdentityIdGeneratorOptions = {}) {
    this.prefix = options.prefix ?? false;
  }

  generate(scope?: string): string {
    const id = randomUUID();
    return this.prefix && scope ? `${scope}_${id}` : id;
  }
}

export function createAuthIdentityIdGenerator(options: AuthIdentityIdGeneratorOptions = {}): AuthIdentityIdGenerator {
  if ((options.strategy ?? 'increment') === 'uuid') {
    return new RandomUuidGenerator(options);
  }

  return new AutoIncrementIdGenerator(options);
}

export function generateEntityId(generator: AuthIdentityIdGenerator, options: AuthIdentityIdGeneratorOptions, scope: string): string | undefined {
  if ((options.source ?? 'module') === 'storage') {
    return undefined;
  }

  return generator.generate(scope);
}
