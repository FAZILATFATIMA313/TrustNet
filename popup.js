<<<<<<< HEAD
<<<<<<< HEAD
// popup.js
document.addEventListener('DOMContentLoaded', function() {
=======
=======
>>>>>>> 77e72c9f4ba7df703ffc2fdb1d304702c7f942b2
// popup.js - TrustNet Popup with Context-Aware Display

document.addEventListener('DOMContentLoaded', function () {

  // ---------- LOAD LOGO ====================
  const logoImg = document.getElementById('logo-img');
  const logoUrl = chrome.runtime.getURL('Logo.jpeg');
  logoImg.src = logoUrl;
  logoImg.classList.remove('logo-hidden');

  // ---------- BASIC ELEMENTS ----------
<<<<<<< HEAD
>>>>>>> origin/master
=======
>>>>>>> 77e72c9f4ba7df703ffc2fdb1d304702c7f942b2
  const currentUrlElement = document.getElementById('current-url');
  const scanButton = document.getElementById('scan-page');
  const resultsElement = document.getElementById('results');

<<<<<<< HEAD
<<<<<<< HEAD
  // Get current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const currentTab = tabs[0];
    currentUrlElement.textContent = currentTab.url;
  });

  scanButton.addEventListener('click', function() {
    scanButton.textContent = 'Scanning...';
    scanButton.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'scanPage' }, function(response) {
        scanButton.textContent = 'Scan Page';
        scanButton.disabled = false;

        if (response) {
          displayResults(response);
        } else {
          alert('Failed to scan page. Please refresh and try again.');
        }
      });
    });
  });

  function displayResults(response) {
    // Page Type
    document.getElementById('page-type').textContent = response.pageType;

    // URL Risk
    const urlRiskElement = document.getElementById('url-risk');
    urlRiskElement.textContent = response.urlRisk.score.toUpperCase();
    urlRiskElement.className = `risk-${response.urlRisk.score}`;

    const urlReasonsElement = document.getElementById('url-reasons');
    urlReasonsElement.innerHTML = response.urlRisk.reasons.map(reason => `<div>• ${reason}</div>`).join('');

    // Content Signals
    document.getElementById('return-policy').innerHTML = response.contentSignals.returnPolicy ? '✅' : '❌';
    document.getElementById('contact-info').innerHTML = response.contentSignals.contactInfo ? '✅' : '❌';
    document.getElementById('about-us').innerHTML = response.contentSignals.aboutUs ? '✅' : '❌';
    document.getElementById('shipping').innerHTML = response.contentSignals.shipping ? '✅' : '❌';
    document.getElementById('urgency').innerHTML = response.contentSignals.urgency ? '⚠️' : '✅';

    // Risk Score
    document.getElementById('probability').textContent = `${response.riskScore.probability}%`;

    const riskLevelElement = document.getElementById('risk-level');
    riskLevelElement.textContent = response.riskScore.level;
    riskLevelElement.className = `risk-${response.riskScore.level.toLowerCase()}`;

    // Reasons
    const reasonsList = document.getElementById('reasons-list');
    reasonsList.innerHTML = response.riskScore.reasons.map(reason => `<li>${reason}</li>`).join('');

    // Show results
    resultsElement.style.display = 'block';
  }
