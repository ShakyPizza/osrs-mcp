interface CacheEntry<T> {
  value: T;
  expires_at: number;
}

export class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttl_ms: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires_at) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expires_at: Date.now() + this.ttl_ms });
  }

  clear(): void {
    this.store.clear();
  }
}
