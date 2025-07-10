export const getTranscriptFromTab = async (tabId) => {
  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content-scripts/transcript-extractor.js"],
  });

  if (
    chrome.runtime.lastError ||
    !injectionResults ||
    !injectionResults.length
  ) {
    throw new Error("Failed to inject the content script.");
  }

  const { result } = injectionResults[0];
  if (result.error) {
    throw new Error(result.error);
  }

  return result.data;
};

export const formatTranscript = (transcriptData) => {
  if (!transcriptData || transcriptData.length === 0) {
    return "";
  }
  return transcriptData
    .map((item) => {
      if (item.type === "chapter") {
        return `\n## ${item.text}\n`;
      }
      return item.text;
    })
    .join("\n")
    .trim();
};

export const getTranscript = async () => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.url || !tab.url.includes("youtube.com/watch")) {
      throw new Error("This is not a YouTube video page.");
    }

    const transcriptData = await getTranscriptFromTab(tab.id);
    const transcriptText = formatTranscript(transcriptData);

    if (transcriptText) {
      return transcriptText;
    } else {
      throw new Error("No transcript available for this video.");
    }
  } catch (error) {
    throw new Error(`An error occurred: ${error.message}`);
  }
};
