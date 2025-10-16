document.addEventListener("DOMContentLoaded", () => {
  const out   = document.getElementById("out");
  const orig  = document.getElementById("orig");
  const draft = document.getElementById("draft");

  document.getElementById("gen").onclick = () => {
    const original = orig.value.trim();
    const reply = draft.value.trim();
    if (!original) {
      out.textContent = "Lütfen gelen mesajı yazın.";
      return;
    }

    out.textContent = "Üretiliyor…";

    chrome.runtime.sendMessage({
      type: "REWRITE",
      original: original,
      userReply: reply,
      lang: "Turkish",
      tone: "formal",
      mode: pmode.value || "email"
    });
  };

  document.getElementById("copy").onclick = () => {
    const text = out.textContent || "";
    navigator.clipboard.writeText(text);
  };

  document.getElementById("paste").onclick = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, {
      type: "REWRITE_RESULT",
      text: out.textContent || "",
    });
  };

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "REWRITE_RESULT") {
      out.textContent = msg.text || "(boş)";
    }
  });
});
