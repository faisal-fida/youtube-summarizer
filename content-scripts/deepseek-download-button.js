// Auto-injected content script – always present on chat.deepseek.com
(() => {
  // ---------- Helpers ----------
  /** Convert DeepSeek markup (HTML) into Markdown – basic subset */
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
    // collapse >2 blank lines
    md = md.replace(/\n{3,}/g, "\n\n").trim();
    return md;
  };

  /** Collect markdown from all DeepSeek messages on the page */
  const gatherMarkdown = () => {
    const els = document.querySelectorAll("div.ds-markdown");
    if (!els.length) return "";
    const mdParts = Array.from(els).map(htmlToMarkdown);
    return mdParts.join("\n\n---\n\n").trim();
  };

  /** Ensure a floating Download button exists & is updated with latest markdown */
  const injectDownloadButton = (markdown) => {
    const ID = "deepseek-md-download";
    let btn = document.getElementById(ID);

    if (!markdown) {
      // No content – hide existing button if any
      btn?.remove();
      return;
    }

    if (!btn) {
      btn = document.createElement("button");
      btn.id = ID;
      btn.textContent = "Download Markdown";
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
    }

    btn.dataset.markdown = markdown;
  };

  // Debounced updater to avoid spamming during fast mutations
  let updateScheduled = false;
  const scheduleUpdate = () => {
    if (updateScheduled) return;
    updateScheduled = true;
    setTimeout(() => {
      updateScheduled = false;
      const md = gatherMarkdown();
      injectDownloadButton(md);
    }, 300); // 300 ms debounce window
  };

  // Initial injection once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleUpdate);
  } else {
    scheduleUpdate();
  }

  // Observe future chat updates
  const observer = new MutationObserver(scheduleUpdate);
  observer.observe(document.body, { childList: true, subtree: true });
})();
