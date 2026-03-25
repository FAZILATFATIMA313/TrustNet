/**
 * TrustNet Settings Page
 * Enhanced with proper error handling and validation
 * @version 2.0
 */

document.addEventListener('DOMContentLoaded', async function() {
  try {
    Logger.info('Settings page loaded');
    await loadStatistics();
    await loadPermissions();
    await loadSettings();
    setupEventListeners();
  } catch (e) {
    Logger.error('Settings initialization failed', { error: e.message });
    showError('Failed to load settings. Please refresh the page.');
  }
});

// ==================== LOAD STATISTICS ====================
async function loadStatistics() {
  try {
    const data = await StorageUtils.get(['scan_stats', 'site_permissions', 'page_navigation_history']);
    
    const stats = data.scan_stats || { total: 0, high_risk: 0, medium_risk: 0, low_risk: 0 };
    const permissions = data.site_permissions || {};

    // Count general permissions (exclude checkout)
    const generalPermissions = Object.entries(permissions).filter(([key]) => !key.startsWith('checkout_'));
    const sitesCount = generalPermissions.length;

    document.getElementById('total-scans').textContent = stats.total || 0;
    document.getElementById('high-risk-detected').textContent = stats.high_risk || 0;
    document.getElementById('sites-protected').textContent = sitesCount;

    Logger.debug('Statistics loaded', { total: stats.total, highRisk: stats.high_risk, sites: sitesCount });
  } catch (e) {
    Logger.error('Failed to load statistics', { error: e.message });
    showError('Failed to load statistics');
  }
}

// ==================== LOAD PERMISSIONS ====================
async function loadPermissions() {
  try {
    const data = await StorageUtils.get(['site_permissions', 'permission_denied_dates', 'page_navigation_history']);
    const permissions = data.site_permissions || {};
    const deniedDates = data.permission_denied_dates || {};
    const navigationHistory = data.page_navigation_history || {};
    const listElement = document.getElementById('permission-list');

    const generalPermissions = {};
    const checkoutPermissions = {};

    for (const [key, value] of Object.entries(permissions)) {
      if (key.startsWith('checkout_')) {
        const domain = key.replace('checkout_', '');
        checkoutPermissions[domain] = value;
      } else {
        generalPermissions[key] = value;
      }
    }

    if (Object.keys(generalPermissions).length === 0 && Object.keys(checkoutPermissions).length === 0) {
      listElement.innerHTML = '<li class="empty-state"><div class="empty-state-icon">🔍</div><p>No site permissions yet. Visit a website to start scanning.</p></li>';
      return;
    }

    listElement.innerHTML = '';

    for (const domain of Object.keys(generalPermissions)) {
      const status = generalPermissions[domain];
      const li = document.createElement('li');
      li.className = 'permission-item';

      const statusClass = getStatusClass(status);
      const statusText = getStatusText(status);
      const hasCheckoutPerm = checkoutPermissions[domain] === 'always_allow_checkout';

      let cooldownText = '';
      if (status === 'denied') {
        const deniedDate = deniedDates[domain];
        if (deniedDate) {
          const daysRemaining = Math.max(0, 30 - TimeUtils.getDaysSince(deniedDate));
          if (daysRemaining > 0) {
            cooldownText = `<span class="cooldown-badge">${daysRemaining} days remaining</span>`;
          }
        }
      }

      const navigationData = navigationHistory[domain];
      const visitInfo = navigationData ? `<span class="visit-badge">${navigationData.totalVisits} visits</span>` : '';

      li.innerHTML = `
        <div class="permission-info">
          <h4>${StringUtils.escapeHtml(domain)}</h4>
          <div class="permission-meta">
            <span class="status-badge ${statusClass}">${statusText}</span>
            ${hasCheckoutPerm ? '<span class="checkout-badge">✓ Checkout</span>' : ''}
            ${visitInfo}
            ${cooldownText}
          </div>
        </div>
        <div class="permission-actions">
          <button class="btn btn-secondary" data-domain="${StringUtils.escapeHtml(domain)}" data-action="toggle-checkout">
            ${hasCheckoutPerm ? 'Revoke Checkout' : 'Allow Checkout'}
          </button>
          <button class="btn btn-danger" data-domain="${StringUtils.escapeHtml(domain)}" data-action="revoke">Revoke All</button>
        </div>
      `;

      listElement.appendChild(li);
    }

    // Add event listeners
    document.querySelectorAll('[data-domain]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const domain = e.target.getAttribute('data-domain');
        const action = e.target.getAttribute('data-action');
        
        try {
          if (action === 'revoke') {
            await revokePermission(domain);
          } else if (action === 'toggle-checkout') {
            await toggleCheckoutPermission(domain);
          }
        } catch (err) {
          Logger.error('Action failed', { domain, action, error: err.message });
          showError(`Failed to ${action} for ${domain}`);
        }
      });
    });
  } catch (loadErr) {
    Logger.error('Failed to load permissions', { error: loadErr.message });
    showError('Failed to load permissions');
  }
}

