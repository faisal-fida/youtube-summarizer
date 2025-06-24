// popup.js (Updated with formatting logic)

document.addEventListener('DOMContentLoaded', () => {
    const copyButton = document.getElementById('copyButton');
    const statusEl = document.getElementById('status');
    const includeTimestampsCheck = document.getElementById('includeTimestamps');
    const formatMarkdownCheck = document.getElementById('formatMarkdown');

    const formatTranscript = (transcriptData, options) => {
        let formattedText = "";
        transcriptData.forEach(item => {
            if (item.type === 'chapter') {
                if (options.formatMarkdown) {
                    formattedText += `\n\n## ${item.text}\n`;
                } else {
                    formattedText += `\n\nChapter: ${item.text}\n`;
                }
            } else if (item.type === 'segment') {
                let line = "";
                if (options.includeTimestamps) {
                    line += `[${item.timestamp}] `;
                }
                line += item.text;
                // In markdown, we can add a newline for each segment. In plain text, a space is better.
                formattedText += line + (options.formatMarkdown ? '\n' : ' ');
            }
        });
        return formattedText.trim();
    };

    copyButton.addEventListener('click', async () => {
        statusEl.textContent = 'Working...';
        copyButton.disabled = true;

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.url || !tab.url.includes("youtube.com/watch")) {
            statusEl.textContent = 'Error: Not a YouTube video page.';
            copyButton.disabled = false;
            return;
        }

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        }, (injectionResults) => {
            if (chrome.runtime.lastError || !injectionResults || !injectionResults.length) {
                statusEl.textContent = 'Error: Failed to inject script.';
                copyButton.disabled = false; return;
            }

            const { result } = injectionResults[0];

            if (result.error) {
                statusEl.textContent = `Error: ${result.error}`;
                copyButton.disabled = false;
            } else {
                const options = {
                    includeTimestamps: includeTimestampsCheck.checked,
                    formatMarkdown: formatMarkdownCheck.checked
                };
                
                const transcriptText = formatTranscript(result.data, options);
                const finalText = `Summarize this: \n\n${transcriptText}`;

                navigator.clipboard.writeText(finalText).then(() => {
                    statusEl.textContent = 'Transcript copied to clipboard!';
                    setTimeout(() => { window.close(); }, 2000);
                }).catch(err => {
                    statusEl.textContent = 'Error: Could not copy text.';
                    console.error('Clipboard write failed: ', err);
                });
            }
        });
    });
});