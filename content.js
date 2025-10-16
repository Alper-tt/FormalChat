function parseShortcut(s = "Alt+Shift+U") {
  const parts = s.toLowerCase().split("+").map(p => p.trim());
  return {
    alt: parts.includes("alt") || parts.includes("option"),
    shift: parts.includes("shift"),
    ctrl: parts.includes("ctrl") || parts.includes("control"),
    meta: parts.includes("cmd") || parts.includes("command") || parts.includes("meta"),
    key: parts.at(-1).length === 1 ? parts.at(-1) : (parts.find(p => p.length === 1) || "u")
  };
}
let currentShortcut = parseShortcut("Alt+Shift+U");
chrome.storage.local.get(["shortcut"], v => currentShortcut = parseShortcut(v.shortcut || "Alt+Shift+U"));
chrome.storage.onChanged.addListener(ch => { if (ch.shortcut) currentShortcut = parseShortcut(ch.shortcut.newValue); });

function matchShortcut(e, sc) {
  return (!!e.altKey===!!sc.alt) && (!!e.shiftKey===!!sc.shift) && (!!e.ctrlKey===!!sc.ctrl) && (!!e.metaKey===!!sc.meta) && (e.key.toLowerCase()===sc.key);
}

document.addEventListener("keydown", (e) => {
  if (matchShortcut(e, currentShortcut)) { e.preventDefault(); openUI(); }
});

function guessMode() {
  const h = location.host.toLowerCase();
  if (h.includes("mail.google.com") || h.includes("outlook.") || h.includes("yahoo.com")) return "email";
  if (h.includes("slack.com") || h.includes("teams.microsoft.com") || h.includes("discord.com") || h.includes("chat.google.com")) return "chat";
  return "email";
}

let mountEl = null;
let wired = false;

async function openUI() {
  const sel = window.getSelection().toString();

  if (!mountEl) {
    mountEl = document.createElement("div");
    mountEl.id = "kz-mount";
    mountEl.style.zIndex = "2147483646";
    document.documentElement.appendChild(mountEl);

    // Load HTML template from extension
    const url = chrome.runtime.getURL("content.html");
    const html = await fetch(url).then(r => r.text()).catch(()=>null);
    if (!html) return;

    mountEl.innerHTML = html;

    wireUI();
  }

  const backdrop = document.getElementById("kz-backdrop");
  const orig = document.getElementById("kz-orig");
  const sugg = document.getElementById("kz-suggestion");
  const loading = document.getElementById("kz-loading");

  if (sel) orig.value = sel;
  sugg.value = "";
  loading.style.display = "inline-flex";
  backdrop.style.display = "block";

  startGenerate();
}

function wireUI() {
  if (wired) return;
  wired = true;

  const backdrop = document.getElementById("kz-backdrop");
  const cancel = document.getElementById("kz-cancel");
  const copyBtn = document.getElementById("kz-copy");
  const insertBtn = document.getElementById("kz-insert");
  const genBtn = document.getElementById("kz-generate");

  cancel.addEventListener("click", () => { backdrop.style.display = "none"; });
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.style.display = "none"; });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") backdrop.style.display = "none";
  });

  copyBtn.addEventListener("click", () => {
    const text = (document.getElementById("kz-suggestion").value || "");
    navigator.clipboard.writeText(text);
  });

  insertBtn.addEventListener("click", () => {
    const text = (document.getElementById("kz-suggestion").value || "");
    insertIntoFocused(text);
    backdrop.style.display = "none";
  });

  genBtn.addEventListener("click", () => startGenerate());
}

function startGenerate() {
  const orig = document.getElementById("kz-orig");
  const draft = document.getElementById("kz-draft");
  const loading = document.getElementById("kz-loading");
  const suggestion = document.getElementById("kz-suggestion");

  const original = (orig?.value || "").trim();
  const userReply = (draft?.value || "").trim();
  if (!original) { alert("Gelen mesaj boş olamaz"); return; }

  loading.style.display = "inline-flex";
  suggestion.value = "";

  chrome.storage.local.get(["lang","tone","mode"], (cfg) => {
    const lang = cfg?.lang || "Turkish";
    const tone = cfg?.tone || "formal";
    const mode = cfg?.mode || guessMode();

    try {
      chrome.runtime.sendMessage({ type: "REWRITE", original, userReply, lang, tone, mode });
    } catch (e) {
      loading.style.display = "none";
      console.error("sendMessage failed:", e);
    }
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "REWRITE_RESULT") return;
  const loading = document.getElementById("kz-loading");
  const suggestion = document.getElementById("kz-suggestion");
  if (loading) loading.style.display = "none";
  if (suggestion) suggestion.value = msg.text || "(boş)";
});

function insertIntoFocused(text) {
  const el = document.activeElement;
  if (!el) return;
  if (el.isContentEditable) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    sel.deleteFromDocument();
    sel.getRangeAt(0).insertNode(document.createTextNode(text));
  } else if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
