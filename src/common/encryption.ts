export interface EncryptionProvider {
  encrypt(value: string): Promise<string> | string;
  decrypt(value: string): Promise<string> | string;
}

export class NoopEncryptionProvider implements EncryptionProvider {
  encrypt(value: string): string {
    return value;
  }

  decrypt(value: string): string {
    return value;
  }
}

