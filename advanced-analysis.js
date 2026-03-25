/**
 * TrustNet - Advanced Real-World Risk Analysis
 * Implements comprehensive checks for homepage, product, and checkout pages
 * Based on real scam patterns and e-commerce best practices
 * @version 2.0
 */

// ==================== HOMEPAGE LEGITIMACY CHECKS ====================
const HomepageAnalyzer = {
  
  /**
   * Verify company details and trust signals
   * Checks for: physical address, phone, business info, privacy policy, SSL
   */
  analyzeCompanyDetails() {
    let riskScore = 0;
    const signals = {
      hasPhysicalAddress: false,
      hasPhoneNumber: false,
      hasPrivacyPolicy: false,
      hasTermsOfService: false,
      hasAboutUs: false,
      hasSSL: false,
      hasSocialLinks: false,
      hasEmailAddress: false
    };

    // Check for physical address
    const addressPatterns = [
      /\b\d+\s+[a-z\s]+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|court|ct|boulevard|blvd)\b/i,
      /(?:address|location|office)[\s:]+([^<\n]*(?:street|avenue|road|lane|drive|court|boulevard))/i,
      /\b(?:suite|unit|apartment)\s*\d+/i
    ];
    
    const pageText = document.body.innerText;
    const hasAddress = addressPatterns.some(pattern => pattern.test(pageText));
    signals.hasPhysicalAddress = hasAddress;
    if (!hasAddress) riskScore += 25;

    // Check for phone number
    const phonePattern = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|(?:\+\d{1,3}\s?)?\d{7,15}/;
    signals.hasPhoneNumber = phonePattern.test(pageText);
    if (!signals.hasPhoneNumber) riskScore += 20;

    // Check for email (generic emails are flagged)
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = pageText.match(emailPattern) || [];
    const genericEmails = emails.filter(e => /^(contact|info|support|sales)@/i.test(e)).length;
    signals.hasEmailAddress = emails.length > 0;
    if (genericEmails === emails.length && emails.length > 0) riskScore += 10; // All generic

    // Check for privacy policy link
    const privacyLinks = document.querySelectorAll('a[href*="privacy"], a[href*="policy"], a[href*="terms"]');
    signals.hasPrivacyPolicy = privacyLinks.length > 0;
    if (!signals.hasPrivacyPolicy) riskScore += 20;

    // Check for terms of service
    const tosPresent = Array.from(privacyLinks).some(link => 
      link.href.toLowerCase().includes('terms') || link.textContent.toLowerCase().includes('terms')
    );
    signals.hasTermsOfService = tosPresent;
    if (!signals.hasTermsOfService) riskScore += 15;

    // Check for About Us page
    const aboutLinks = document.querySelectorAll('a[href*="about"], a[href*="company"]');
    signals.hasAboutUs = aboutLinks.length > 0;
    if (!signals.hasAboutUs) riskScore += 18;

    // Check SSL/HTTPS
    signals.hasSSL = window.location.protocol === 'https:';
    if (!signals.hasSSL) riskScore += 30;

    // Check for social media links
    const socialPatterns = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'youtube.com'];
    const socialLinks = Array.from(document.querySelectorAll('a[href]')).filter(a => 
      socialPatterns.some(pattern => a.href.includes(pattern))
    ).length;
    signals.hasSocialLinks = socialLinks >= 2;
    if (!signals.hasSocialLinks) riskScore += 12;

    return { signals, riskScore };
  },

  /**
   * Check domain age and establishment claims
   */
  analyzeDomainAge() {
    let riskScore = 0;
    const signals = {
      hasFoundedYear: false,
      foundedYear: null,
      estimatedAge: null,
      claimsEstablished: false
    };

    const pageText = document.body.innerText.toLowerCase();
    
    // Look for "since", "founded", "established" claims
    const datePatterns = [
      /(?:since|founded|established|est\.?)\s+(\d{4})/i,
      /(\d{4})\s*-\s*(?:present|now|today)/i,
      /serving\s+customers\s+since\s+(\d{4})/i
    ];

    for (const pattern of datePatterns) {
      const match = pageText.match(pattern);
      if (match) {
        signals.foundedYear = parseInt(match[1]);
        signals.hasFoundedYear = true;
        signals.claimsEstablished = true;
        
        // Calculate claimed age
        const yearsOld = new Date().getFullYear() - signals.foundedYear;
        signals.estimatedAge = yearsOld;
        
        // New domains claiming old founding = suspicious
        if (yearsOld > 10) {
          // Legitimate claim
          riskScore -= 15;
        } else if (yearsOld < 1) {
          // Brand new domain claiming establishment = red flag
          riskScore += 40;
        }
        break;
      }
    }

    // If no establishment claim found, check domain age via heuristics
    if (!signals.hasFoundedYear) riskScore += 25;

    return { signals, riskScore };
  },

  /**
   * Detect platform-based vs self-hosted sites
   */
  detectHostingType() {
    const signals = {
      isPlatformBased: false,
      platform: null,
      isSelfHosted: false
    };

    // Check for platform indicators in window/document
    const platformIndicators = {
      'Shopify': ['Shopify.shop', 'shopify-cdn', 'Shopify.theme', 'shopify.com'],
      'WooCommerce': ['woocommerce', 'wp-content/plugins/woocommerce'],
      'Amazon': ['amazon.com', 'amazonpolly'],
      'eBay': ['ebay.com', 'ebayrtm'],
      'Magento': ['Magento', 'magento.com'],
      'BigCommerce': ['bigcommerce.com', 'cdn.shopify'],
      'Squarespace': ['Squarespace', 'squarespace.com'],
      'Wix': ['wix.com', 'editorx.com']
    };

    const pageSource = document.documentElement.innerHTML.toLowerCase();
    const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src).join(' ');

    for (const [platform, keywords] of Object.entries(platformIndicators)) {
      if (keywords.some(keyword => pageSource.includes(keyword.toLowerCase()))) {
        signals.isPlatformBased = true;
        signals.platform = platform;
        break;
      }
    }

    signals.isSelfHosted = !signals.isPlatformBased;
    return signals;
  }
};

