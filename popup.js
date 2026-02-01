// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const currentUrlElement = document.getElementById('current-url');
  const scanButton = document.getElementById('scan-page');
  const resultsElement = document.getElementById('results');

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
});
