const aiPrompt = `
You are a helpful assistant that summarizes transcripts of YouTube videos. 
You will be given a transcript of a YouTube video.
You will need to summarize the transcript in a way that is easy to understand and follow.
You will need to include the main points of the video in the summary.
You will need to include the key takeaways of the video in the summary.
You will need to include the main points of the video in the summary.
`;

import { getSummaryFromDeepseek } from "../content-scripts/deepseek-summarizer.js";

export const summarizeTranscript = async (transcript) => {
  const fullPrompt = `${aiPrompt}\n\nTranscript:\n\n${transcript}`;

  const tab = await chrome.tabs.create({
    url: "https://chat.deepseek.com/",
    active: false,
  });

  return new Promise((resolve, reject) => {
    const tabUpdateListener = async (tabId, changeInfo) => {
      if (tabId === tab.id && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(tabUpdateListener);
        try {
          const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: getSummaryFromDeepseek,
            args: [fullPrompt],
          });
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          await chrome.tabs.remove(tab.id);
        }
      }
    };

    chrome.tabs.onUpdated.addListener(tabUpdateListener);
  });
};