// ==================== PRODUCT PAGE ANALYSIS ====================
const ProductAnalyzer = {

  /**
   * Analyze product description for red flags
   */
  analyzeProductDescription() {
    let riskScore = 0;
    const signals = {
      hasVagueDescription: false,
      hasMiracleClaims: false,
      hasSympathyStory: false,
      hasDetailedSpecs: false,
      descriptionLength: 0
    };

    // Get product description
    const descriptionSelectors = [
      '.product-description',
      '[itemprop="description"]',
      '.description',
      '#description',
      '[class*="description"]'
    ];

    let description = '';
    for (const selector of descriptionSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        description = el.innerText;
        break;
      }
    }

    signals.descriptionLength = description.length;

    // Check for vague claims
    const vaguePatterns = [
      /amazing|incredible|unbelievable|best ever|life-changing/i,
      /miracle|cure|magic|secret formula/i,
      /works instantly|guaranteed results|no side effects/i,
      /doctors hate|experts won't tell you|hidden secret/i
    ];

    const hasVague = vaguePatterns.some(p => p.test(description));
    signals.hasVagueDescription = hasVague;
    if (hasVague) riskScore += 20;

    // Check for miracle claims
    const miraclePatterns = [
      /miracle|cure-all|scientifically proven|Nobel Prize/i,
      /never seen before|revolutionary breakthrough/i
    ];
    signals.hasMiracleClaims = miraclePatterns.some(p => p.test(description));
    if (signals.hasMiracleClaims) riskScore += 25;

    // Check for sympathy/sob stories
    const sympathyPatterns = [
      /orphan|single mother|dying|terminal|cancer/i,
      /help (?:save|feed|rescue|support)/i,
      /(?:my|our) story|struggling family/i
    ];
    signals.hasSympathyStory = sympathyPatterns.some(p => p.test(description));
    if (signals.hasSympathyStory) riskScore += 25;

    // Check for detailed specifications
    const specPatterns = [
      /material|dimensions|weight|color|brand/i,
      /specifications|specs|features/i
    ];
    signals.hasDetailedSpecs = specPatterns.some(p => p.test(description));
    if (!signals.hasDetailedSpecs && description.length < 100) riskScore += 15;

    return { signals, riskScore };
  },

  /**
   * Detect fake reviews and rating anomalies
   */
  analyzeFakeReviews() {
    let riskScore = 0;
    const signals = {
      totalReviews: 0,
      allSameStar: false,
      sameDayReviews: false,
      suspiciousLanguage: false,
      duplicateReviews: false,
      starDistribution: {}
    };

    // Get all reviews
    const reviewSelectors = [
      '[class*="review"]',
      '[class*="comment"]',
      '[itemtype*="Review"]',
      '.rating-text',
      '.user-review'
    ];

    let reviews = [];
    for (const selector of reviewSelectors) {
      const els = document.querySelectorAll(selector);
      if (els.length > 0) {
        reviews = Array.from(els).map(el => ({
          text: el.innerText || '',
          rating: el.getAttribute('data-rating') || el.querySelector('[class*="star"]')?.getAttribute('data-rating')
        }));
        break;
      }
    }

    signals.totalReviews = reviews.length;

    if (reviews.length === 0) {
      // No reviews = moderate risk
      riskScore += 15;
    } else if (reviews.length === 1) {
      // Only 1 review = suspicious
      riskScore += 25;
    } else {
      // Analyze review patterns
      const ratings = reviews.map(r => r.rating).filter(r => r !== null);
      
      // Check if all same rating
      const uniqueRatings = new Set(ratings);
      signals.allSameStar = uniqueRatings.size === 1;
      if (signals.allSameStar && ratings[0] === '5') riskScore += 30;

      // Check for same-day reviews
      const reviewDates = reviews.map(r => {
        const dateMatch = r.text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        return dateMatch ? dateMatch[0] : null;
      }).filter(d => d);

      const uniqueDates = new Set(reviewDates);
      signals.sameDayReviews = uniqueDates.size < reviews.length * 0.3;
      if (signals.sameDayReviews) riskScore += 20;

      // Check for duplicate review text
      const reviewTexts = reviews.map(r => r.text.toLowerCase().trim());
      const textCounts = {};
      reviewTexts.forEach(text => {
        textCounts[text] = (textCounts[text] || 0) + 1;
      });

      const duplicateCount = Object.values(textCounts).filter(count => count > 1).length;
      signals.duplicateReviews = duplicateCount > 0;
      if (signals.duplicateReviews) riskScore += 25;

      // Check for suspicious language
      const botPatterns = [
        /great product|highly recommend|worth the money|amazing quality/i,
        /fast shipping|great seller|5 stars/i
      ];
      const suspiciousCount = reviews.filter(r => botPatterns.some(p => p.test(r.text))).length;
      signals.suspiciousLanguage = suspiciousCount > reviews.length * 0.5;
      if (signals.suspiciousLanguage) riskScore += 20;
    }

    return { signals, riskScore };
  },

  /**
   * Check for pricing red flags
   */
  analyzePricing() {
    let riskScore = 0;
    const signals = {
      hasUrgentPricing: false,
      hasExcessiveDiscount: false,
      hasLimitedStockBadge: false,
      hasTimer: false,
      priceTransparency: true
    };

    const pageText = document.body.innerText;

    // Check for urgency timers
    const timerPatterns = [
      /(?:offer expires|limited time|sale ends|hurry)\s*(?:in|at)?\s*\d+\s*(?:hours|minutes|seconds)/i,
      /ends? (?:today|tonight|this (?:hour|minute))/i
    ];
    signals.hasTimer = timerPatterns.some(p => p.test(pageText));
    if (signals.hasTimer) riskScore += 15;

    // Check for limited stock badges
    signals.hasLimitedStockBadge = /only\s+\d+\s+(?:left|available|in stock)/i.test(pageText);
    if (signals.hasLimitedStockBadge) riskScore += 12;

    // Check for excessive discounts (>70% off is suspicious)
    const discountPatterns = [
      /(\d+)%\s*off/i,
      /save.*(\d+)%/i,
      /discount.*(\d+)%/i
    ];

    for (const pattern of discountPatterns) {
      const match = pageText.match(pattern);
      if (match && parseInt(match[1]) > 70) {
        signals.hasExcessiveDiscount = true;
        riskScore += 20;
        break;
      }
    }

    // Check for price transparency (original vs discounted)
    const priceElements = document.querySelectorAll('[class*="price"]');
    const hasStrikethrough = Array.from(priceElements).some(el => 
      window.getComputedStyle(el).textDecoration.includes('line-through')
    );
    signals.priceTransparency = hasStrikethrough || priceElements.length > 1;
    if (!signals.priceTransparency) riskScore += 10;

    return { signals, riskScore };
  }
};

