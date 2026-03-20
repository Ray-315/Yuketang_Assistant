const bridgeInput = document.getElementById("bridgeBaseUrl");
const selectorInput = document.getElementById("primarySelector");
const fallbackInput = document.getElementById("fallbackSelectors");
const anchorInput = document.getElementById("anchorTexts");
const hotkeysInput = document.getElementById("hotkeysEnabled");
const statusNode = document.getElementById("status");

load().catch((error) => {
  statusNode.textContent = String(error);
});

document.getElementById("saveButton").addEventListener("click", saveSettings);

async function load() {
  const stored = await chrome.storage.sync.get(["bridgeBaseUrl", "adapterProfiles", "hotkeysEnabled"]);
  const profile = stored.adapterProfiles?.[0] || DEFAULT_SETTINGS.adapterProfiles[0];
  bridgeInput.value = stored.bridgeBaseUrl || DEFAULT_SETTINGS.bridgeBaseUrl;
  selectorInput.value = profile.primarySelector;
  fallbackInput.value = (profile.fallbackSelectors || []).join("\n");
  anchorInput.value = (profile.anchorTexts || []).join("\n");
  hotkeysInput.checked = stored.hotkeysEnabled ?? DEFAULT_SETTINGS.hotkeysEnabled;
}

async function saveSettings() {
  const profile = {
    ...(DEFAULT_SETTINGS.adapterProfiles[0]),
    primarySelector: selectorInput.value.trim(),
    fallbackSelectors: fallbackInput.value.split("\n").map((item) => item.trim()).filter(Boolean),
    anchorTexts: anchorInput.value.split("\n").map((item) => item.trim()).filter(Boolean)
  };
  await chrome.storage.sync.set({
    bridgeBaseUrl: bridgeInput.value.trim(),
    adapterProfiles: [profile],
    hotkeysEnabled: hotkeysInput.checked
  });
  statusNode.textContent = "已保存";
}
