import { AuthIdentityError } from './errors';
import type { AuthIdentityStorageAdapter, StorageCapability } from '../contracts/storage-adapter';

export function requireRepository<T>(adapter: AuthIdentityStorageAdapter, capability: StorageCapability, repository: T | undefined): T {
  if (!repository || !adapter.capabilities.includes(capability)) {
    throw new AuthIdentityError('AUTH_ADAPTER_NOT_CONFIGURED', `Storage adapter capability "${capability}" is not configured.`);
  }

  return repository;
}
