// popup.js

document.addEventListener('DOMContentLoaded', function () {

  // ---------- BASIC ELEMENTS ----------
  const currentUrlElement = document.getElementById('current-url');
  const scanButton = document.getElementById('scan-page');
  const resultsElement = document.getElementById('results');

  // ---------- CHAT ELEMENTS ----------
  const chatInput = document.getElementById('chat-input');
  const analyzeChatBtn = document.getElementById('analyze-chat');
  const chatResult = document.getElementById('chat-result');

  // ---------- LOAD CURRENT URL ----------
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    currentUrlElement.textContent = tabs[0].url;
  });

  // ---------- SCAN PAGE ----------
  scanButton.addEventListener('click', function () {
    scanButton.textContent = 'Scanning...';
    scanButton.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'scanPage' },
        function (response) {

          scanButton.textContent = 'Scan Page';
          scanButton.disabled = false;

          if (chrome.runtime.lastError || !response) {
            alert('Failed to scan page. Please refresh and try again.');
            return;
          }

          displayResults(response);
        }
      );
    });
  });

  // ---------- ANALYZE CHAT ----------
  analyzeChatBtn.addEventListener('click', function () {
    const chatText = chatInput.value.toLowerCase();

    if (!chatText.trim()) {
      alert('Please paste seller chat first.');
      return;
    }

    const chatAnalysis = analyzeChat(chatText);
    displayChatResult(chatAnalysis);
  });

  // ---------- DISPLAY PAGE RESULTS ----------
  function displayResults(response) {

    // Page Type
    document.getElementById('page-type').textContent = response.pageType;

    // URL Risk
    const urlRiskElement = document.getElementById('url-risk');
    urlRiskElement.textContent = response.urlRisk.level.toUpperCase();
    urlRiskElement.className = `risk-${response.urlRisk.level.toLowerCase()}`;

    document.getElementById('url-reasons').innerHTML =
      response.urlRisk.reasons.map(r => `<div>• ${r}</div>`).join('');

    // Content Signals
    document.getElementById('return-policy').innerHTML =
      response.contentSignals.hasReturnPolicy ? '✅' : '❌';

    document.getElementById('contact-info').innerHTML =
      response.contentSignals.hasContactInfo ? '✅' : '❌';

    document.getElementById('about-us').innerHTML =
      response.contentSignals.hasAboutUs ? '✅' : '❌';

    document.getElementById('shipping').innerHTML =
      response.contentSignals.hasShippingInfo ? '✅' : '❌';

    document.getElementById('urgency').innerHTML =
      response.contentSignals.urgencyLanguage ? '⚠️' : '✅';


    // Payment Risk
    const paymentRiskElement = document.getElementById('payment-risk');
    paymentRiskElement.textContent = response.paymentRisk.level;
    paymentRiskElement.className =
      `risk-${response.paymentRisk.level.toLowerCase()}`;

    document.getElementById('payment-reasons').innerHTML =
      response.paymentRisk.reasons.map(r => `<div>• ${r}</div>`).join('');


    // Risk Score
    document.getElementById('probability').textContent =
      `${response.riskResult.probability}%`;

    const riskLevelElement = document.getElementById('risk-level');
    riskLevelElement.textContent = response.riskResult.level;
    riskLevelElement.className = `risk-${response.riskResult.level.toLowerCase()}`;

    // Reasons
    document.getElementById('reasons-list').innerHTML =
      response.riskResult.reasons.map(r => `<li>${r}</li>`).join('');

    resultsElement.style.display = 'block';

// ---------- SAFE SHOPPING MODE WITH INDICATORS ----------

// Return Policy
const returnItem = document.getElementById('check-return');
if (response.contentSignals.hasReturnPolicy) {
  returnItem.textContent = '✅ Return policy found';
  returnItem.className = 'safe-good';
} else {
  returnItem.textContent = '❌ Return policy missing';
  returnItem.className = 'safe-bad';
}

// Contact Info
const contactItem = document.getElementById('check-contact');
if (response.contentSignals.hasContactInfo) {
  contactItem.textContent = '✅ Contact information available';
  contactItem.className = 'safe-good';
} else {
  contactItem.textContent = '❌ Contact information missing';
  contactItem.className = 'safe-bad';
}

// Payment Safety
const paymentItem = document.getElementById('check-payment');
if (response.paymentRisk.level === 'Low') {
  paymentItem.textContent = '✅ Payment method appears safe';
  paymentItem.className = 'safe-good';
} else if (response.paymentRisk.level === 'Medium') {
  paymentItem.textContent = '⚠️ Payment method needs caution';
  paymentItem.className = 'safe-warn';
} else {
  paymentItem.textContent = '❌ Payment method is risky';
  paymentItem.className = 'safe-bad';
}

// Urgency Pressure
const urgencyItem = document.getElementById('check-urgency');
if (response.contentSignals.urgencyLanguage) {
  urgencyItem.textContent = '❌ Urgency pressure detected';
  urgencyItem.className = 'safe-bad';
} else {
  urgencyItem.textContent = '✅ No urgency pressure detected';
  urgencyItem.className = 'safe-good';
}


// Advice message
const adviceBox = document.getElementById('safe-advice');

if (response.riskResult.level === 'High') {
  adviceBox.innerHTML =
    '⚠️ <strong>High Risk:</strong> Avoid payment until seller is verified. Ask for invoice, COD, or official website checkout.';
} else if (response.riskResult.level === 'Medium') {
  adviceBox.innerHTML =
    '⚠️ <strong>Caution:</strong> Verify seller details before proceeding. Prefer COD or platform payments.';
} else {
  adviceBox.innerHTML =
    '✅ <strong>Looks Safe:</strong> No major red flags detected. Continue with standard precautions.';
}

  }

  // ---------- CHAT ANALYSIS LOGIC ----------
  function analyzeChat(text) {
    let score = 0;
    let reasons = [];

    const rules = [
      { keyword: 'pay now', reason: 'Pressure to pay immediately', points: 20 },
      { keyword: 'only prepaid', reason: 'Refusal of COD', points: 20 },
      { keyword: 'no cod', reason: 'COD explicitly denied', points: 20 },
      { keyword: 'last piece', reason: 'False scarcity tactic', points: 10 },
      { keyword: 'offer ends', reason: 'Urgency manipulation', points: 10 },
      { keyword: 'whatsapp', reason: 'Moving conversation off platform', points: 15 },
      { keyword: 'trust me', reason: 'Emotional manipulation', points: 10 }
    ];

    rules.forEach(rule => {
      if (text.includes(rule.keyword)) {
        score += rule.points;
        reasons.push(rule.reason);
      }
    });

    let level = 'Low';
    if (score >= 30) level = 'Medium';
    if (score >= 60) level = 'High';

    return { level, reasons };
  }

  // ---------- DISPLAY CHAT RESULT ----------
  function displayChatResult(result) {
    document.getElementById('chat-risk').textContent = result.level;
    document.getElementById('chat-risk').className =
      `risk-${result.level.toLowerCase()}`;

    document.getElementById('chat-reasons').innerHTML =
      result.reasons.map(r => `<li>${r}</li>`).join('');

    chatResult.style.display = 'block';
  }

});
