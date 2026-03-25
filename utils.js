/**
 * TrustNet - Utility Library
 * Shared functions, logging, validation, and error handling
 * @version 2.0
 */

// ==================== LOGGING SYSTEM ====================
const Logger = {
  levels: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  },
  
  currentLevel: 1, // Default: INFO
  
  log(level, message, data = null) {
    if (level < this.currentLevel) return;
    
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(this.levels).find(key => this.levels[key] === level);
    const prefix = `[TrustNet][${levelName}][${timestamp}]`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  },
  
  debug(message, data) { this.log(this.levels.DEBUG, message, data); },
  info(message, data) { this.log(this.levels.INFO, message, data); },
  warn(message, data) { this.log(this.levels.WARN, message, data); },
  error(message, data) { this.log(this.levels.ERROR, message, data); }
};

// ==================== ERROR HANDLING ====================
class TrustNetError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = null) {
    super(message);
    this.name = 'TrustNetError';
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

// ==================== DATA VALIDATION ====================
const Validator = {
  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  },
  
  isValidDomain(domain) {
    if (!domain || typeof domain !== 'string') return false;
    const domainPattern = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
    return domainPattern.test(domain) && domain.length <= 253;
  },
  
  isValidEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  },
  
  isValidRiskScore(score) {
    return typeof score === 'number' && score >= 0 && score <= 100;
  },
  
  sanitizeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  validateObject(obj, schema) {
    if (!obj || typeof obj !== 'object') return false;
    for (const key in schema) {
      if (!(key in obj) || typeof obj[key] !== schema[key]) {
        return false;
      }
    }
    return true;
  }
};

// ==================== STRING & URL UTILITIES ====================
const StringUtils = {
  getDomain(url) {
    try {
      if (!Validator.isValidUrl(url)) return null;
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      Logger.warn('Failed to extract domain from URL', { url, error: e.message });
      return null;
    }
  },
  
  getBaseDomain(domain) {
    if (!Validator.isValidDomain(domain)) return null;
    
    // Handle multi-part TLDs (e.g., .co.uk, .com.au)
    const multiPartTLDs = ['co.uk', 'com.au', 'co.jp', 'co.nz', 'co.in', 'co.id'];
    for (const tld of multiPartTLDs) {
      if (domain.endsWith(tld)) {
        const parts = domain.split('.');
        return parts.slice(-3).join('.'); // Return last 3 parts
      }
    }
    
    // Standard single-part TLD
    const parts = domain.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return domain;
  },
  
  getProtocol(url) {
    try {
      if (!Validator.isValidUrl(url)) return null;
      const urlObj = new URL(url);
      return urlObj.protocol.replace(':', '');
    } catch {
      return null;
    }
  },
  
  normalizeUrl(url) {
    try {
      if (!Validator.isValidUrl(url)) return url;
      const urlObj = new URL(url);
      return urlObj.toString();
    } catch {
      return url;
    }
  },
  
  extractPath(url) {
    try {
      if (!Validator.isValidUrl(url)) return '/';
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return '/';
    }
  },
  
  escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// ==================== DOM UTILITIES ====================
const DOMUtils = {
  elementExists(selectors) {
    try {
      if (!selectors) return false;
      if (typeof selectors === 'string') {
        return document.querySelector(selectors) !== null;
      }
      if (Array.isArray(selectors)) {
        return selectors.some(selector => {
          try {
            return document.querySelector(selector) !== null;
          } catch (e) {
            Logger.debug('Invalid CSS selector', { selector, error: e.message });
            return false;
          }
        });
      }
    } catch (e) {
      Logger.error('elementExists error', { error: e.message });
    }
    return false;
  },
  
  getElements(selectors) {
    try {
      if (!selectors) return [];
      if (typeof selectors === 'string') {
        return Array.from(document.querySelectorAll(selectors));
      }
      if (Array.isArray(selectors)) {
        return selectors.flatMap(selector => {
          try {
            return Array.from(document.querySelectorAll(selector));
          } catch (e) {
            Logger.debug('Invalid CSS selector', { selector, error: e.message });
            return [];
          }
        });
      }
    } catch (e) {
      Logger.error('getElements error', { error: e.message });
    }
    return [];
  },
  
  getPageText() {
    try {
      if (!document.body) return '';
      const text = document.body.innerText || '';
      return text.toLowerCase();
    } catch (e) {
      Logger.error('getPageText error', { error: e.message });
      return '';
    }
  },
  
  removeElement(selector) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        element.remove();
        return true;
      }
    } catch (e) {
      Logger.debug('Failed to remove element', { selector, error: e.message });
    }
    return false;
  },
  
  createElement(html) {
    try {
      // Sanitize HTML to prevent XSS attacks
      const div = document.createElement('div');
      div.textContent = html; // Use textContent instead of innerHTML for safety
      const element = div.firstElementChild;
      
      if (!element) {
        Logger.warn('Failed to create element: invalid HTML structure', { html });
        return null;
      }
      return element;
    } catch (e) {
      Logger.error('Failed to create element', { html, error: e.message });
      return null;
    }
  }
};