=======
=======
>>>>>>> 77e72c9f4ba7df703ffc2fdb1d304702c7f942b2
  // ---------- CHAT ELEMENTS ----------
  const chatInput = document.getElementById('chat-input');
  const analyzeChatBtn = document.getElementById('analyze-chat');
  const chatResult = document.getElementById('chat-result');
  const chatSection = document.querySelector('.chat-section');

  // Track current tab URL for WhatsApp/Instagram detection
  let currentTabUrl = '';

  // ---------- LOAD CURRENT URL ----------
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs && tabs[0]) {
      currentUrlElement.textContent = tabs[0].url;
      currentTabUrl = tabs[0].url;
      
      // Check if on WhatsApp or Instagram and auto-trigger chat analysis
      checkAndTriggerChatAnalysis(tabs[0].url);
    }
  });

  // ---------- CONTEXT HELPERS ----------
  function getContextIcon(pageType) {
    const icons = {
      'Home': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      'Category': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
      'Product': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
      'Seller': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      'Checkout': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>',
      'Mixed': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>',
      'Unknown': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>'
    };
    return icons[pageType] || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  }

  function getContextTitle(pageType) {
    const titles = {
      'Home': 'SITE TRUST CHECK',
      'Category': 'PRODUCT SAFETY',
      'Product': 'SELLER VERIFICATION',
      'Seller': 'SELLER PROFILE CHECK',
      'Checkout': 'TRANSACTION SAFETY',
      'Mixed': 'PAGE ANALYSIS',
      'Unknown': 'PAGE ANALYSIS'
    };
    return titles[pageType] || 'PAGE ANALYSIS';
  }

  function getContextRecommendation(pageType, riskLevel, signals) {
    // Add null check for riskLevel
    const level = (riskLevel || 'Unknown').toUpperCase();
    const recommendations = {
      'Home': {
        'SAFE': '<span class="safe-good">Legitimate business - safe to browse</span>',
        'CAUTION': '<span class="safe-warn">Verify contact details before making any purchases</span>',
        'MEDIUM': '<span class="safe-warn">Proceed with caution - verify business registration</span>',
        'HIGH': '<span class="safe-bad">High risk - avoid providing any personal information</span>'
      },
      'Category': {
        'SAFE': '<span class="safe-good">Product listings appear legitimate</span>',
        'CAUTION': '<span class="safe-warn">Check seller ratings and reviews before buying</span>',
        'MEDIUM': '<span class="safe-warn">Research seller before adding to cart</span>',
        'HIGH': '<span class="safe-bad">Multiple red flags detected - avoid this seller</span>'
      },
      'Product': {
        'SAFE': '<span class="safe-good">Legit seller - safe to buy</span>',
        'CAUTION': '<span class="safe-warn">Verify seller details and check reviews</span>',
        'MEDIUM': '<span class="safe-warn">Prefer COD or platform payments</span>',
        'HIGH': '<span class="safe-bad">High scam risk - do not purchase</span>'
      },
      'Seller': {
        'SAFE': '<span class="safe-good">Verified seller profile</span>',
        'CAUTION': '<span class="safe-warn">Check feedback details carefully</span>',
        'MEDIUM': '<span class="safe-warn">Research seller before transactions</span>',
        'HIGH': '<span class="safe-bad">Unverified seller - avoid transactions</span>'
      },
      'Checkout': {
        'SAFE': '<span class="safe-good">Secure checkout process</span>',
        'CAUTION': '<span class="safe-warn">Ensure payment method is trusted</span>',
        'MEDIUM': '<span class="safe-warn">Verify order summary before payment</span>',
        'HIGH': '<span class="safe-bad">Unsafe payment - do not proceed</span>'
      },
      'Mixed': {
        'SAFE': '<span class="safe-good">Page appears safe</span>',
        'CAUTION': '<span class="safe-warn">General caution advised</span>',
        'MEDIUM': '<span class="safe-warn">Verify before sharing data</span>',
        'HIGH': '<span class="safe-bad">Potential risk detected</span>'
      }
    };
    
    return recommendations[pageType]?.[level] || recommendations['Mixed'][level] || 'Scan complete';
  }

  // ---------- AUTO CHAT ANALYSIS FOR WHATSAPP/INSTAGRAM ----------
  function checkAndTriggerChatAnalysis(url) {
    const isWhatsApp = url.includes('web.whatsapp.com') || url.includes('whatsapp.com');
    const isInstagram = url.includes('instagram.com') || url.includes('instagram.com/direct');

    if (isWhatsApp || isInstagram) {
      // Auto-extract chat from content script
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0]) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: 'extractChatMessages' },
            function (response) {
              if (chrome.runtime.lastError || !response || !response.chatMessages) {
                console.debug('Could not auto-extract chat');
                return;
              }
              
              // Populate chat input and auto-analyze
              chatInput.value = response.chatMessages;
              analyzeChat(response.chatMessages);
            }
          );
        }
      });
    }
  }

  // ---------- SCAN PAGE ----------
  // Extracted scan logic so it can be reused (button + auto-run)
  function runScan() {
    scanButton.textContent = 'Scanning...';
    scanButton.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs || !tabs[0]) {
        scanButton.textContent = 'Scan Page';
        scanButton.disabled = false;
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'performScan' },
        function (response) {

          scanButton.textContent = 'Scan Page';
          scanButton.disabled = false;

          if (chrome.runtime.lastError || !response) {
            // Try once more silently before showing an alert (covers transient tab messaging failures)
            console.debug('First scan attempt failed', chrome.runtime.lastError);
            // Second attempt
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: 'performScan' },
              function (resp2) {
                if (chrome.runtime.lastError || !resp2) {
                  alert('Failed to scan page. Please refresh the page and try again.');
                  return;
                }
                displayResults(resp2);
              }
            );
            return;
          }

          displayResults(response);
        }
      );
    });
  }

  scanButton.addEventListener('click', runScan);

  // Auto-run scan when popup opens to provide a "Try Again" behavior automatically
  // (gracefully ignore errors)
  try {
    runScan();
  } catch (e) {
    console.debug('Auto-scan failed to start', e.message);
  }

  // ---------- ANALYZE CHAT ----------
  analyzeChatBtn.addEventListener('click', function () {
    const chatText = chatInput.value.toLowerCase();

    if (!chatText.trim()) {
      alert('Please paste seller chat first.');
      return;
    }

    analyzeChat(chatText);
  });

  // Wrapper for chat analysis (handles UI display)
  function analyzeChat(text) {
    const chatAnalysis = analyzeChatMessages(text);
    displayChatResult(chatAnalysis);
  }

  // ---------- CONTEXT-AWARE DISPLAY RESULTS ----------
  function generateContextualReasons(pageType, signals, urlRiskLevel, riskScore, paymentRiskLevel) {
    const reasons = [];

    // HIGH PRIORITY RISKS
    if (urlRiskLevel === 'High') {
      reasons.push('⚠️ Domain flagged as suspicious or uses risky TLD');
    }

    // PAGE TYPE SPECIFIC RISKS
    if (pageType === 'Checkout') {
      if (paymentRiskLevel === 'High') {
        reasons.push('🚨 No secure payment gateway detected - risky checkout');
      }
      if (!signals.hasContactInfo) {
        reasons.push('🚨 No seller contact information - cannot request refund support');
      }
      if (!signals.hasReturnPolicy) {
        reasons.push('⚠️ No return/refund policy visible - verify before payment');
      }
      if (!signals.hasAboutUs) {
        reasons.push('⚠️ No business information - seller details unclear');
      }
    }
    
    else if (pageType === 'Product' || pageType === 'Seller') {
      if (!signals.hasContactInfo) {
        reasons.push('⚠️ No contact information - cannot reach seller support');
      }
      if (!signals.hasReturnPolicy) {
        reasons.push('⚠️ Return policy not visible - check before buying');
      }
      if (!signals.hasSecurePayment) {
        reasons.push('ℹ️ No recognized payment gateway - verify payment security');
      }
      if (!signals.hasAboutUs) {
        reasons.push('⚠️ No seller profile or business details');
      }
    }
    
    else if (pageType === 'Home') {
      if (!signals.hasAboutUs) {
        reasons.push('ℹ️ No company information visible');
      }
      if (!signals.hasContactInfo) {
        reasons.push('⚠️ No contact details provided');
      }
      if (!signals.hasShippingInfo) {
        reasons.push('ℹ️ Shipping information not visible on homepage');
      }
    }

    // MANIPULATION TACTICS
    if (signals.hasUrgencyLanguage) {
      reasons.push('🚨 Urgency tactics detected - "Act now", "Limited time", etc.');
    }

    if (signals.persuasionScore > 15) {
      reasons.push('⚠️ Heavy persuasion language detected');
    }

    // RISK SCORE CONTEXT
    if (riskScore >= 70) {
      reasons.push('🚨 High risk score - multiple red flags detected');
    } else if (riskScore >= 40) {
      reasons.push('⚠️ Medium risk - verify details before proceeding');
    }

    // POSITIVE SIGNALS IF NO MAJOR RISKS
    if (reasons.length === 0) {
      if (signals.hasSecurePayment && signals.hasContactInfo && signals.hasReturnPolicy) {
        reasons.push('✓ Legitimate business indicators detected');
      }
    }

    return reasons;
  }

  // ---------- CONTEXT-AWARE DISPLAY RESULTS ----------
  function displayResults(response) {
    
    // Get page type for context-specific display
    const pageType = response.pageType || 'Unknown';
    const contextIcon = getContextIcon(pageType);
    const contextTitle = getContextTitle(pageType);
    
    // Calculate risk score - use riskScore from content.js response
    const riskScore = response.riskScore || 0;
    const riskLevel = response.riskLevel || 'Unknown';
    
    // Get recommendation based on page type
    const recommendation = getContextRecommendation(pageType, riskLevel, response.signals);
    
    // Page Type with context icon - use innerHTML to render SVG properly
    document.getElementById('page-type').innerHTML = contextIcon + ' ' + contextTitle;

    // URL Risk - access urlRisk properties properly
    const urlRiskElement = document.getElementById('url-risk');
    const urlRiskLevel = response.urlRisk?.isSuspicious ? 'High' : (response.urlRisk?.hasSuspiciousTLD ? 'Medium' : 'Low');
    urlRiskElement.textContent = urlRiskLevel.toUpperCase();
    urlRiskElement.className = `risk-${urlRiskLevel.toLowerCase()}`;

    // NEW: Phishing Score Display
    const phishingScore = response.urlRisk?.phishingScore || 0;
    document.getElementById('phishing-score').textContent = `${phishingScore}%`;
    const phishingColor = phishingScore > 60 ? '#dc2626' : phishingScore > 30 ? '#f59e0b' : '#22c55e';
    document.getElementById('phishing-score').style.color = phishingColor;

    // NEW: Sentiment Score Display  
    const sentimentScore = response.signals?.sentiment || 0;
    const sentimentText = sentimentScore > 0.2 ? 'Positive' : sentimentScore < -0.2 ? 'Negative' : 'Neutral';
    const sentimentColor = sentimentScore > 0.2 ? '#22c55e' : sentimentScore < -0.2 ? '#dc2626' : '#64748b';
    document.getElementById('sentiment-score').textContent = sentimentText;
    document.getElementById('sentiment-score').style.color = sentimentColor;

    // URL Reasons
    const urlReasons = [];
    if (response.urlRisk?.hasSuspiciousTLD) urlReasons.push('Suspicious domain extension');
    if (response.urlRisk?.isSuspicious) urlReasons.push('Domain flagged as suspicious');
    if (response.urlRisk?.phishingScore > 60) urlReasons.push(`AI Phishing Risk: ${phishingScore}%`);
    if (response.mixedContent?.hasMixedContent) urlReasons.push(response.mixedContent.reason);
    
    // Safely render reasons with HTML escaping
    const reasonsHtml = urlReasons.length > 0 
      ? urlReasons.map(r => `<div>• ${StringUtils.escapeHtml(r)}</div>`).join('') 
      : '<div>No URL risks detected</div>';
    document.getElementById('url-reasons').innerHTML = reasonsHtml;

    // Content Signals - use signals from content.js response
    const signals = response.signals || {}; 
    
    // SVG icons for checkmarks
    const checkIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    const crossIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    const warnIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    
    // Return Policy
    document.getElementById('return-policy').innerHTML =
      signals.hasReturnPolicy ? checkIcon : crossIcon;

    // Contact Info
    document.getElementById('contact-info').innerHTML =
      signals.hasContactInfo ? checkIcon : crossIcon;

    // About Us
    document.getElementById('about-us').innerHTML =
      signals.hasAboutUs ? checkIcon : crossIcon;

    // Shipping
    document.getElementById('shipping').innerHTML =
      signals.hasShippingInfo ? checkIcon : crossIcon;

    // Urgency
    document.getElementById('urgency').innerHTML =
      signals.hasUrgencyLanguage ? warnIcon : checkIcon;

    // Payment Risk - derived from multiple signals (better indicator)
    // hasSecurePayment is most important, then contact info, then default to high
    let paymentRiskLevel = 'High'; // Default risk level
    if (signals.hasSecurePayment && signals.hasReturnPolicy && signals.hasAboutUs) {
      paymentRiskLevel = 'Low';
    } else if (signals.hasContactInfo && signals.hasReturnPolicy) {
      paymentRiskLevel = 'Medium';
    }
    
    const paymentRiskElement = document.getElementById('payment-risk');
    paymentRiskElement.textContent = paymentRiskLevel;
    paymentRiskElement.className = `risk-${paymentRiskLevel.toLowerCase()}`;

    // Payment Reasons
    const paymentReasons = [];
    if (!signals.hasSecurePayment) paymentReasons.push('No trusted payment gateway detected');
    if (!signals.hasContactInfo) paymentReasons.push('No contact information for support');
    document.getElementById('payment-reasons').innerHTML = paymentReasons.length > 0
      ? paymentReasons.map(r => `<div>• ${r}</div>`).join('')
      : '<div>Payment appears secure</div>';

    // Risk Score
    document.getElementById('probability').textContent = `${riskScore}%`;

    const riskLevelElement = document.getElementById('risk-level');
    riskLevelElement.textContent = riskLevel;
    riskLevelElement.className = `risk-${riskLevel.toLowerCase()}`;

    // Generate context-aware reasons based on page type and signals
    const reasons = generateContextualReasons(pageType, signals, urlRiskLevel, riskScore, paymentRiskLevel);
    
    document.getElementById('reasons-list').innerHTML = reasons.length > 0
      ? reasons.map(r => `<li>${r}</li>`).join('')
      : '<li>✓ All safety checks passed</li>';

    resultsElement.classList.remove('results-hidden');

    // ---------- SAFE SHOPPING MODE WITH CONTEXT INDICATORS ----------
    
    // Update checklist based on page type
    updateChecklist(pageType, signals, paymentRiskLevel, riskLevel);
    
    // Update advice with context-specific message
    const adviceBox = document.getElementById('safe-advice');
    adviceBox.innerHTML = recommendation;

    // Add scan timestamp
    const timestamp = new Date().toLocaleTimeString();
    adviceBox.innerHTML += `<br><small style="color:#999;display:block;margin-top:4px;">Scanned at ${timestamp}</small>`;
  }

  // ---------- CONTEXT-AWARE CHECKLIST ----------
  function updateChecklist(pageType, signals, paymentRisk, riskLevel) {
    const returnItem = document.getElementById('check-return');
    const contactItem = document.getElementById('check-contact');
    const paymentItem = document.getElementById('check-payment');
    const urgencyItem = document.getElementById('check-urgency');
    
    // SVG icons
    const checkIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>';
    const crossIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    const warnIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    
    // Return Policy
    if (signals.hasReturnPolicy) {
      returnItem.innerHTML = checkIcon + ' Return policy found';
      returnItem.className = 'safe-good';
    } else {
      returnItem.innerHTML = crossIcon + ' Return policy missing';
      returnItem.className = 'safe-bad';
    }
    
    // Contact Info
    if (signals.hasContactInfo) {
      contactItem.innerHTML = checkIcon + ' Contact information available';
      contactItem.className = 'safe-good';
    } else {
      contactItem.innerHTML = crossIcon + ' Contact information missing';
      contactItem.className = 'safe-bad';
    }
    
    // Payment Safety - More important for checkout/product
    if (pageType === 'Checkout' || pageType === 'Product') {
      if (paymentRisk === 'Low') {
        paymentItem.innerHTML = checkIcon + ' Secure payment options';
        paymentItem.className = 'safe-good';
      } else if (paymentRisk === 'Medium') {
        paymentItem.innerHTML = warnIcon + ' Verify payment method';
        paymentItem.className = 'safe-warn';
      } else {
        paymentItem.innerHTML = crossIcon + ' Risky payment detected';
        paymentItem.className = 'safe-bad';
      }
    } else {
      paymentItem.innerHTML = signals.hasContactInfo ? checkIcon + ' Payment methods listed' : warnIcon + ' Check payment options';
      paymentItem.className = signals.hasContactInfo ? 'safe-good' : 'safe-warn';
    }
    
    // Urgency Pressure
    if (signals.urgencyLanguage) {
      urgencyItem.innerHTML = crossIcon + ' Urgency pressure detected';
      urgencyItem.className = 'safe-bad';
    } else {
      urgencyItem.innerHTML = checkIcon + ' No pressure tactics';
      urgencyItem.className = 'safe-good';
    }
  }

  // ---------- CHAT ANALYSIS LOGIC ----------
  function analyzeChatMessages(text) {
    // Keyword rules (existing)
    let score = 0;
    let reasons = [];

    const rules = [
      { keyword: 'pay now', reason: 'Pressure to pay immediately', points: 20 },
      { keyword: 'only prepaid', reason: 'Refusal of COD', points: 20 },
      { keyword: 'no cod', reason: 'COD explicitly denied', points: 20 },
      { keyword: 'last piece', reason: 'False scarcity tactic', points: 10 },
      { keyword: 'offer ends', reason: 'Urgency manipulation', points: 10 },
      { keyword: 'whatsapp', reason: 'Moving conversation off platform', points: 15 },
      { keyword: 'trust me', reason: 'Emotional manipulation', points: 10 },
      { keyword: 'direct transfer', reason: 'Bank transfer request - high risk', points: 25 },
      { keyword: 'gpay', reason: 'Direct payment request - no buyer protection', points: 15 },
      { keyword: 'phone pe', reason: 'Direct payment request - no buyer protection', points: 15 },
      { keyword: 'upi', reason: 'Check UPI ID carefully before sending money', points: 10 }
    ];

    rules.forEach(rule => {
      if (text.includes(rule.keyword)) {
        score += rule.points;
        reasons.push(rule.reason);
      }
    });

    // NEW: AI Sentiment Analysis  
    const sentiment = MLUtils.sentimentScore(text);
    const sentimentLevel = sentiment > 0.2 ? 'Positive' : sentiment < -0.2 ? 'Negative' : 'Neutral';
    
    if (sentiment < -0.2) {
      score += 25; // Negative sentiment = high scam risk
      reasons.push(`AI Sentiment: ${sentimentLevel} (${Math.round(sentiment * 100)}%) - suspicious tone`);
    }

    let level = 'Low';
    if (score >= 30) level = 'Medium';
    if (score >= 60) level = 'High';

    return { level, reasons, sentiment, sentimentLevel };
  }

  // ---------- DISPLAY CHAT RESULT (Enhanced) ----------
  function displayChatResult(result) {
    document.getElementById('chat-risk').textContent = result.level;
    document.getElementById('chat-risk').className = `risk-${result.level.toLowerCase()}`;

    // NEW: Sentiment Display
    document.getElementById('chat-sentiment').textContent = result.sentimentLevel;
    const sentimentColor = result.sentiment > 0.2 ? '#22c55e' : result.sentiment < -0.2 ? '#dc2626' : '#64748b';
    document.getElementById('chat-sentiment').style.color = sentimentColor;

    document.getElementById('chat-reasons').innerHTML =
      result.reasons.map(r => `<li>${r}</li>`).join('');

    chatResult.classList.add('active');
  }

  // ---------- DISPLAY CHAT RESULT ----------
  function displayChatResult(result) {
    document.getElementById('chat-risk').textContent = result.level;
    document.getElementById('chat-risk').className =
      `risk-${result.level.toLowerCase()}`;

    document.getElementById('chat-reasons').innerHTML =
      result.reasons.map(r => `<li>${r}</li>`).join('');

    chatResult.classList.add('active');
  }

<<<<<<< HEAD
>>>>>>> origin/master
=======
>>>>>>> 77e72c9f4ba7df703ffc2fdb1d304702c7f942b2
});
