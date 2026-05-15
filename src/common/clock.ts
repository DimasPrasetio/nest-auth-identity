export interface AuthIdentityClock {
  now(): Date;
}

export class SystemClock implements AuthIdentityClock {
  now(): Date {
    return new Date();
  }
}