// ==================== CHECKOUT PAGE ANALYSIS ====================
const CheckoutAnalyzer = {

  /**
   * Verify payment gateway security
   */
  analyzePaymentGateway() {
    let riskScore = 0;
    const signals = {
      hasKnownGateway: false,
      gateway: null,
      hasCrypto: false,
      hasWireTransfer: false,
      onlySketchyPayments: false
    };

    const pageText = document.body.innerText.toLowerCase();
    const pageSource = document.documentElement.innerHTML.toLowerCase();

    // List of trusted gateways
    const trustedGateways = [
      'stripe', 'paypal', 'square', 'razorpay', 'ccavenue', 'payu',
      'braintree', 'authorize.net', 'instamojo', 'juspay', 'cashfree'
    ];

    for (const gateway of trustedGateways) {
      if (pageText.includes(gateway) || pageSource.includes(gateway)) {
        signals.hasKnownGateway = true;
        signals.gateway = gateway;
        break;
      }
    }

    if (!signals.hasKnownGateway) riskScore += 35;

    // Check for cryptocurrency payments (sketchy for retail)
    const cryptoPatterns = [
      /bitcoin|ethereum|cryptocurrency|crypto|btc|eth|blockchain/i,
      /pay with (?:crypto|bitcoin|ethereum)/i
    ];
    signals.hasCrypto = cryptoPatterns.some(p => p.test(pageText));
    if (signals.hasCrypto) riskScore += 25;

    // Check for wire transfer (high risk for buyers)
    const wirePatterns = [
      /wire transfer|bank transfer|swift|money transfer/i,
      /send funds to|transfer to account/i
    ];
    signals.hasWireTransfer = wirePatterns.some(p => p.test(pageText));
    if (signals.hasWireTransfer) riskScore += 40;

    // Check if only sketchy payments available
    signals.onlySketchyPayments = signals.hasCrypto && signals.hasWireTransfer && !signals.hasKnownGateway;
    if (signals.onlySketchyPayments) riskScore += 50;

    return { signals, riskScore };
  },

  /**
   * Validate form fields for excessive data requests
   */
  analyzeFormFields() {
    let riskScore = 0;
    const signals = {
      hasSSN: false,
      hasExcessiveFields: false,
      requiresPreAuth: false,
      fieldCount: 0
    };

    // Count form fields
    const formFields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
    signals.fieldCount = formFields.length;

    // Check for excessive fields (>20 is unusual)
    signals.hasExcessiveFields = formFields.length > 20;
    if (signals.hasExcessiveFields) riskScore += 15;

    // Check for SSN or national ID fields
    const sensitiveFieldPatterns = [
      'ssn', 'national id', 'passport', 'driver license', 'tax id'
    ];

    for (const field of formFields) {
      const name = (field.name || field.id || '').toLowerCase();
      const label = field.closest('label')?.innerText.toLowerCase() || '';
      
      if (sensitiveFieldPatterns.some(pattern => name.includes(pattern) || label.includes(pattern))) {
        signals.hasSSN = true;
        riskScore += 50; // Critical risk
        break;
      }
    }

    return { signals, riskScore };
  },

  /**
   * Check order summary for transparency
   */
  analyzeOrderSummary() {
    let riskScore = 0;
    const signals = {
      hasItemsList: false,
      hasShippingCost: false,
      hasTaxInfo: false,
      hasTotal: false,
      hasHiddenFees: false
    };

    const summarySelectors = [
      '.order-summary', '.cart-summary', '[class*="total"]', '.checkout-summary'
    ];

    let summaryElement = null;
    for (const selector of summarySelectors) {
      const el = document.querySelector(selector);
      if (el) {
        summaryElement = el;
        break;
      }
    }

    if (!summaryElement) {
      riskScore += 20;
      return { signals, riskScore };
    }

    const summaryText = summaryElement.innerText.toLowerCase();

    signals.hasItemsList = /item|product|qty|quantity/i.test(summaryText);
    if (!signals.hasItemsList) riskScore += 12;

    signals.hasShippingCost = /shipping|delivery|freight/i.test(summaryText);
    if (!signals.hasShippingCost) riskScore += 15;

    signals.hasTaxInfo = /tax|gst|vat|duty/i.test(summaryText);
    if (!signals.hasTaxInfo) riskScore += 10;

    signals.hasTotal = /total|final|amount/i.test(summaryText);
    if (!signals.hasTotal) riskScore += 20;

    // Check for surprise fees in fine print
    const fineprint = Array.from(document.querySelectorAll('small, .fine-print, [class*="disclaimer"]'))
      .map(el => el.innerText.toLowerCase())
      .join(' ');

    signals.hasHiddenFees = /additional fee|charge will be|surprise|may apply/i.test(fineprint);
    if (signals.hasHiddenFees) riskScore += 25;

    return { signals, riskScore };
  }
};

