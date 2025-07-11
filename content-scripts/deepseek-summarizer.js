// Utility: wait for an element to appear in the DOM within a timeout
const waitForElement = (selector, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        resolve(el);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error(`Element not found: ${selector}`));
      }
    }, 100);
  });
};

/**
 * Part 1 – Send the prompt and wait until DeepSeek finishes responding.
 * Returns the HTMLElement containing the freshly generated answer.
 * @param {string} prompt
 * @returns {Promise<HTMLElement>}
 */
export const sendPromptAndWaitForResponse = async (prompt) => {
  // Attempt to start a fresh conversation (if the button exists)
  try {
    const newChatBtn = document.evaluate(
      "//div[normalize-space(text())='New chat']",
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    if (newChatBtn) {
      newChatBtn.click();
      // allow DOM to settle
      await new Promise((r) => setTimeout(r, 300));
    }
  } catch {
    /* ignore – safe fallback */
  }

  // Type the prompt
  const textarea = await waitForElement("textarea#chat-input");
  textarea.value = prompt;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));

  // Click the send button
  const sendButton = await waitForElement(
    'div[role="button"][aria-disabled="false"]:has(svg)'
  );
  sendButton.click();

  // Keep track of existing messages so we can identify the new one.
  const initialMsgCount = document.querySelectorAll("div.ds-markdown").length;
  let lastMutationTs = Date.now();

  const observer = new MutationObserver(() => {
    lastMutationTs = Date.now();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Wait until the DOM is stable for >2 s (heuristic for “response complete”).
  while (true) {
    await new Promise((r) => setTimeout(r, 500));
    if (Date.now() - lastMutationTs > 2000) {
      observer.disconnect();

      const messages = document.querySelectorAll("div.ds-markdown");
      if (messages.length <= initialMsgCount) {
        throw new Error("No new message appeared.");
      }

      // Collect markdown from all messages and inject the download button
      const combinedMarkdown = gatherMarkdown();
      injectDownloadButton(combinedMarkdown);

      // Notify background script that DeepSeek has finished responding
      try {
        chrome.runtime?.sendMessage({ type: "deepseek_response_complete" });
      } catch {
        /* best-effort; ignore in content scripts without extension context */
      }

      return; // nothing to return – function resolves when complete
    }
  }
};

/**
 * Minimal DeepSeek-specific HTML → Markdown converter.
 * @param {HTMLElement} root
 * @returns {string}
 */
const htmlToMarkdown = (root) => {
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const tag = node.tagName.toLowerCase();
    const children = Array.from(node.childNodes).map(walk).join("");

    switch (tag) {
      case "h1":
        return `# ${children}\n\n`;
      case "h2":
        return `## ${children}\n\n`;
      case "h3":
        return `### ${children}\n\n`;
      case "h4":
        return `#### ${children}\n\n`;
      case "h5":
        return `##### ${children}\n\n`;
      case "h6":
        return `###### ${children}\n\n`;
      case "p":
        return `${children}\n\n`;
      case "strong":
        return `**${children}**`;
      case "em":
      case "i":
        return `*${children}*`;
      case "ul":
      case "ol":
        return `\n${children}\n`;
      case "li":
        return `- ${children}\n`;
      case "hr":
        return `\n---\n\n`;
      case "br":
        return `  \n`;
      default:
        return children;
    }
  };

  let md = walk(root);
  // collapse >2 consecutive blank lines into exactly two
  md = md.replace(/\n{3,}/g, "\n\n").trim();
  return md;
};

// Gather markdown from every DeepSeek response currently in the DOM
const gatherMarkdown = () => {
  const messageEls = document.querySelectorAll("div.ds-markdown");
  if (!messageEls.length) return "";
  const mdParts = Array.from(messageEls).map(htmlToMarkdown);
  return mdParts.join("\n\n---\n\n").trim();
};

