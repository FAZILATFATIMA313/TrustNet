<<<<<<< HEAD
<<<<<<< HEAD
// background.js - Service Worker for TrustNet AI
// Placeholder for background tasks like handling alarms, network requests, etc.

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('TrustNet AI extension installed');
});

// Placeholder for future background logic
=======
=======
>>>>>>> 77e72c9f4ba7df703ffc2fdb1d304702c7f942b2
/**
 * TrustNet - Background Service Worker
 * Handles permission management, Safe Browsing API, domain age lookup, and cross-page learning
 * @version 2.0
 */

import './utils.js';

// ==================== INITIALIZATION ====================
chrome.runtime.onInstalled.addListener(async () => {
  Logger.info('TrustNet extension installed/updated');
  
  try {
    const data = await StorageUtils.get('global_settings');
    if (!data.global_settings) {
      const defaultSettings = {
        auto_scan: true,
        show_safe_badge: true,
        checkout_confirm: true,
        logging_level: 1 // INFO
      };
      await StorageUtils.set({ global_settings: defaultSettings });
      Logger.info('Default settings initialized');
    }
  } catch (e) {
    Logger.error('Failed to initialize settings', { error: e.message });
  }
});

// ==================== MESSAGE HANDLER ====================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
  try {
    if (!message || !message.action) {
      throw new TrustNetError('Invalid message format', 'INVALID_MESSAGE');
    }

    Logger.debug('Message received', { action: message.action, sender: sender.url });

    switch (message.action) {
      case 'openSettings':
        await handleOpenSettings(sendResponse);
        break;
      
      case 'saveDeniedPermission':
        await handleSaveDeniedPermission(message, sendResponse);
        break;
      
      case 'checkSafeBrowsing':
        await handleSafeBrowsingCheck(message, sendResponse);
        break;
      
      case 'checkDomainAge':
        await handleDomainAgeCheck(message, sendResponse);
        break;
      
      case 'recordPageVisit':
        await handlePageVisitRecord(message, sendResponse);
        break;
      
      case 'getPageNavigationHistory':
        await handleGetPageHistory(message, sendResponse);
        break;
      
      default:
        Logger.warn('Unknown message action', { action: message.action });
        sendResponse({ error: 'Unknown action' });
    }
  } catch (e) {
    Logger.error('Message handler error', { error: e.message, code: e.code });
    sendResponse({ 
      error: e.message, 
      code: e.code,
      details: e.details 
    });
  }
}

async function handleOpenSettings(sendResponse) {
  chrome.tabs.create({
    url: chrome.runtime.getURL('settings.html')
  });
  sendResponse({ success: true });
}

async function handleSaveDeniedPermission(message, sendResponse) {
  const domain = StringUtils.getDomain(message.url) || message.domain;
  if (!domain || !Validator.isValidDomain(domain)) {
    throw new TrustNetError('Invalid domain', 'INVALID_DOMAIN');
  }

  const data = await StorageUtils.get('permission_denied_dates');
  const deniedDates = data.permission_denied_dates || {};
  deniedDates[domain] = TimeUtils.getCurrentTime();
  
  await StorageUtils.set({ permission_denied_dates: deniedDates });
  Logger.debug('Permission denied saved', { domain });
  sendResponse({ success: true });
}

async function handleSafeBrowsingCheck(message, sendResponse) {
  const domain = message.domain;
  if (!domain || !Validator.isValidDomain(domain)) {
    throw new TrustNetError('Invalid domain for Safe Browsing check', 'INVALID_DOMAIN');
  }

  const result = await checkSafeBrowsingAPI(domain);
  sendResponse(result);
}

async function handleDomainAgeCheck(message, sendResponse) {
  const domain = message.domain;
  if (!domain || !Validator.isValidDomain(domain)) {
    throw new TrustNetError('Invalid domain for age check', 'INVALID_DOMAIN');
  }

  const result = await checkDomainAge(domain);
  sendResponse(result);
}

async function handlePageVisitRecord(message, sendResponse) {
  const url = message.url || '';
  const domain = StringUtils.getDomain(url);
  if (!domain) {
    throw new TrustNetError('Could not extract domain from URL', 'INVALID_URL');
  }

  await recordPageNavigation(url, message.pageType, message.riskLevel);
  sendResponse({ success: true });
}

async function handleGetPageHistory(message, sendResponse) {
  const domain = message.domain;
  if (!domain || !Validator.isValidDomain(domain)) {
    throw new TrustNetError('Invalid domain', 'INVALID_DOMAIN');
  }

  const history = await getPageNavigationHistory(domain);
  sendResponse({ success: true, history });
}

