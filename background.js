import { getTranscript } from "./features/transcript.js";
import { summarizeTranscript } from "./features/summary.js";

const setStatus = (text, color = "#4688F1") => {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

chrome.action.onClicked.addListener(async () => {
  try {
    setStatus("...");
    const transcript = await getTranscript();

    setStatus("...");
    const summary = await summarizeTranscript(transcript);

    if (summary) {
      exportToFile(summary, "summary.md");
    }
    setStatus("Done", "#32a852");
  } catch (error) {
    console.error("YouTube Transcript Summarizer error:", error);
    setStatus("ERR", "#d93025");
  } finally {
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 5000);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "deepseek_response_complete") {
    setStatus("Done", "#32a852");
    // Clear badge after a short delay
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 5000);
  }
});