// Create / update a floating download button that saves the markdown to a file
const injectDownloadButton = (markdown) => {
  if (!markdown) return;
  const existing = document.getElementById("deepseek-md-download");
  if (existing) {
    // Update data payload in case content changed
    existing.dataset.markdown = markdown;
    return;
  }

  const btn = document.createElement("button");
  btn.id = "deepseek-md-download";
  btn.textContent = "Download Markdown";
  btn.dataset.markdown = markdown;
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: 9999,
    padding: "10px 16px",
    backgroundColor: "#4688F1",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  });

  btn.addEventListener("click", () => {
    const data = btn.dataset.markdown || "";
    const titleElement = document.querySelector("div.d8ed659a");
    const filenameBase = titleElement
      ? titleElement.innerText
          .trim()
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()
      : "summary";
    const blob = new Blob([data], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  document.body.appendChild(btn);
};

/**
 * Part 2 – Derive filename from the title element and convert the response to Markdown.
 * @param {HTMLElement} responseEl – the element returned from sendPromptAndWaitForResponse
 * @returns {{ filename: string, markdown: string }}
 */
export const getFilenameAndMarkdown = (responseEl) => {
  const titleElement = document.querySelector("div.d8ed659a");
  const filename = titleElement
    ? titleElement.innerText
        .trim()
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()
    : "summary";

  const markdown = htmlToMarkdown(responseEl);

  return { filename, markdown };
};

export const getSummaryFromDeepseek = async (prompt) => {
  // Self-contained helpers so the function works when serialized.
  const waitForElement = (selector, timeout = 10000) => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const iv = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(iv);
          resolve(el);
        } else if (Date.now() - start > timeout) {
          clearInterval(iv);
          reject(new Error(`Element not found: ${selector}`));
        }
      }, 100);
    });
  };

  // Minimal HTML→Markdown (subset)
  const htmlToMarkdown = (root) => {
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const tag = node.tagName.toLowerCase();
      const children = Array.from(node.childNodes).map(walk).join("");
      switch (tag) {
        case "h1":
          return `# ${children}\n\n`;
        case "h2":
          return `## ${children}\n\n`;
        case "h3":
          return `### ${children}\n\n`;
        case "h4":
          return `#### ${children}\n\n`;
        case "h5":
          return `##### ${children}\n\n`;
        case "h6":
          return `###### ${children}\n\n`;
        case "p":
          return `${children}\n\n`;
        case "strong":
          return `**${children}**`;
        case "em":
        case "i":
          return `*${children}*`;
        case "ul":
        case "ol":
          return `\n${children}\n`;
        case "li":
          return `- ${children}\n`;
        case "hr":
          return `\n---\n\n`;
        case "br":
          return `  \n`;
        default:
          return children;
      }
    };
    let md = walk(root);
    md = md.replace(/\n{3,}/g, "\n\n").trim();
    return md;
  };

  const gatherMarkdown = () => {
    const els = document.querySelectorAll("div.ds-markdown");
    if (!els.length) return "";
    return Array.from(els).map(htmlToMarkdown).join("\n\n---\n\n").trim();
  };

  const sendPrompt = async () => {
    // try new chat
    try {
      const btn = document.evaluate(
        "//div[normalize-space(text())='New chat']",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      if (btn) {
        btn.click();
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch {}

    const textarea = await waitForElement("textarea#chat-input");
    textarea.value = prompt;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    const sendBtn = await waitForElement(
      'div[role="button"][aria-disabled="false"]:has(svg)'
    );
    sendBtn.click();

    const initialCount = document.querySelectorAll("div.ds-markdown").length;
    let lastChange = Date.now();
    const obs = new MutationObserver(() => (lastChange = Date.now()));
    obs.observe(document.body, { childList: true, subtree: true });

    while (true) {
      await new Promise((r) => setTimeout(r, 500));
      if (Date.now() - lastChange > 2000) {
        obs.disconnect();
        if (
          document.querySelectorAll("div.ds-markdown").length <= initialCount
        ) {
          throw new Error("No new message appeared.");
        }
        return;
      }
    }
  };

  await sendPrompt();
  return gatherMarkdown();
};
