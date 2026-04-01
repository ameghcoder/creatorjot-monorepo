// ═══════════════════════════════════════════════════════════
// 📁 /config/cache.ts — LRU Cache Implementation
// ═══════════════════════════════════════════════════════════

import { LRUCache } from "lru-cache";
import { config } from "./index.js";
import { logger } from "../lib/logger.js";

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Generic LRU cache with TTL support
 */
export class TTLCache<K extends {}, V> {
  private cache: LRUCache<K, CacheEntry<V>>;
  private ttlMs: number;
  private name: string;

  constructor(name: string, maxSize: number, ttlSeconds: number) {
    this.name = name;
    this.ttlMs = ttlSeconds * 1000;
    
    this.cache = new LRUCache<K, CacheEntry<V>>({
      max: maxSize,
      ttl: this.ttlMs,
      updateAgeOnGet: true,
      updateAgeOnHas: false,
    });

    logger.info(`Cache initialized: ${name}`, {
      maxSize,
      ttlSeconds,
    });
  }

  /**
   * Get value from cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      logger.debug(`Cache miss: ${this.name}`, { key });
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug(`Cache expired: ${this.name}`, { key });
      return undefined;
    }

    logger.debug(`Cache hit: ${this.name}`, { key });
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: K, value: V): void {
    const entry: CacheEntry<V> = {
      value,
      expiresAt: Date.now() + this.ttlMs,
    };

    this.cache.set(key, entry);
    logger.debug(`Cache set: ${this.name}`, { key });
  }

  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`Cache delete: ${this.name}`, { key });
    }
    return deleted;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    logger.info(`Cache cleared: ${this.name}`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      name: this.name,
      size: this.cache.size,
      maxSize: this.cache.max,
      ttlMs: this.ttlMs,
    };
  }
}

/**
 * User tier cache
 * Requirements: 31.5
 */
export class UserTierCache {
  private cache: TTLCache<string, "free" | "paid">;

  constructor() {
    this.cache = new TTLCache(
      "user-tier",
      config.cache.userTier.maxSize,
      config.cache.userTier.ttlSeconds
    );
  }

  /**
   * Get user tier from cache
   */
  get(userId: string): "free" | "paid" | undefined {
    return this.cache.get(userId);
  }

  /**
   * Set user tier in cache
   */
  set(userId: string, tier: "free" | "paid"): void {
    this.cache.set(userId, tier);
  }

  /**
   * Check if user tier is cached
   */
  has(userId: string): boolean {
    return this.cache.has(userId);
  }

  /**
   * Delete user tier from cache
   */
  delete(userId: string): boolean {
    return this.cache.delete(userId);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }
}

/**
 * Transcript existence cache
 * Requirements: 31.5
 */
export class TranscriptExistsCache {
  private cache: TTLCache<string, boolean>;

  constructor() {
    this.cache = new TTLCache(
      "transcript-exists",
      config.cache.transcriptExists.maxSize,
      config.cache.transcriptExists.ttlSeconds
    );
  }

  /**
   * Get transcript existence from cache
   */
  get(ytId: string): boolean | undefined {
    return this.cache.get(ytId);
  }

  /**
   * Set transcript existence in cache
   */
  set(ytId: string, exists: boolean): void {
    this.cache.set(ytId, exists);
  }

  /**
   * Check if transcript existence is cached
   */
  has(ytId: string): boolean {
    return this.cache.has(ytId);
  }

  /**
   * Delete transcript existence from cache
   */
  delete(ytId: string): boolean {
    return this.cache.delete(ytId);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }
}

/**
 * Cache manager
 */
export class CacheManager {
  public userTier: UserTierCache;
  public transcriptExists: TranscriptExistsCache;

  constructor() {
    this.userTier = new UserTierCache();
    this.transcriptExists = new TranscriptExistsCache();

    logger.info("CacheManager initialized", {
      userTier: this.userTier.getStats(),
      transcriptExists: this.transcriptExists.getStats(),
    });
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.userTier.clear();
    this.transcriptExists.clear();
    logger.info("All caches cleared");
  }

  /**
   * Get statistics for all caches
   */
  getAllStats() {
    return {
      userTier: this.userTier.getStats(),
      transcriptExists: this.transcriptExists.getStats(),
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
