// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['paywalledDomains', 'enabled'], (result) => {
    document.getElementById('enabled').checked = result.enabled !== false;

    if (result.paywalledDomains) {
      document.getElementById('domains').value = result.paywalledDomains.join('\n');
    }
  });
});

// Save settings
document.getElementById('save').addEventListener('click', () => {
  const enabled = document.getElementById('enabled').checked;
  const domainsText = document.getElementById('domains').value;

  // Parse domains, filter empty lines and trim whitespace
  const domains = domainsText
    .split('\n')
    .map(d => d.trim().toLowerCase())
    .filter(d => d.length > 0);

  chrome.storage.sync.set({ paywalledDomains: domains, enabled }, () => {
    const status = document.getElementById('status');
    status.classList.add('show');
    setTimeout(() => status.classList.remove('show'), 2000);
  });
});

// Also save on toggle change
document.getElementById('enabled').addEventListener('change', (e) => {
  chrome.storage.sync.set({ enabled: e.target.checked });
});