// ==================== STORAGE UTILITIES ====================
const StorageUtils = {
  async get(keys) {
    try {
      if (!Array.isArray(keys)) keys = [keys];
      const data = await chrome.storage.local.get(keys);
      return data || {};
    } catch (e) {
      Logger.error('Storage get failed', { keys, error: e.message });
      return {};
    }
  },
  
  async set(data) {
    try {
      if (!data || typeof data !== 'object') {
        throw new TrustNetError('Invalid data format for storage', 'STORAGE_INVALID_DATA');
      }
      await chrome.storage.local.set(data);
      return true;
    } catch (e) {
      Logger.error('Storage set failed', { error: e.message });
      return false;
    }
  },
  
  async remove(keys) {
    try {
      if (!Array.isArray(keys)) keys = [keys];
      await chrome.storage.local.remove(keys);
      return true;
    } catch (e) {
      Logger.error('Storage remove failed', { keys, error: e.message });
      return false;
    }
  },
  
  async clear() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (e) {
      Logger.error('Storage clear failed', { error: e.message });
      return false;
    }
  },
  
  async append(key, value) {
    try {
      const data = await this.get(key);
      const existing = data[key] || [];
      if (!Array.isArray(existing)) {
        throw new TrustNetError('Storage value is not an array', 'STORAGE_TYPE_MISMATCH');
      }
      existing.push(value);
      await this.set({ [key]: existing });
      return true;
    } catch (e) {
      Logger.error('Storage append failed', { key, error: e.message });
      return false;
    }
  }
};

// ==================== MESSAGE UTILITIES ====================
const MessageUtils = {
  async sendMessage(message, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TrustNetError('Message timeout', 'MESSAGE_TIMEOUT'));
      }, timeout);
      
      try {
        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeoutId);
          if (chrome.runtime.lastError) {
            reject(new TrustNetError(
              chrome.runtime.lastError.message,
              'MESSAGE_ERROR',
              { originalError: chrome.runtime.lastError }
            ));
          } else if (response && response.error) {
            reject(new TrustNetError(response.error, 'MESSAGE_RESPONSE_ERROR'));
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        clearTimeout(timeoutId);
        reject(new TrustNetError(e.message, 'MESSAGE_SEND_FAILED', { originalError: e }));
      }
    });
  },
  
  async sendTabMessage(tabId, message, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TrustNetError('Tab message timeout', 'TAB_MESSAGE_TIMEOUT'));
      }, timeout);
      
      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          clearTimeout(timeoutId);
          if (chrome.runtime.lastError) {
            reject(new TrustNetError(
              chrome.runtime.lastError.message,
              'TAB_MESSAGE_ERROR',
              { tabId, originalError: chrome.runtime.lastError }
            ));
          } else if (response && response.error) {
            reject(new TrustNetError(response.error, 'TAB_MESSAGE_RESPONSE_ERROR'));
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        clearTimeout(timeoutId);
        reject(new TrustNetError(e.message, 'TAB_MESSAGE_SEND_FAILED', { tabId, originalError: e }));
      }
    });
  }
};

