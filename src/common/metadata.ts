import { JsonObject, JsonValue } from './types';
import { AuthIdentityError } from './errors';

const DEFAULT_SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'clientSecret',
  'secret',
  'nik',
  'npwp',
  'passport',
  'passportNumber',
  'identityNumber',
  'documentNumber',
  'ktp',
];

export function assertJsonObject(value: unknown): asserts value is JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AuthIdentityError('AUTH_METADATA_INVALID');
  }
}

export function assertMetadataAllowed(metadata: JsonObject, additionalSensitiveKeys: string[] = []): void {
  const sensitiveKeys = new Set([...DEFAULT_SENSITIVE_KEYS, ...additionalSensitiveKeys].map((key) => key.toLowerCase()));
  const found = findSensitiveKeys(metadata, sensitiveKeys);
  if (found.length > 0) {
    throw new AuthIdentityError('AUTH_SENSITIVE_DATA_NOT_ALLOWED_IN_METADATA', 'Metadata contains sensitive keys.', { keys: found });
  }
}

export function redactSensitiveMetadata(metadata: JsonObject | undefined, additionalSensitiveKeys: string[] = []): JsonObject | undefined {
  if (!metadata) {
    return undefined;
  }

  const sensitiveKeys = new Set([...DEFAULT_SENSITIVE_KEYS, ...additionalSensitiveKeys].map((key) => key.toLowerCase()));
  return redactValue(metadata, sensitiveKeys) as JsonObject;
}

function findSensitiveKeys(value: JsonValue, sensitiveKeys: Set<string>, path = ''): string[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => findSensitiveKeys(entry, sensitiveKeys, `${path}[${index}]`));
  }

  return Object.entries(value).flatMap(([key, entry]) => {
    const currentPath = path ? `${path}.${key}` : key;
    const own = sensitiveKeys.has(key.toLowerCase()) ? [currentPath] : [];
    return [...own, ...findSensitiveKeys(entry, sensitiveKeys, currentPath)];
  });
}

function redactValue(value: JsonValue, sensitiveKeys: Set<string>): JsonValue {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, sensitiveKeys));
  }

  const output: JsonObject = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = sensitiveKeys.has(key.toLowerCase()) ? '[REDACTED]' : redactValue(entry, sensitiveKeys);
  }
  return output;
}

