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

// Initialize storage with default domains
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['paywalledDomains', 'enabled'], (result) => {
    if (!result.paywalledDomains) {
      chrome.storage.sync.set({ paywalledDomains: DEFAULT_DOMAINS });
    }
    if (result.enabled === undefined) {
      chrome.storage.sync.set({ enabled: true });
    }
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

  // Skip if already on archive.ph
  if (url.includes('archive.ph') || url.includes('archive.is') || url.includes('archive.today')) {
    return;
  }

  // Get settings
  const { paywalledDomains, enabled } = await chrome.storage.sync.get(['paywalledDomains', 'enabled']);

  if (!enabled) return;

  const domains = paywalledDomains || DEFAULT_DOMAINS;

  if (isPaywalledSite(url, domains) && isDeeplink(url)) {
    // Redirect to archive.ph
    const archiveUrl = 'https://archive.ph/' + encodeURIComponent(url);
    chrome.tabs.update(details.tabId, { url: archiveUrl });
  }
});

// Add context menu to manually archive current page
chrome.contextMenus.create({
  id: 'archive-page',
  title: 'View on archive.ph',
  contexts: ['page']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'archive-page' && tab.url) {
    const archiveUrl = 'https://archive.ph/' + encodeURIComponent(tab.url);
    chrome.tabs.update(tab.id, { url: archiveUrl });
  }
});