// ==================== SAFE BROWSING API ====================
async function checkSafeBrowsingAPI(domain) {
  try {
    if (!Validator.isValidDomain(domain)) {
      throw new TrustNetError('Invalid domain for Safe Browsing', 'INVALID_DOMAIN');
    }

    // Check cache first (24-hour TTL)
    const data = await StorageUtils.get('safe_browsing_cache');
    const cache = data.safe_browsing_cache || {};
    
    if (cache[domain] && TimeUtils.getHoursSince(cache[domain].timestamp) < 24) {
      Logger.debug('Safe Browsing cache hit', { domain });
      return cache[domain].result;
    }

    // In production, integrate with actual Safe Browsing API
    // For now, return safe status
    const result = { 
      isSafe: true,
      source: 'default',
      timestamp: TimeUtils.getCurrentTime()
    };

    // Cache the result
    cache[domain] = {
      result: result,
      timestamp: TimeUtils.getCurrentTime()
    };
    
    await StorageUtils.set({ safe_browsing_cache: cache });
    Logger.debug('Safe Browsing check completed', { domain, result: result.isSafe });
    
    return result;
  } catch (e) {
    Logger.error('Safe Browsing check failed', { 
      domain, 
      error: e.message, 
      code: e.code 
    });
    // Fail-open for availability (don't block access)
    return { 
      isSafe: true, 
      source: 'error_fallback',
      error: e.message 
    };
  }
}

// ==================== DOMAIN AGE CHECK ====================
async function checkDomainAge(domain) {
  try {
    if (!Validator.isValidDomain(domain)) {
      throw new TrustNetError('Invalid domain for age check', 'INVALID_DOMAIN');
    }

    // Check cache (7-day TTL for domain ages)
    const data = await StorageUtils.get('domain_ages');
    const domainAges = data.domain_ages || {};
    
    if (domainAges[domain] && TimeUtils.getDaysSince(domainAges[domain].timestamp) < 7) {
      Logger.debug('Domain age cache hit', { domain });
      return {
        age: domainAges[domain].age,
        isOld: domainAges[domain].age > 90,
        cached: true,
        source: 'cache'
      };
    }

    // Simulate domain age (in production, use WHOIS API)
    const age = simulateDomainAge(domain);
    const result = {
      age: age,
      isOld: age > 90,
      timestamp: TimeUtils.getCurrentTime()
    };
    
    // Cache the result
    domainAges[domain] = result;
    await StorageUtils.set({ domain_ages: domainAges });
    
    Logger.debug('Domain age check completed', { domain, age });
    
    return {
      age: result.age,
      isOld: result.isOld,
      cached: false,
      source: 'simulated'
    };
  } catch (e) {
    Logger.error('Domain age check failed', { 
      domain, 
      error: e.message,
      code: e.code 
    });
    // Fail-open: assume old/safe domain (conservative: treat as potentially risky)
    return { 
      age: 365, 
      isOld: true, 
      error: e.message,
      source: 'error_fallback'
    };
  }
}

function simulateDomainAge(domain) {
  // Note: This is a fallback simulation for testing only
  // Production should use real domain registration data
  const suspiciousPatterns = [
    '.xyz', '.top', '.gq', '.cf', '.tk', '.ml', '.ga', '.cn', '.ru', '.work'
  ];
  const isSuspiciousTLD = suspiciousPatterns.some(tld => domain.endsWith(tld));
  
  if (isSuspiciousTLD) {
    // Suspicious TLDs: simulate 10-70 days old (newer = more suspicious)
    return Math.floor(Math.random() * 60) + 10;
  }
  
  // Trusted TLDs: simulate 365-1865 days old (established domains)
  return Math.floor(Math.random() * 1500) + 365;
}

// ==================== ML STATS TRACKING ====================
async function recordMLStats(phishingScore, sentimentScore, riskLevel, domain) {
  if (!domain) return;

  try {
    const data = await StorageUtils.get('ml_stats');
    const stats = data.ml_stats || {
      total_scans: 0,
      high_phishing: 0,
      negative_sentiment: 0,
      high_risk_sites: {}
    };

    stats.total_scans += 1;

    if (phishingScore > 60) {
      stats.high_phishing += 1;
    }

    if (sentimentScore < -0.3) {
      stats.negative_sentiment += 1;
    }

    // Track high risk sites
    const baseDomain = StringUtils.getBaseDomain(domain);
    if (riskLevel === 'High' || riskLevel === 'Medium') {
      stats.high_risk_sites[baseDomain] = (stats.high_risk_sites[baseDomain] || 0) + 1;
    }

    await StorageUtils.set({ ml_stats: stats });
    Logger.debug('ML stats recorded', { phishingScore, sentimentScore, domain: baseDomain });
  } catch (e) {
    Logger.error('Failed to record ML stats', { error: e.message });
  }
}

