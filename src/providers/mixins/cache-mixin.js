/**
 * Cache Management Mixin
 * 
 * Provides unified caching functionality for all providers:
 * - Cache creation and management
 * - Automatic cleanup and size management
 * - Statistics and monitoring
 * - Expiry handling
 */

class CacheMixin {
  constructor(options = {}) {
    // Cache configuration
    this._caches = new Map();
    this._defaultExpiry = options.defaultExpiry || 5 * 60 * 1000; // 5 minutes
    this._defaultMaxSize = options.defaultMaxSize || 100;
    this._cleanupInterval = options.cleanupInterval || 2 * 60 * 1000; // 2 minutes
    
    // Global cleanup tracking
    this._lastGlobalCleanup = Date.now();
    this._cleanupCallbacks = new Set();
  }

  // ============================================================================
  // CACHE CREATION AND MANAGEMENT
  // ============================================================================

  /**
   * Create a new named cache with options
   */
  createCache(name, options = {}) {
    const cache = {
      data: new Map(),
      expiry: options.expiry || this._defaultExpiry,
      maxSize: options.maxSize || this._defaultMaxSize,
      lastCleanup: Date.now(),
      stats: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0
      }
    };

    this._caches.set(name, cache);
    return cache;
  }

  /**
   * Get or create a cache by name
   */
  getCache(name, options = {}) {
    if (!this._caches.has(name)) {
      this.createCache(name, options);
    }
    return this._caches.get(name);
  }

  /**
   * Set a value in a named cache
   */
  setCache(name, key, value, options = {}) {
    const cache = this.getCacheObject(name);
    if (!cache) {
      this.createCache(name, options);
    }
    const cacheObj = this.getCacheObject(name);
    const expiry = options.expiry || cacheObj.expiry;
    
    // Check cache size and trim if necessary
    if (cacheObj.data.size >= cacheObj.maxSize) {
      this._trimCache(cacheObj);
    }

    const entry = {
      value,
      timestamp: Date.now(),
      expiry: expiry ? Date.now() + expiry : null
    };

    cacheObj.data.set(key, entry);
    cacheObj.stats.sets++;

    // Schedule cleanup if needed
    this._scheduleCleanup(name);
    
    return value;
  }

  /**
   * Get a value from a named cache
   */
  getCache(name, key) {
    const cache = this._caches.get(name);
    if (!cache) return null;

    const entry = cache.data.get(key);
    if (!entry) {
      cache.stats.misses++;
      return null;
    }

    // Check if expired
    if (entry.expiry && Date.now() > entry.expiry) {
      cache.data.delete(key);
      cache.stats.deletes++;
      return null;
    }

    cache.stats.hits++;
    return entry.value;
  }

  /**
   * Get a cache object by name
   */
  getCacheObject(name) {
    return this._caches.get(name);
  }

  /**
   * Check if a key exists in cache and is not expired
   */
  hasCache(name, key) {
    const cache = this._caches.get(name);
    if (!cache) return false;

    const entry = cache.data.get(key);
    if (!entry) return false;

    // Check if expired
    if (entry.expiry && Date.now() > entry.expiry) {
      cache.data.delete(key);
      cache.stats.deletes++;
      return false;
    }

    return true;
  }

  // ============================================================================
  // CACHE MAINTENANCE AND CLEANUP
  // ============================================================================

  /**
   * Trim cache to maintain size limits
   */
  _trimCache(cache) {
    const removeCount = Math.floor(cache.maxSize * 0.2); // Remove 20%
    const entries = Array.from(cache.data.entries());
    
    // Sort by timestamp (oldest first) and remove oldest entries
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (let i = 0; i < removeCount && i < entries.length; i++) {
      cache.data.delete(entries[i][0]);
      cache.stats.deletes++;
    }
    
    // Ensure we're under the limit
    while (cache.data.size >= cache.maxSize && cache.data.size > 0) {
      const oldestEntry = Array.from(cache.data.entries())[0];
      cache.data.delete(oldestEntry[0]);
      cache.stats.deletes++;
    }
  }

  /**
   * Clean up expired entries in a specific cache
   */
  _cleanupCache(name) {
    const cache = this._caches.get(name);
    if (!cache) return;

    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of cache.data.entries()) {
      if (entry.expiry && now > entry.expiry) {
        cache.data.delete(key);
        cache.stats.deletes++;
        cleaned++;
      }
    }

    cache.lastCleanup = now;
    return cleaned;
  }

  /**
   * Schedule cleanup for a cache
   */
  _scheduleCleanup(name) {
    const cache = this._caches.get(name);
    if (!cache) return;

    const timeSinceLastCleanup = Date.now() - cache.lastCleanup;
    if (timeSinceLastCleanup > this._cleanupInterval) {
      this._cleanupCache(name);
    }
  }

  /**
   * Global cleanup across all caches
   */
  _globalCleanup() {
    const now = Date.now();
    if (now - this._lastGlobalCleanup < this._cleanupInterval) {
      return;
    }

    for (const [name] of this._caches) {
      this._cleanupCache(name);
    }

    this._lastGlobalCleanup = now;
    
    // Notify cleanup callbacks
    this._cleanupCallbacks.forEach(callback => callback());
  }

  // ============================================================================
  // CACHE STATISTICS AND MONITORING
  // ============================================================================

  /**
   * Get statistics for a specific cache
   */
  getCacheStats(name) {
    const cache = this._caches.get(name);
    if (!cache) return null;

    const now = Date.now();
    const activeEntries = Array.from(cache.data.values()).filter(entry => 
      !entry.expiry || now <= entry.expiry
    );

    return {
      name,
      size: activeEntries.length,
      maxSize: cache.maxSize,
      hits: cache.stats.hits,
      misses: cache.stats.misses,
      sets: cache.stats.sets,
      deletes: cache.stats.deletes,
      hitRate: cache.stats.hits / (cache.stats.hits + cache.stats.misses) || 0,
      lastCleanup: cache.lastCleanup,
      age: now - cache.lastCleanup
    };
  }

  /**
   * Get statistics for all caches
   */
  getAllCacheStats() {
    const stats = {};
    for (const [name] of this._caches) {
      stats[name] = this.getCacheStats(name);
    }
    return stats;
  }

  /**
   * Get overall cache performance metrics
   */
  getPerformanceMetrics() {
    const allStats = this.getAllCacheStats();
    let totalHits = 0;
    let totalMisses = 0;
    let totalSets = 0;
    let totalSize = 0;

    Object.values(allStats).forEach(stat => {
      if (stat) {
        totalHits += stat.hits;
        totalMisses += stat.misses;
        totalSets += stat.sets;
        totalSize += stat.size;
      }
    });

    return {
      totalCaches: this._caches.size,
      totalSize,
      totalHits,
      totalMisses,
      totalSets,
      overallHitRate: totalHits / (totalHits + totalMisses) || 0,
      lastGlobalCleanup: this._lastGlobalCleanup
    };
  }

  // ============================================================================
  // CACHE OPERATIONS
  // ============================================================================

  /**
   * Clear a specific cache
   */
  clearCache(name) {
    const cache = this._caches.get(name);
    if (cache) {
      cache.data.clear();
      cache.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
      cache.lastCleanup = Date.now();
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    for (const [name] of this._caches) {
      this.clearCache(name);
    }
    this._lastGlobalCleanup = Date.now();
  }

  /**
   * Delete a specific key from a cache
   */
  deleteCache(name, key) {
    const cache = this._caches.get(name);
    if (cache && cache.data.delete(key)) {
      cache.stats.deletes++;
      return true;
    }
    return false;
  }

  /**
   * Get cache size
   */
  getCacheSize(name) {
    const cache = this._caches.get(name);
    return cache ? cache.data.size : 0;
  }

  /**
   * Check if cache is empty
   */
  isCacheEmpty(name) {
    return this.getCacheSize(name) === 0;
  }

  // ============================================================================
  // ADVANCED FEATURES
  // ============================================================================

  /**
   * Add a cleanup callback
   */
  onCleanup(callback) {
    this._cleanupCallbacks.add(callback);
    return () => this._cleanupCallbacks.delete(callback);
  }

  /**
   * Prefetch data into cache
   */
  async prefetchCache(name, key, fetchFunction, options = {}) {
    try {
      const value = await fetchFunction();
      this.setCache(name, key, value, options);
      return value;
    } catch (error) {
      console.warn(`Prefetch failed for cache ${name}, key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Batch set multiple values
   */
  setCacheBatch(name, entries, options = {}) {
    const cache = this.getCache(name, options);
    let setCount = 0;

    for (const [key, value] of entries) {
      if (this.setCache(name, key, value, options)) {
        setCount++;
      }
    }

    return setCount;
  }

  /**
   * Batch get multiple values
   */
  getCacheBatch(name, keys) {
    const results = new Map();
    const missing = [];

    for (const key of keys) {
      const value = this.getCache(name, key);
      if (value !== null) {
        results.set(key, value);
      } else {
        missing.push(key);
      }
    }

    return { results, missing };
  }
}

module.exports = CacheMixin;
