document.addEventListener("DOMContentLoaded", () => {
  const els = {
    apiKey: document.getElementById('apiKey'),
    lang: document.getElementById('lang'),
    tone: document.getElementById('tone'),
    shortcut: document.getElementById('shortcut'),
    mode: document.getElementById('mode'),
    save: document.getElementById('save'),
    openPanel: document.getElementById('openPanel')
  };

  chrome.storage.local.get(["apiKey", "lang", "tone", "shortcut"], v => {
    if (v.apiKey) els.apiKey.value = v.apiKey;
    if (v.lang) els.lang.value = v.lang;
    if (v.tone) els.tone.value = v.tone;
    els.shortcut.value = v.shortcut || "Alt+Shift+U";
    els.mode.value = v.mode || "email";
  });

  els.save.onclick = () => {
    chrome.storage.local.set({
      apiKey: els.apiKey.value.trim(),
      lang: els.lang.value,
      tone: els.tone.value,
      shortcut: els.shortcut.value.trim() || "Alt+Shift+U",
      mode: els.mode.value
    }, () => alert("Kaydedildi"));
  };

  els.openPanel.onclick = async () => {
    const url = chrome.runtime.getURL("panel.html");
    try {
      if (chrome.sidePanel?.setOptions && chrome.sidePanel?.open) {
        const win = await chrome.windows.getCurrent();
        await chrome.sidePanel.setOptions({ path: "panel.html", enabled: true });
        await chrome.sidePanel.open({ windowId: win.id });
      } else {
        chrome.tabs.create({ url });
      }
    } catch {
      chrome.tabs.create({ url });
    }
  };
});
