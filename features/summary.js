const aiPrompt = `
Make a full, clear summary of a YouTube video's subtitles. Keep the original meaning and style. Break it into parts (like the video does) so it's easy to follow.  


1. How to Write:  

- Use bold headings for each part of the video (like chapters).  
- Write in full sentences instead of short bullet points.  
- Keep it simple but don't remove important details.  


2. What to Include:  

- All main ideas, examples, numbers (data), and steps explained in the video.  
- If the video repeats something important, say it once clearly.  
- If a word is hard, write an easier word next to it in brackets.  
- If the video talks about a story, past event, or reference, explain it shortly in brackets. Example: "He mentions the '2008 crash' (when the world's economy broke down suddenly)."  


3. Make It Clear:  

- No fancy (complicated) words, Use simple English.  
- If a word must be used (like a technical term), explain it fast. Example: "They discuss 'quantum physics' (a very hard science about tiny particles)."  


4. Stay Close to the Video:  

- Stay Close to the Video but you can add your own ideas while summarizing what's in the video.  
- If the video shows pictures, graphs, or demos (examples you see), say why they matter.  
- Highlight big moments, like quotes or surprising facts.  



-----------------------------------
Chapter wise YouTube Video Subtitle
-----------------------------------




`;

import {
  sendPromptAndWaitForResponse,
  getSummaryFromDeepseek,
} from "../content-scripts/deepseek-summarizer.js";

export const summarizeTranscript = async (transcript) => {
  const promptForSummary = `${aiPrompt}${transcript}`;

  // Try to locate an open Deepseek tab. Re-use it if it exists, otherwise create a new (background) tab.
  let [deepseekTab] = await chrome.tabs.query({
    url: "*://chat.deepseek.com/*",
  });

  if (!deepseekTab) {
    deepseekTab = await chrome.tabs.create({
      url: "https://chat.deepseek.com/",
      active: false, // keep the user’s focus unchanged
    });
  }

  /**
   * Executes the Deepseek summarizer content script in the target tab.
   * @returns {Promise<string>} Resolved summary text returned by the script.
   */
  const executeSummarizer = async () => {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: deepseekTab.id },
      func: getSummaryFromDeepseek,
      args: [promptForSummary],
    });
    return result;
  };

  // If the tab has already finished loading, run immediately.
  if (deepseekTab.status === "complete") {
    return executeSummarizer();
  }

  // Otherwise, wait until it finishes loading, then run.
  return new Promise((resolve, reject) => {
    const handleTabUpdate = (tabId, changeInfo) => {
      if (tabId === deepseekTab.id && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(handleTabUpdate);
        executeSummarizer().then(resolve).catch(reject);
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);
  });
};