// ==================== DEBOUNCE & THROTTLE ====================
const FunctionUtils = {
  debounce(func, wait) {
    if (typeof func !== 'function') {
      throw new TrustNetError('Invalid function for debounce', 'DEBOUNCE_INVALID_FUNC');
    }
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  throttle(func, limit) {
    if (typeof func !== 'function') {
      throw new TrustNetError('Invalid function for throttle', 'THROTTLE_INVALID_FUNC');
    }
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  retry(asyncFunc, retries = 3, delay = 1000) {
    return async function(...args) {
      for (let i = 0; i < retries; i++) {
        try {
          return await asyncFunc(...args);
        } catch (e) {
          if (i === retries - 1) {
            throw new TrustNetError(
              `Failed after ${retries} attempts: ${e.message}`,
              'RETRY_EXHAUSTED',
              { originalError: e, attempts: i + 1 }
            );
          }
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    };
  }
};

// ==================== TIME UTILITIES ====================
const TimeUtils = {
  getCurrentTime() {
    return Date.now();
  },
  
  getTimestamp() {
    return new Date().toISOString();
  },
  
  getDaysSince(timestamp) {
    if (typeof timestamp !== 'number' || timestamp <= 0) {
      Logger.warn('Invalid timestamp for getDaysSince', { timestamp });
      return 0;
    }
    return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  },
  
  getHoursSince(timestamp) {
    if (typeof timestamp !== 'number' || timestamp <= 0) {
      Logger.warn('Invalid timestamp for getHoursSince', { timestamp });
      return 0;
    }
    return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60));
  },
  
  isRecent(timestamp, days = 1) {
    const daysSince = this.getDaysSince(timestamp);
    return daysSince < days;
  },
  
  cacheKey(prefix, value) {
    return `${prefix}_${value}_${Date.now()}`;
  }
};

// ==================== CACHE MANAGEMENT ====================
class CacheManager {
  constructor(maxSize = 100, ttl = 300000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }
  
  set(key, value, customTtl) {
    try {
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
      this.cache.set(key, {
        value,
        timestamp: Date.now(),
        ttl: customTtl || this.ttl
      });
    } catch (e) {
      Logger.error('Cache set failed', { key, error: e.message });
    }
  }
  
  get(key) {
    try {
      const item = this.cache.get(key);
      if (!item) return null;
      
      if (Date.now() - item.timestamp > item.ttl) {
        this.cache.delete(key);
        return null;
      }
      
      return item.value;
    } catch (e) {
      Logger.error('Cache get failed', { key, error: e.message });
      return null;
    }
  }
  
  has(key) {
    return this.get(key) !== null;
  }
  
  delete(key) {
    return this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

// ==================== ARRAY UTILITIES ====================
const ArrayUtils = {
  unique(arr) {
    if (!Array.isArray(arr)) return [];
    return [...new Set(arr)];
  },
  
  flatten(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.reduce((acc, item) => 
      Array.isArray(item) ? acc.concat(this.flatten(item)) : acc.concat(item), []
    );
  },
  
  groupBy(arr, key) {
    if (!Array.isArray(arr)) return {};
    return arr.reduce((acc, item) => {
      const group = item[key];
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {});
  },
  
  chunk(arr, size) {
    if (!Array.isArray(arr) || size <= 0) return [];
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
};

// ==================== OBJECT UTILITIES ====================
const ObjectUtils = {
  deepClone(obj) {
    try {
      if (obj === null || typeof obj !== 'object') return obj;
      if (obj instanceof Date) return new Date(obj.getTime());
      if (obj instanceof Array) return obj.map(item => this.deepClone(item));
      
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    } catch (e) {
      Logger.error('Deep clone failed', { error: e.message });
      return obj;
    }
  },
  
  merge(target, source) {
    const result = this.deepClone(target);
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.merge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    return result;
  }
};

// ==================== URL FEATURE UTILS (for ML) ====================
const URLFeatureUtils = {
  /**
   * Extract phishing-relevant features matching notebook dataset
   */
  extractPhishingFeatures(url) {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      const fullUrl = url.toLowerCase();
      const path = parsed.pathname;
      
      return {
        NumDots: (hostname.match(/\./g) || []).length,
        SubdomainLevel: hostname.split('.').length - 2,
        UrlLength: url.length,
        NumDash: (hostname.match(/-/g) || []).length,
        NumDashInHostname: (hostname.match(/-/g) || []).length,
        AtSymbol: fullUrl.includes('@') ? 1 : 0,
        NumUnderscore: (hostname.match(/_/g) || []).length,
        NumPercent: fullUrl.match(/%/g)?.length || 0,
        NumNumericChars: (hostname.match(/[0-9]/g) || []).length,
        NoHttps: parsed.protocol !== 'https:' ? 1 : 0,
        IPAddress: URLFeatureUtils.isIPAddress(hostname) ? 1 : 0,
        HostnameLength: hostname.length,
        PathLength: path.length,
        DoubleSlashInPath: path.includes('//') ? 1 : 0,
        RandomString: URLFeatureUtils.hasRandomString(hostname) ? 1 : 0
      };
    } catch (e) {
      Logger.warn('URL feature extraction failed', { url, error: e.message });
      return {};
    }
  },

  isIPAddress(host) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(host);
  },

  hasRandomString(host) {
    const randomPattern = /^[a-z0-9]{15,}$/;
    return randomPattern.test(host.replace(/\./g, ''));
  }
};

// ==================== EXPORT ====================
// Make utilities globally available for both content scripts and background scripts
if (typeof globalThis !== 'undefined') {
  globalThis.Logger = Logger;
  globalThis.TrustNetError = TrustNetError;
  globalThis.Validator = Validator;
  globalThis.StringUtils = StringUtils;
  globalThis.DOMUtils = DOMUtils;
  globalThis.StorageUtils = StorageUtils;
  globalThis.MessageUtils = MessageUtils;
  globalThis.FunctionUtils = FunctionUtils;
  globalThis.TimeUtils = TimeUtils;
  globalThis.CacheManager = CacheManager;
  globalThis.ArrayUtils = ArrayUtils;
  globalThis.ObjectUtils = ObjectUtils;
  globalThis.URLFeatureUtils = URLFeatureUtils;
}

// CommonJS export for compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Logger, TrustNetError, Validator, StringUtils, DOMUtils,
    StorageUtils, MessageUtils, FunctionUtils, TimeUtils,
    CacheManager, ArrayUtils, ObjectUtils, URLFeatureUtils
  };
}
