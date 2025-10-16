const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function buildPrompt(original, userReply, lang, tone, mode = "email") {
  const common = `
You are an expert corporate communications assistant.

Original message:
"""${original}"""

User's intended reply:
"""${userReply}"""

Language: ${lang}
Requested tone: ${tone}
Keep the user's core intent exactly the same. Use modern, clear corporate language. Avoid slang and filler.
`.trim();

  if (mode === "chat") {
    return `
${common}

Task:
Rewrite the user's reply as a professional chat response.

Chat-specific rules:
- Length: do NOT be too short; write a single paragraph of 1–3 concise sentences (never a one-liner).
- Greetings handling:
  - If the original message OR the user's reply starts with a greeting (e.g., "Merhaba", "Selam", "Hello", "Hi"), include a brief matching greeting once (e.g., "Merhaba," or "Hello,") and then continue with the answer.
  - If neither includes a greeting, do NOT add any greeting.
- Do not add a sign-off or signature.
- Be clear and actionable; if next steps exist, state them briefly.
- Keep the tone ${tone} and the language ${lang}.

Return only the rewritten message (one paragraph), no explanations.
`.trim();
  }

  return `
${common}

Task:
Rewrite the user's reply as a professional email response.

Email-specific rules:
- Use a warm, respectful, confident tone (not robotic).
- 1–2 short paragraphs (avoid redundancy).
- Greetings/closings:
  - Add a greeting ("Merhaba <İsim>," / "Hello,") if context suggests an email reply.
  - Add a brief closing only if natural (e.g., "İyi çalışmalar dilerim." / "Best regards,").
- If timelines are mentioned, state them clearly without overcommitting.
- Keep it concise and polite.

Return only the rewritten message, no explanations.
`.trim();
}



chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.type !== "REWRITE") return;
  const { apiKey } = await chrome.storage.local.get(["apiKey"]);
  if (!apiKey) {
    chrome.tabs.sendMessage(sender.tab.id, {type:"REWRITE_RESULT", text:"API key eksik"});
    return;
  }
  const body = {
    model: "openai/gpt-oss-120b",
    messages: [{ role: "user", content: buildPrompt(msg.original, msg.userReply || "", msg.lang || "Turkish", msg.tone || "formal", msg.mode || "email") }],
    temperature: 0.3,
    max_completion_tokens: 512
  };
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content || "(boş)";
    chrome.tabs.sendMessage(sender.tab.id, {type:"REWRITE_RESULT", text});
  } catch (e) {
    chrome.tabs.sendMessage(sender.tab.id, {type:"REWRITE_RESULT", text:`Hata: ${e.message}`});
  }
});
