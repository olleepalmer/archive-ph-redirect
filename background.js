// Default list of paywalled domains
const DEFAULT_DOMAINS = [
  'wsj.com',
  'nytimes.com',
  'washingtonpost.com',
  'ft.com',
  'economist.com',
  'bloomberg.com',
  'businessinsider.com',
  'theatlantic.com',
  'newyorker.com',
  'wired.com',
  'thetimes.co.uk',
  'telegraph.co.uk',
  'hbr.org',
  'barrons.com',
  'seekingalpha.com'
];

const ARCHIVE_DOMAINS = ['archive.ph', 'archive.is', 'archive.today'];

// Initialize storage and context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['paywalledDomains', 'enabled'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Storage error:', chrome.runtime.lastError);
      return;
    }

    const updates = {};
    if (!result.paywalledDomains) {
      updates.paywalledDomains = DEFAULT_DOMAINS;
    }
    if (result.enabled === undefined) {
      updates.enabled = true;
    }
    if (Object.keys(updates).length > 0) {
      chrome.storage.sync.set(updates);
    }
  });

  // Create context menu on install (not on every service worker restart)
  chrome.contextMenus.create({
    id: 'archive-page',
    title: 'View on archive.ph',
    contexts: ['page']
  });
});

// Check if URL matches a paywalled domain
function isPaywalledSite(url, domains) {
  try {
    const hostname = new URL(url).hostname;
    return domains.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

// Check if URL is an archive site
function isArchiveSite(url) {
  try {
    const hostname = new URL(url).hostname;
    return ARCHIVE_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

// Check if URL is a deeplink (not just homepage)
function isDeeplink(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    // Skip if it's just the homepage (/, /index.html, etc.)
    if (path === '/' || path === '' || path === '/index.html' || path === '/index.htm') {
      return false;
    }
    // Skip common non-article paths
    const skipPaths = ['/login', '/signin', '/signup', '/register', '/subscribe', '/account', '/search'];
    if (skipPaths.some(p => path.toLowerCase().startsWith(p))) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Listen for navigation events
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only handle main frame navigation
  if (details.frameId !== 0) return;

  const url = details.url;

  // Skip if already on archive site
  if (isArchiveSite(url)) {
    return;
  }

  // Get settings
  const result = await chrome.storage.sync.get(['paywalledDomains', 'enabled']);
  if (chrome.runtime.lastError) {
    console.error('Storage error:', chrome.runtime.lastError);
    return;
  }

  if (!result.enabled) return;

  const domains = result.paywalledDomains || DEFAULT_DOMAINS;

  if (isPaywalledSite(url, domains) && isDeeplink(url)) {
    // Redirect to archive.ph (no encoding - archive.ph expects raw URL)
    const archiveUrl = 'https://archive.ph/' + url;
    chrome.tabs.update(details.tabId, { url: archiveUrl });
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'archive-page' && tab?.url && tab?.id) {
    const archiveUrl = 'https://archive.ph/' + tab.url;
    chrome.tabs.update(tab.id, { url: archiveUrl });
  }
});
