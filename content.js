/**
 * TrustNet Content Script
 * Context-Aware Layered Detection System with Page Navigation Analysis
 * @version 2.0
 */

(function() {
  'use strict';

  // ==================== CONFIG ====================
  const CONFIG = {
    DEBOUNCE_DELAY: 800,
    STABILITY_DELAY: 1200,
    SCAN_CACHE_TTL: 300000,
    PERMISSION_COOLDOWN_DAYS: 30,
    RISK_THRESHOLD_HIGH: 70,
    RISK_THRESHOLD_MEDIUM: 40,
    LOAD_TIME_THRESHOLD: 3000,
    DOMAIN_AGE_THRESHOLD: 90,
    UNIVERSAL_WEIGHT: 0.3,
    PAGE_PRIMARY_WEIGHT: 0.5,
    PAGE_SECONDARY_WEIGHT: 0.2,
    
    SUSPICIOUS_TLDS: ['.xyz', '.top', '.gq', '.cf', '.tk', '.ml', '.ga', '.cn', '.ru', '.work'],
    TRUSTED_PAYMENT_GATEWAYS: [
      'razorpay', 'ccavenue', 'payu', 'paytm', 'paypal', 'stripe', 'braintree',
      'instamojo', 'cashfree', 'juspay', 'airtel', 'mobikwik', 'freecharge'
    ],
    PERSUASION_KEYWORDS: ['limited time', 'hurry', 'order now', 'last chance', 'act now', 'only today', 'selling out', 'urgent'],
    
    SELECTORS: {
      HOME: {
        logo: ['img[alt*="logo" i]', '.logo', '#logo', '[class*="logo"]'],
        categoryMenu: ['nav', '.menu', '.navigation', '[class*="category" i]', '[class*="nav" i]'],
        promoBanner: ['.banner', '.carousel', '.slider', '[class*="promo" i]', '[class*="hero" i]']
      },
      CATEGORY: {
        productGrid: ['.product-grid', '.products', '.catalog', '[class*="product-list" i]', '#products'],
        filters: ['.filter', '.filters', '[class*="filter" i]'],
        sorting: ['.sort', '.sorting', '[class*="sort" i]']
      },
      PRODUCT: {
        productImage: ['.product-image', '.pdp-image', '[class*="product-img" i]', '#main-image'],
        price: ['.price', '.product-price', '[class*="price" i]:not(.old-price)', '#price'],
        addToCart: ['.add-to-cart', '[class*="add-cart" i]', 'button[name*="add" i]'],
        sellerInfo: ['.seller-info', '.merchant-info', '[class*="seller" i]']
      },
      SELLER: {
        sellerName: ['.seller-name', '.merchant-name', '[class*="seller-name" i]'],
        feedbackScore: ['.feedback', '.rating', '[class*="feedback" i]', '.stars'],
        orderHistory: ['.orders', '.order-history', '[class*="order" i]']
      },
      CHECKOUT: {
        billingFields: ['.billing', '[class*="billing" i]', 'input[id*="billing" i]'],
        paymentGateway: ['.payment', '[class*="payment" i]', '#payment-methods'],
        orderSummary: ['.order-summary', '.cart-summary', '[class*="order-total" i]']
      }
    }
  };

  // ==================== STATE ====================
  const state = {
    isScanning: false,
    lastScanUrl: null,
    lastScanTime: 0,
    currentDomain: null,
    currentUrl: null,
    baseDomain: null,
    permissionStatus: null,
    sessionDenied: new Set(),
    hasShownResultForPage: false,
    permissionBarDismissed: false,
    dismissedOverlays: new Set(),
    sessionPermissionAsked: new Set(),
    detectedPageType: null,
    scanStage: 'idle',
    pageLoadTime: 0,
    isHandlingNavigation: false,
    mutationObserver: null,
    lastMutationTime: 0,
    pageNavigationHistory: null,
    navigationStartTime: Date.now()
  };

  // ==================== PERMISSION BAR ====================
  function showPermissionBar() {
    DOMUtils.removeElement('.trustnet-permission-bar');

    const bar = document.createElement('div');
    bar.className = 'trustnet-permission-bar';
    bar.innerHTML = `
      <div class="trustnet-permission-bar-content">
        <div class="trustnet-permission-bar-icon">🛡️</div>
        <div class="trustnet-permission-bar-text">Allow TrustNet permission</div>
        <div class="trustnet-permission-bar-buttons">
          <button class="trustnet-permission-bar-btn trustnet-permission-bar-allow" id="trustnet-allow">Allow</button>
          <button class="trustnet-permission-bar-btn trustnet-permission-bar-deny" id="trustnet-deny">Don't Allow</button>
        </div>
      </div>
      <div class="trustnet-permission-bar-progress">
        <div class="trustnet-permission-bar-progress-fill" id="trustnet-countdown-bar"></div>
      </div>
    `;

    document.body.appendChild(bar);

    requestAnimationFrame(() => {
      bar.classList.add('trustnet-permission-bar-visible');
    });

    let countdown = 10;
    const countdownBar = bar.querySelector('#trustnet-countdown-bar');
    
    const countdownInterval = setInterval(() => {
      countdown--;
      countdownBar.style.width = (countdown * 10) + '%';
      
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        hidePermissionBar();
        state.permissionBarDismissed = true;
      }
    }, 1000);

    bar.querySelector('#trustnet-allow').addEventListener('click', () => {
      clearInterval(countdownInterval);
      handlePermissionGranted();
    });

    bar.querySelector('#trustnet-deny').addEventListener('click', () => {
      clearInterval(countdownInterval);
      handlePermissionDenied();
    });
  }

  function hidePermissionBar() {
    const bar = document.querySelector('.trustnet-permission-bar');
    if (bar) {
      bar.classList.remove('trustnet-permission-bar-visible');
      setTimeout(() => bar.remove(), 300);
    }
  }

  function handlePermissionGranted() {
    hidePermissionBar();
    state.permissionStatus = 'granted';
    
    const domain = state.currentDomain;
    if (domain) {
      StorageUtils.get('site_permissions').then((data) => {
        const permissions = data.site_permissions || {};
        permissions[domain] = 'granted';
        return StorageUtils.set({ site_permissions: permissions });
      }).catch((err) => {
        Logger.error('Failed to save permission', { domain, error: err.message });
      });
    }
    
    performScan();
  }

  function handlePermissionDenied() {
    hidePermissionBar();
    state.permissionStatus = 'denied';
    state.sessionDenied.add(state.currentDomain);
    
    MessageUtils.sendMessage({
      action: 'saveDeniedPermission',
      domain: state.currentDomain,
      url: state.currentUrl
    }).catch(e => {
      Logger.warn('Failed to save denied permission', { error: e.message });
    });
  }

  // ==================== PAGE TYPE DETECTION ====================
  function detectPageType() {
    const url = window.location.href.toLowerCase();
    const pageText = DOMUtils.getPageText().toLowerCase();
    
    // PRIORITY 1: URL-based detection (most reliable)
    // Check for checkout FIRST (most specific)
    if (url.includes('/cart') || url.includes('/checkout') || 
        url.includes('/payment') || url.includes('/billing') ||
        url.includes('/order') || url.includes('/confirm')) {
      return 'Checkout';
    }
    
    // Check for product page
    if (url.includes('/product/') || url.includes('/p/') || 
        url.includes('/item/') || url.includes('/dp/') ||
        url.includes('/products/') && !url.includes('/products?')) {
      return 'Product';
    }
    
    // Check for category page
    if (url.includes('/category/') || url.includes('/collections/') || 
        url.includes('/shop') || url.includes('/products') || 
        url.includes('/search')) {
      return 'Category';
    }
    
    // Check for seller page
    if (url.includes('/seller/') || url.includes('/vendor/') || 
        url.includes('/store/') || url.includes('/merchant/')) {
      return 'Seller';
    }

    // PRIORITY 2: Element-based detection
    // Checkout indicators - multiple confirmations required
    if ((pageText.includes('billing address') || pageText.includes('shipping address') || 
         pageText.includes('payment method')) &&
        (DOMUtils.elementExists(CONFIG.SELECTORS.CHECKOUT.billingFields) || 
         DOMUtils.elementExists(CONFIG.SELECTORS.CHECKOUT.paymentGateway))) {
      return 'Checkout';
    }
    
    // Product page - must have price AND image/add-to-cart
    if ((pageText.includes('price:') || pageText.includes('$') || pageText.includes('₹')) &&
        (DOMUtils.elementExists(CONFIG.SELECTORS.PRODUCT.productImage) || 
         DOMUtils.elementExists(CONFIG.SELECTORS.PRODUCT.addToCart))) {
      return 'Product';
    }
    
    // Category/Shop - has product grid or filters
    if (DOMUtils.elementExists(CONFIG.SELECTORS.CATEGORY.productGrid) ||
        (DOMUtils.elementExists(CONFIG.SELECTORS.CATEGORY.filters) &&
         DOMUtils.elementExists(CONFIG.SELECTORS.CATEGORY.sorting))) {
      return 'Category';
    }
    
    // Seller page - has seller name and feedback
    if (DOMUtils.elementExists(CONFIG.SELECTORS.SELLER.sellerName) &&
        DOMUtils.elementExists(CONFIG.SELECTORS.SELLER.feedbackScore)) {
      return 'Seller';
    }

    // PRIORITY 3: Home page detection (fallback)
    // Multiple signals required to confirm home page
    if ((DOMUtils.elementExists(CONFIG.SELECTORS.HOME.logo) || 
         DOMUtils.elementExists(CONFIG.SELECTORS.HOME.promoBanner)) &&
        (DOMUtils.elementExists(CONFIG.SELECTORS.HOME.categoryMenu) ||
         pageText.includes('welcome') || pageText.includes('shop now'))) {
      return 'Home';
    }
    
    // Default fallback
    return 'Unknown';
  }

  // ==================== SIGNAL ANALYSIS ====================
  function analyzeUniversalSignals(pageText) {
    const signals = {
      hasContactInfo: false,
      hasReturnPolicy: false,
      hasAboutUs: false,
      hasShippingInfo: false,
      hasUrgencyLanguage: false,
      hasSecurePayment: false,
      urgencyScore: 0,
      persuasionScore: 0
    };

    const patterns = {
      contact: [/contact\s*us/i, /email\s*us/i, /call\s*us/i, /support@/i, /help@/i, /\d{10,}/, /phone/i, /whatsapp/i],
      returnPolicy: [/return\s*policy/i, /return\s*info/i, /money\s*back/i, /refund\s*policy/i],
      aboutUs: [/about\s*us/i, /our\s*story/i, /company\s*info/i, /who\s*we\s*are/i],
      shipping: [/shipping\s*info/i, /delivery\s*info/i, /shipping\s*policy/i, /free\s*shipping/i],
      urgency: [/limited\s*time/i, /hurry/i, /order\s*now/i, /last\s*chance/i, /act\s*now/i, /selling\s*out/i],
      securePayment: [/stripe/i, /paypal/i, /ssl/i, /secure\s*checkout/i, /payment\s*secure/i, /lock\s*icon/i]
    };

    Object.keys(patterns).forEach(key => {
      patterns[key].forEach(pattern => {
        if (pattern.test(pageText)) {
          if (key === 'contact') signals.hasContactInfo = true;
          else if (key === 'returnPolicy') signals.hasReturnPolicy = true;
          else if (key === 'aboutUs') signals.hasAboutUs = true;
          else if (key === 'shipping') signals.hasShippingInfo = true;
          else if (key === 'urgency') {
            signals.hasUrgencyLanguage = true;
            signals.urgencyScore += 10;
          }
          else if (key === 'securePayment') {
            signals.hasSecurePayment = true;
          }
        }
      });
    });

    CONFIG.PERSUASION_KEYWORDS.forEach(keyword => {
      if (pageText.includes(keyword)) {
        signals.persuasionScore += 5;
      }
    });

    return signals;
  }

  // ==================== RISK CALCULATION ====================
  function calculateRiskScore(signals, pageType, urlRisk) {
    let riskScore = 0;
    
    // ========== URL-BASED RISK (Weight: 15%) ==========
    if (urlRisk.isSuspicious) riskScore += 30;
    if (urlRisk.hasSuspiciousTLD) riskScore += 20;
    
    // ========== PAGE-TYPE SPECIFIC RISK ==========
    if (pageType === 'Checkout') {
      // High scrutiny for checkout pages
      if (!signals.hasSecurePayment) riskScore += 35;  // Critical
      if (!signals.hasContactInfo) riskScore += 25;    // Important
      if (!signals.hasAboutUs) riskScore += 20;        // Moderate
      if (!signals.hasReturnPolicy) riskScore += 20;   // Moderate
      if (!signals.hasShippingInfo) riskScore += 15;   // Important
      if (signals.hasUrgencyLanguage) riskScore += signals.urgencyScore * 2; // Doubled weight
    }
    
    else if (pageType === 'Product') {
      // Medium scrutiny for product pages
      if (!signals.hasSecurePayment) riskScore += 25;  // Important
      if (!signals.hasContactInfo) riskScore += 20;    // Important
      if (!signals.hasReturnPolicy) riskScore += 18;   // Important
      if (!signals.hasAboutUs) riskScore += 12;        // Moderate
      if (signals.hasUrgencyLanguage) riskScore += signals.urgencyScore * 1.5; // 1.5x weight
    }
    
    else if (pageType === 'Seller') {
      // Seller verification
      if (!signals.hasContactInfo) riskScore += 30;    // Critical for seller
      if (!signals.hasAboutUs) riskScore += 25;        // Critical - seller info
      if (!signals.hasReturnPolicy) riskScore += 20;   // Important
      if (signals.hasUrgencyLanguage) riskScore += signals.urgencyScore * 2;
    }
    
    else if (pageType === 'Category') {
      // Lower initial risk for category pages
      if (!signals.hasContactInfo) riskScore += 15;
      if (!signals.hasAboutUs) riskScore += 10;
      if (signals.hasUrgencyLanguage) riskScore += signals.urgencyScore;
    }
    
    else if (pageType === 'Home') {
      // Home page baseline
      if (!signals.hasContactInfo) riskScore += 18;
      if (!signals.hasAboutUs) riskScore += 15;
      if (signals.hasUrgencyLanguage) riskScore += signals.urgencyScore;
    }
    
    // ========== CROSS-PAGE RISK FACTORS ==========
    // Persuasion/urgency keywords (weighted heavier)
    riskScore += signals.persuasionScore;
    
    // ========== CAP THE SCORE ==========
    return Math.min(100, riskScore);
  }

  // ==================== MIXED CONTENT CHECK ====================
  function checkMixedContent() {
    if (window.location.protocol !== 'https:') {
      return { hasMixedContent: false, reason: '' };
    }

    const mixedContentTags = ['script', 'img', 'link', 'iframe', 'video', 'audio', 'source', 'track'];
    const httpResources = [];

    mixedContentTags.forEach(tag => {
      try {
        const elements = document.querySelectorAll(tag);
        elements.forEach(el => {
          const src = el.src || el.getAttribute('href');
          if (src && src.startsWith('http://')) {
            httpResources.push(src);
          }
        });
      } catch (e) {
        Logger.debug('Mixed content check error for tag', { tag, error: e.message });
      }
    });

    return {
      hasMixedContent: httpResources.length > 0,
      resourceCount: httpResources.length,
      reason: httpResources.length > 0 ? `Mixed content: ${httpResources.length} HTTP resources on HTTPS page` : ''
    };
  }

  // ==================== SCAN LOGIC ====================
  function performScan() {
    state.scanStage = 'analysis';
    state.isScanning = true;

    try {
      const pageType = detectPageType();
      state.detectedPageType = pageType;

      const pageText = DOMUtils.getPageText();
      const universalSignals = analyzeUniversalSignals(pageText);

      let urlRisk = { 
        isSuspicious: false, 
        hasSuspiciousTLD: false,
        phishingScore: 0 
      };
      const domain = state.currentDomain;
      
      if (domain && typeof MLUtils !== 'undefined') {
        const baseDomain = StringUtils.getBaseDomain(domain);
        urlRisk.hasSuspiciousTLD = CONFIG.SUSPICIOUS_TLDS.some(tld => baseDomain.endsWith(tld));
        urlRisk.isSuspicious = urlRisk.hasSuspiciousTLD;
        
        // ML Phishing detection
        urlRisk.phishingScore = MLUtils.phishingScore(state.currentUrl);
        if (urlRisk.phishingScore > 60) {
          urlRisk.isSuspicious = true;
        }
      }

      // ML Sentiment analysis on page text (product reviews/chat)
      const sentimentScore = typeof MLUtils !== 'undefined' ? MLUtils.sentimentScore(pageText) : 0;
      
      const mixedContent = checkMixedContent();
      let riskScore = calculateRiskScore(universalSignals, pageType, urlRisk);

      // ML Weighting: Phishing (20%), Sentiment (10%)
      if (urlRisk.phishingScore > 60) {
        riskScore += 20;
      } else if (urlRisk.phishingScore > 40) {
        riskScore += 10;
      }
      
      if (sentimentScore < -0.3) { // Negative sentiment
        universalSignals.sentimentScore = sentimentScore;
        riskScore += 15;
      } else {
        universalSignals.sentimentScore = sentimentScore;
      }

      let riskLevel = 'Safe';
      if (riskScore >= CONFIG.RISK_THRESHOLD_HIGH) {
        riskLevel = 'High';
      } else if (riskScore >= CONFIG.RISK_THRESHOLD_MEDIUM) {
        riskLevel = 'Medium';
      } else if (riskScore >= 20) {
        riskLevel = 'Caution';
      }

      const results = {
        pageType,
        riskScore: Math.min(100, riskScore), // Cap at 100
        riskLevel,
        signals: universalSignals,
        urlRisk,
        mixedContent,
        sentimentScore,
        pageLoadTime: state.pageLoadTime,
        scanStage: 'complete'
      };

      // Record page navigation  
      recordPageNavigation(pageType, riskLevel);

      // Show badge if permission granted
      if (state.permissionStatus === 'granted') {
        showRiskBadge(results.riskScore, riskLevel, pageType);
      }

      state.isScanning = false;
      state.lastScanUrl = state.currentUrl;
      state.lastScanTime = Date.now();
      state.hasShownResultForPage = true;
      state.scanStage = 'complete';

      return results;
    } catch (e) {
      Logger.error('Scan failed', { error: e.message });
      state.isScanning = false;
      state.scanStage = 'error';
      return { error: e.message };
    }
  }

  // ==================== PAGE NAVIGATION RECORDING ====================
  function recordPageNavigation(pageType, riskLevel) {
    try {
      MessageUtils.sendMessage({
        action: 'recordPageVisit',
        url: state.currentUrl,
        pageType: pageType,
        riskLevel: riskLevel
      }).catch(e => {
        Logger.debug('Failed to record page navigation', { error: e.message });
      });
    } catch (e) {
      Logger.debug('Error sending page navigation message', { error: e.message });
    }
  }

  // ==================== RISK BADGE ====================
  function showRiskBadge(riskScore, riskLevel, pageType) {
    DOMUtils.removeElement('.trustnet-risk-badge');

    let badgeColor = '#22c55e';
    let badgeText = '✓ Safe';
    
    if (riskLevel === 'High') {
      badgeColor = '#dc2626';
      badgeText = '⚠ High Risk';
    } else if (riskLevel === 'Medium') {
      badgeColor = '#f59e0b';
      badgeText = '⚠ Medium Risk';
    } else if (riskLevel === 'Caution') {
      badgeColor = '#eab308';
      badgeText = '⚡ Caution';
    }

    const badge = document.createElement('div');
    badge.className = 'trustnet-risk-badge';
    badge.innerHTML = `
      <div class="trustnet-badge-score" style="background:${badgeColor}">
        ${riskScore}%
      </div>
      <div class="trustnet-badge-info">
        <div class="trustnet-badge-label">${badgeText}</div>
        <div class="trustnet-badge-type">${pageType || 'Page'}</div>
      </div>
    `;

    badge.addEventListener('click', () => {
      const existingPanel = document.querySelector('.trustnet-analysis-panel');
      if (existingPanel) {
        existingPanel.remove();
      } else {
        showAnalysisPanel(riskScore, riskLevel, pageType);
      }
    });

    document.body.appendChild(badge);

    setTimeout(() => {
      badge.classList.add('trustnet-badge-faded');
    }, 5000);
  }

  function showAnalysisPanel(riskScore, riskLevel, pageType) {
    const panel = document.createElement('div');
    panel.className = 'trustnet-analysis-panel';
    panel.innerHTML = `
      <div class="trustnet-panel-header">
        <span>🛡️ TrustNet Analysis</span>
        <button class="trustnet-panel-close">&times;</button>
      </div>
      <div class="trustnet-panel-content">
        <div class="trustnet-panel-score">
          <div class="trustnet-score-value" style="color: ${riskLevel === 'High' ? '#dc2626' : riskLevel === 'Medium' ? '#f59e0b' : riskLevel === 'Caution' ? '#eab308' : '#22c55e'}">${riskScore}%</div>
          <div class="trustnet-score-label">${riskLevel} Risk</div>
        </div>
        <div class="trustnet-panel-section">
          <strong>Page Type:</strong> ${pageType || 'Unknown'}
        </div>
        <div class="trustnet-panel-section">
          <strong>Domain:</strong> ${state.currentDomain || 'Unknown'}
        </div>
        <div class="trustnet-panel-section">
          <strong>Time on Page:</strong> ${Math.floor((Date.now() - state.navigationStartTime) / 1000)}s
        </div>
      </div>
    `;

    panel.querySelector('.trustnet-panel-close').addEventListener('click', () => {
      panel.remove();
    });

    document.body.appendChild(panel);
  }

  // ==================== PERMISSION CHECK ====================
  async function checkPermissionsAndScan() {
    const url = window.location.href;
    const domain = StringUtils.getDomain(url);

    if (url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
      return;
    }

    if (!domain) {
      return;
    }

    state.currentDomain = domain;
    state.baseDomain = StringUtils.getBaseDomain(domain);
    state.currentUrl = url;
    state.hasShownResultForPage = false;
    state.navigationStartTime = Date.now();

    if (state.lastScanUrl === url && state.lastScanTime > 0) {
      return;
    }

    state.pageLoadTime = performance.now();

    try {
      const data = await StorageUtils.get(['site_permissions', 'permission_denied_dates']);
      const permissions = data.site_permissions || {};
      const deniedDates = data.permission_denied_dates || {};

      if (permissions[domain] === 'granted' || permissions[state.baseDomain] === 'granted') {
        state.permissionStatus = 'granted';
        performScan();
        return;
      }

      const deniedDate = deniedDates[domain] || deniedDates[state.baseDomain];
      if (deniedDate) {
        const daysSinceDenied = TimeUtils.getDaysSince(deniedDate);
        if (daysSinceDenied < CONFIG.PERMISSION_COOLDOWN_DAYS) {
          state.permissionStatus = 'denied';
          state.sessionDenied.add(domain);
          performScan();
          return;
        }
      }

      if (state.sessionDenied.has(domain) || state.sessionDenied.has(state.baseDomain)) {
        performScan();
        return;
      }

      if (state.sessionPermissionAsked.has(url)) {
        performScan();
        return;
      }

      state.sessionPermissionAsked.add(url);
      showPermissionBar();
    } catch (e) {
      Logger.error('Permission check failed', { error: e.message });
      performScan();
    }
  }

  // ==================== MUTATION OBSERVER ====================
  function initMutationObserver() {
    if (!window.MutationObserver) return;

    const observer = new MutationObserver(FunctionUtils.debounce(() => {
      state.lastMutationTime = Date.now();
      const newPageType = detectPageType();
      if (newPageType !== state.detectedPageType) {
        state.detectedPageType = newPageType;
        state.hasShownResultForPage = false;
      }
    }, 500));

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    state.mutationObserver = observer;
  }

  // ==================== SPA NAVIGATION ====================
  function initSPANavigationDetection() {
    if (!history.pushState) return;

    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = function() {
      originalPushState.apply(this, arguments);
      handleNavigation();
    };

    history.replaceState = function() {
      originalReplaceState.apply(this, arguments);
      handleNavigation();
    };

    window.addEventListener('popstate', handleNavigation);
  }

  function handleNavigation() {
    const currentUrl = window.location.href;
    if (state.lastScanUrl !== currentUrl) {
      state.hasShownResultForPage = false;
      state.lastScanUrl = null;
      state.lastScanTime = 0;

      setTimeout(() => {
        checkPermissionsAndScan();
      }, CONFIG.STABILITY_DELAY);
    }
  }

  // ==================== MESSAGE HANDLER ====================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      if (message.action === 'performScan') {
        if (!state.permissionStatus || state.permissionStatus === 'granted') {
          const results = performScan();
          sendResponse(results);
        } else {
          sendResponse({ error: 'Permission required' });
        }
        return true;
      }

      if (message.action === 'getStatus') {
        sendResponse({
          isScanning: state.isScanning,
          hasResult: state.hasShownResultForPage,
          permissionStatus: state.permissionStatus,
          pageType: state.detectedPageType,
          scanStage: state.scanStage
        });
        return true;
      }

      if (message.action === 'getPageType') {
        sendResponse({
          pageType: state.detectedPageType || detectPageType()
        });
        return true;
      }

      // Extract chat messages from WhatsApp/Instagram
      if (message.action === 'extractChatMessages') {
        try {
          const isWhatsApp = window.location.href.includes('web.whatsapp.com') || window.location.href.includes('whatsapp.com');
          const isInstagram = window.location.href.includes('instagram.com');

          if (isWhatsApp) {
            // Extract WhatsApp chat messages
            const messages = [];
            const messageElements = document.querySelectorAll('[class*="message"]');
            messageElements.forEach(el => {
              const text = el.textContent?.trim();
              if (text && text.length > 0) {
                messages.push(text);
              }
            });
            sendResponse({ chatMessages: messages.join(' ') });
          } else if (isInstagram) {
            // Extract Instagram DM messages
            const messages = [];
            const messageElements = document.querySelectorAll('[role="listitem"]');
            messageElements.forEach(el => {
              const text = el.textContent?.trim();
              if (text && text.length > 0) {
                messages.push(text);
              }
            });
            sendResponse({ chatMessages: messages.join(' ') });
          } else {
            sendResponse({ chatMessages: '' });
          }
        } catch (e) {
          Logger.debug('Failed to extract chat messages', { error: e.message });
          sendResponse({ chatMessages: '' });
        }
        return true;
      }
    } catch (e) {
      Logger.error('Message handler error', { error: e.message });
      sendResponse({ error: e.message });
    }
    return true;
  });

  // ==================== INITIALIZATION ====================
  function init() {
    state.pageLoadTime = performance.now();

    setTimeout(() => {
      checkPermissionsAndScan();
    }, CONFIG.STABILITY_DELAY);

    initMutationObserver();
    initSPANavigationDetection();

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleNavigation();
      }
    });

    Logger.info('TrustNet content script initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
