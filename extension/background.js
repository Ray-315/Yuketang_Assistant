chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(["bridgeBaseUrl", "adapterProfiles", "hotkeysEnabled"]);
  const next = {
    bridgeBaseUrl: current.bridgeBaseUrl ?? DEFAULT_SETTINGS.bridgeBaseUrl,
    adapterProfiles: current.adapterProfiles ?? DEFAULT_SETTINGS.adapterProfiles,
    hotkeysEnabled: current.hotkeysEnabled ?? DEFAULT_SETTINGS.hotkeysEnabled
  };
  await chrome.storage.sync.set(next);
});