// ==================== LOAD SETTINGS ====================
async function loadSettings() {
  try {
    const data = await StorageUtils.get('global_settings');
    const settings = data.global_settings || {
      auto_scan: true,
      show_safe_badge: true,
      checkout_confirm: true,
      logging_level: 1
    };

    updateToggle('toggle-auto-scan', settings.auto_scan);
    updateToggle('toggle-safe-badge', settings.show_safe_badge);
    updateToggle('toggle-checkout-confirm', settings.checkout_confirm);

    Logger.debug('Settings loaded', settings);
  } catch (e) {
    Logger.error('Failed to load settings', { error: e.message });
    showError('Failed to load settings');
  }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Toggle switches
  const toggles = [
    { id: 'toggle-auto-scan', key: 'auto_scan' },
    { id: 'toggle-safe-badge', key: 'show_safe_badge' },
    { id: 'toggle-checkout-confirm', key: 'checkout_confirm' }
  ];

  toggles.forEach(({ id, key }) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('click', async () => {
        try {
          await toggleSetting(key);
        } catch (e) {
          Logger.error('Failed to toggle setting', { key, error: e.message });
          showError(`Failed to update ${key}`);
        }
      });
    }
  });

  // Reset buttons
  const resetButtons = [
    { id: 'clear-all-permissions', action: clearAllPermissions },
    { id: 'reset-stats', action: resetStatistics },
    { id: 'reset-cache', action: clearScanCache },
    { id: 'reset-all', action: resetAllData }
  ];

  resetButtons.forEach(({ id, action }) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('click', action);
    }
  });
}

// ==================== SETTINGS MANAGEMENT ====================
async function toggleSetting(key) {
  if (!key) {
    throw new TrustNetError('Invalid setting key', 'INVALID_KEY');
  }

  const data = await StorageUtils.get('global_settings');
  const settings = data.global_settings || {};

  settings[key] = !settings[key];

  await StorageUtils.set({ global_settings: settings });

  const toggleMap = {
    'auto_scan': 'toggle-auto-scan',
    'show_safe_badge': 'toggle-safe-badge',
    'checkout_confirm': 'toggle-checkout-confirm'
  };

  updateToggle(toggleMap[key], settings[key]);
  Logger.info('Setting toggled', { key, value: settings[key] });
  showSuccess(`${key} updated`);
}

function updateToggle(id, isActive) {
  const toggle = document.getElementById(id);
  if (!toggle) return;

  if (isActive) {
    toggle.classList.add('active');
  } else {
    toggle.classList.remove('active');
  }
}

// ==================== PERMISSION MANAGEMENT ====================
async function toggleCheckoutPermission(domain) {
  if (!Validator.isValidDomain(domain)) {
    throw new TrustNetError('Invalid domain', 'INVALID_DOMAIN');
  }

  const data = await StorageUtils.get('site_permissions');
  const permissions = data.site_permissions || {};
  const checkoutKey = 'checkout_' + domain;

  if (permissions[checkoutKey] === 'always_allow_checkout') {
    delete permissions[checkoutKey];
  } else {
    permissions[checkoutKey] = 'always_allow_checkout';
  }

  await StorageUtils.set({ site_permissions: permissions });
  await loadPermissions();
  Logger.info('Checkout permission toggled', { domain });
  showSuccess(`Checkout permission updated for ${domain}`);
}

