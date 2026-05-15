export function normalizeEmail(email?: string): string | undefined {
  return email?.trim().toLowerCase();
}

export function normalizeUsername(username?: string): string | undefined {
  return username?.trim().toLowerCase();
}

export function normalizePhoneNumber(phoneNumber?: string): string | undefined {
  return phoneNumber?.trim();
}

