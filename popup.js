document.addEventListener("DOMContentLoaded", () => {
  const copyButton = document.getElementById("copyButton");
  const copyRawButton = document.getElementById("copyRawButton");
  const statusEl = document.getElementById("status");
  const charCountEl = document.getElementById("charCount");
  const promptTextarea = document.getElementById("promptTextarea");
  const includeTimestampsCheck = document.getElementById("includeTimestamps");
  const formatMarkdownCheck = document.getElementById("formatMarkdown");

  // Format the transcript data into markdown or plain text
  const formatTranscript = (transcriptData, options) => {
    let formattedText = "";
    transcriptData.forEach((item) => {
      if (item.type === "chapter") {
        if (options.formatMarkdown) {
          formattedText += `\n\n## ${item.text}\n`;
        } else {
          formattedText += `\n\nChapter: ${item.text}\n`;
        }
      } else if (item.type === "segment") {
        let line = "";
        if (options.includeTimestamps) {
          line += `[${item.timestamp}] `;
        }
        line += item.text;
        formattedText += line + (options.formatMarkdown ? "\n" : " ");
      }
    });
    return formattedText.trim();
  };

  // Shared function to fetch and process the transcript data
  const getAndProcessTranscript = async () => {
    setUiState(true, "Working..."); // Disable UI, show status

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.url || !tab.url.includes("youtube.com/watch")) {
      throw new Error("Not a YouTube video page.");
    }

    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    if (
      chrome.runtime.lastError ||
      !injectionResults ||
      !injectionResults.length
    ) {
      throw new Error("Failed to inject script.");
    }

    const { result } = injectionResults[0];
    if (result.error) {
      throw new Error(result.error);
    }

    const options = {
      includeTimestamps: includeTimestampsCheck.checked,
      formatMarkdown: formatMarkdownCheck.checked,
    };

    const transcriptText = formatTranscript(result.data, options);
    charCountEl.textContent = `${transcriptText.length} characters`;
    return transcriptText;
  };

  // Main "Copy with Prompt" button logic for the prompt
  copyButton.addEventListener("click", async () => {
    try {
      const transcriptText = await getAndProcessTranscript();
      const prefix = promptTextarea.value;
      const finalText = `${prefix}\n\n${transcriptText}`;

      await navigator.clipboard.writeText(finalText);
      setUiState(true, "Copied with prompt!");
      setTimeout(() => window.close(), 2000);
    } catch (error) {
      setUiState(false, `Error: ${error.message}`);
    }
  });

  // "Copy Raw" button logic for the raw transcript
  copyRawButton.addEventListener("click", async () => {
    try {
      const transcriptText = await getAndProcessTranscript();
      // No prefix is added here
      await navigator.clipboard.writeText(transcriptText);
      setUiState(true, "Raw transcript copied!");
      setTimeout(() => window.close(), 2000);
    } catch (error) {
      setUiState(false, `Error: ${error.message}`);
    }
  });

  // Helper to manage UI state for the buttons
  const setUiState = (isWorking, statusText) => {
    copyButton.disabled = isWorking;
    copyRawButton.disabled = isWorking;
    statusEl.textContent = statusText;
    if (!isWorking) {
      charCountEl.textContent = ""; // Clear character count on error
    }
  };
});