async function revokePermission(domain) {
  if (!Validator.isValidDomain(domain)) {
    throw new TrustNetError('Invalid domain', 'INVALID_DOMAIN');
  }

  const data = await StorageUtils.get(['site_permissions', 'permission_denied_dates']);
  const permissions = data.site_permissions || {};
  const deniedDates = data.permission_denied_dates || {};

  delete permissions[domain];
  delete permissions['checkout_' + domain];
  delete deniedDates[domain];

  await StorageUtils.set({
    site_permissions: permissions,
    permission_denied_dates: deniedDates
  });

  await loadPermissions();
  await loadStatistics();
  Logger.info('Permission revoked', { domain });
  showSuccess(`Permission revoked for ${domain}`);
}

// ==================== DATA RESET FUNCTIONS ====================
async function clearAllPermissions() {
  if (!confirm('Are you sure you want to clear all site permissions? You will be asked again when visiting sites.')) {
    return;
  }

  try {
    await StorageUtils.set({
      site_permissions: {},
      permission_denied_dates: {}
    });
    await loadPermissions();
    await loadStatistics();
    Logger.info('All permissions cleared');
    showSuccess('All permissions cleared');
  } catch (e) {
    Logger.error('Failed to clear permissions', { error: e.message });
    showError('Failed to clear permissions');
  }
}

async function resetStatistics() {
  if (!confirm('Reset all scan statistics?')) {
    return;
  }

  try {
    await StorageUtils.set({
      scan_stats: { total: 0, high_risk: 0, medium_risk: 0, low_risk: 0 }
    });
    await loadStatistics();
    Logger.info('Statistics reset');
    showSuccess('Statistics reset');
  } catch (e) {
    Logger.error('Failed to reset statistics', { error: e.message });
    showError('Failed to reset statistics');
  }
}

async function clearScanCache() {
  if (!confirm('Clear all cached scan results?')) {
    return;
  }

  try {
    await StorageUtils.set({ scan_cache: {} });
    Logger.info('Scan cache cleared');
    showSuccess('Scan cache cleared');
  } catch (e) {
    Logger.error('Failed to clear cache', { error: e.message });
    showError('Failed to clear cache');
  }
}

async function resetAllData() {
  if (!confirm('WARNING: This will reset ALL TrustNet data including permissions, statistics, and settings. This cannot be undone. Continue?')) {
    return;
  }

  try {
    await StorageUtils.clear();
    Logger.info('All data reset');
    showSuccess('All data reset. Page will reload...');
    setTimeout(() => window.location.reload(), 1000);
  } catch (e) {
    Logger.error('Failed to reset all data', { error: e.message });
    showError('Failed to reset all data');
  }
}

// ==================== HELPER FUNCTIONS ====================
function getStatusClass(status) {
  const classes = {
    'always_allow': 'status-allowed',
    'allowed': 'status-allowed',
    'denied': 'status-denied',
    'granted': 'status-allowed',
    'ask': 'status-ask',
    'session': 'status-session'
  };
  return classes[status] || 'status-ask';
}

function getStatusText(status) {
  const texts = {
    'always_allow': 'Always Allow',
    'allowed': 'Allowed',
    'denied': 'Denied (30-day cooldown)',
    'granted': 'Granted',
    'ask': 'Ask First',
    'session': 'Session Only'
  };
  return texts[status] || 'Unknown';
}

// ==================== NOTIFICATION SYSTEM ====================
function showError(message) {
  showNotification(message, 'error');
}

function showSuccess(message) {
  showNotification(message, 'success');
}

function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-container') || createNotificationContainer();
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  container.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function createNotificationContainer() {
  const container = document.createElement('div');
  container.id = 'notification-container';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;
  document.body.appendChild(container);
  return container;
}
