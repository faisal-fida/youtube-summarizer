document.addEventListener('DOMContentLoaded', () => {
    const copyButton = document.getElementById('copyButton');
    const statusEl = document.getElementById('status');

    copyButton.addEventListener('click', async () => {
        statusEl.textContent = 'Working...';
        copyButton.disabled = true;

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Ensure we are on a YouTube video page
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
                copyButton.disabled = false;
                return;
            }

            const { result } = injectionResults[0];

            if (result.error) {
                statusEl.textContent = `Error: ${result.error}`;
                copyButton.disabled = false;
            } else {
                const final_text = `Summarize this: \n\n${result.data}`;
                navigator.clipboard.writeText(final_text).then(() => {
                    statusEl.textContent = 'Transcript copied to clipboard!';
                    setTimeout(() => { window.close(); }, 2000); // Auto-close popup
                }).catch(err => {
                    statusEl.textContent = 'Error: Could not copy text.';
                    console.error('Clipboard write failed: ', err);
                });
            }
        });
    });
});