// ==================== WEIGHTED RISK SCORING ====================
const RiskScoringEngine = {

  /**
   * Calculate weighted risk score (0-100)
   * Technical (30%), Content (40%), Behavioral (20%), Reputation (10%)
   */
  calculateWeightedScore(pageType, analysisResults) {
    let scores = {
      technical: 0,
      content: 0,
      behavioral: 0,
      reputation: 0
    };

    // Technical (30%): SSL, domain age, performance
    scores.technical += analysisResults.domainRisk || 0;
    scores.technical += analysisResults.sslRisk || 0;
    scores.technical = Math.min(100, scores.technical);

    // Content (40%): Description, reviews, pricing, policies
    scores.content += analysisResults.descriptionRisk || 0;
    scores.content += analysisResults.reviewRisk || 0;
    scores.content += analysisResults.pricingRisk || 0;
    scores.content += analysisResults.policyRisk || 0;
    scores.content = Math.min(100, scores.content);

    // Behavioral (20%): Review timing, payment behavior
    scores.behavioral += analysisResults.paymentRisk || 0;
    scores.behavioral += analysisResults.formRisk || 0;
    scores.behavioral = Math.min(100, scores.behavioral);

    // Reputation (10%): External flags (can use Google Safe Browsing API)
    scores.reputation = analysisResults.reputationRisk || 0;

    // Weighted calculation
    const weightedScore = (
      (scores.technical * 0.30) +
      (scores.content * 0.40) +
      (scores.behavioral * 0.20) +
      (scores.reputation * 0.10)
    );

    return Math.min(100, Math.max(0, Math.round(weightedScore)));
  }
};

// ==================== EXPORT ====================
if (typeof globalThis !== 'undefined') {
  globalThis.HomepageAnalyzer = HomepageAnalyzer;
  globalThis.ProductAnalyzer = ProductAnalyzer;
  globalThis.CheckoutAnalyzer = CheckoutAnalyzer;
  globalThis.RiskScoringEngine = RiskScoringEngine;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    HomepageAnalyzer, ProductAnalyzer, CheckoutAnalyzer, RiskScoringEngine
  };
}