// ==================== PAGE NAVIGATION TRACKING ====================
async function recordPageNavigation(url, pageType, riskLevel, phishingScore = null, sentimentScore = null) {
  try {
    if (!Validator.isValidUrl(url)) {
      throw new TrustNetError('Invalid URL for page navigation', 'INVALID_URL');
    }

    const domain = StringUtils.getDomain(url);
    const baseDomain = StringUtils.getBaseDomain(domain);
    
    if (!domain || !baseDomain) {
      throw new TrustNetError('Could not extract domain', 'DOMAIN_EXTRACTION_FAILED');
    }

    // Record ML stats if provided
    if (phishingScore !== null && sentimentScore !== null) {
      await recordMLStats(phishingScore, sentimentScore, riskLevel, domain);
    }

    const data = await StorageUtils.get('page_navigation_history');
    const history = data.page_navigation_history || {};
    
    // Initialize domain history if not exists
    if (!history[baseDomain]) {
      history[baseDomain] = {
        domain: baseDomain,
        visits: [],
        riskLevels: {},
        pageTypes: {},
        firstVisit: TimeUtils.getCurrentTime(),
        lastVisit: null,
        totalVisits: 0
      };
    }

    const domainHistory = history[baseDomain];
    
    // Add visit record (storing minimal URL info for privacy)
    const visitRecord = {
      urlPath: StringUtils.extractPath(url), 
      pageType: pageType || 'Unknown',
      riskLevel: riskLevel || 'Unknown',
      phishingScore: phishingScore || 0,
      sentimentScore: sentimentScore || 0,
      timestamp: TimeUtils.getCurrentTime()
    };

    domainHistory.visits.push(visitRecord);
    domainHistory.lastVisit = TimeUtils.getCurrentTime();
    domainHistory.totalVisits = (domainHistory.totalVisits || 0) + 1;

    // Track page types
    const pt = pageType || 'Unknown';
    domainHistory.pageTypes[pt] = (domainHistory.pageTypes[pt] || 0) + 1;

    // Track risk levels
    const rl = riskLevel || 'Unknown';
    domainHistory.riskLevels[rl] = (domainHistory.riskLevels[rl] || 0) + 1;

    if (domainHistory.visits.length > 50) {
      domainHistory.visits = domainHistory.visits.slice(-50);
    }

    await StorageUtils.set({ page_navigation_history: history });
    Logger.debug('Page navigation recorded', { 
      domain: baseDomain, 
      pageType, 
      riskLevel,
      phishingScore,
      totalVisits: domainHistory.totalVisits 
    });
  } catch (e) {
    Logger.error('Failed to record page navigation', { 
      url, 
      error: e.message,
      code: e.code 
    });
  }
}

async function getPageNavigationHistory(domain) {
  try {
    if (!Validator.isValidDomain(domain)) {
      throw new TrustNetError('Invalid domain', 'INVALID_DOMAIN');
    }

    const baseDomain = StringUtils.getBaseDomain(domain);
    const data = await StorageUtils.get('page_navigation_history');
    const history = data.page_navigation_history || {};
    
    const domainHistory = history[baseDomain];
    
    if (!domainHistory) {
      return {
        domain: baseDomain,
        visits: [],
        riskLevels: {},
        pageTypes: {},
        totalVisits: 0,
        firstVisit: null,
        lastVisit: null
      };
    }

    return {
      domain: baseDomain,
      visits: domainHistory.visits || [],
      riskLevels: domainHistory.riskLevels || {},
      pageTypes: domainHistory.pageTypes || {},
      totalVisits: domainHistory.totalVisits || 0,
      firstVisit: domainHistory.firstVisit || null,
      lastVisit: domainHistory.lastVisit || null,
      daysSinceFirstVisit: domainHistory.firstVisit ? 
        TimeUtils.getDaysSince(domainHistory.firstVisit) : 0
    };
  } catch (e) {
    Logger.error('Failed to get page navigation history', { 
      domain, 
      error: e.message,
      code: e.code 
    });
    return {
      domain: domain,
      visits: [],
      riskLevels: {},
      pageTypes: {},
      totalVisits: 0,
      error: e.message
    };
  }
}
<<<<<<< HEAD
>>>>>>> origin/master
=======
>>>>>>> 77e72c9f4ba7df703ffc2fdb1d304702c7f942b2
