// content.js (Final Version - Handles Multiple Button Layouts)

(async () => {
    // Helper function to wait for an element to appear in the DOM
    const waitForElement = (selector, timeout = 5000) => {
        return new Promise((resolve) => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);

            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    };

    // Main extraction logic
    const extractTranscript = async () => {
        try {
            // STEP 1: Click to expand the video description if it's collapsed
            const descriptionBox = document.querySelector('#description.ytd-watch-metadata');
            if (descriptionBox) {
                const expandButton = descriptionBox.querySelector('tp-yt-paper-button#expand, yt-button-renderer#expand');
                if (expandButton) {
                    expandButton.click();
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }

            // --- STEP 2 (REBUILT): Find and click "Show transcript" button ---
            let transcriptPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]');
            
            // Only click if the transcript panel isn't already open
            if (!transcriptPanel || transcriptPanel.offsetParent === null) {
                let transcriptButtonClicked = false;

                // STRATEGY A: Look for the direct button (based on your HTML)
                const directTranscriptButton = document.querySelector('yt-button-shape button[aria-label="Show transcript"]');
                if (directTranscriptButton) {
                    directTranscriptButton.click();
                    transcriptButtonClicked = true;
                }

                // STRATEGY B (Fallback): Look inside the "..." menu
                if (!transcriptButtonClicked) {
                    const moreActionsButton = document.querySelector('ytd-menu-renderer button[aria-label="More actions"]');
                    if (moreActionsButton) {
                        moreActionsButton.click();
                        const transcriptButtonInMenu = await waitForElement('ytd-menu-service-item-renderer a, ytd-menu-service-item-renderer yt-button-shape');
                        
                        if (transcriptButtonInMenu && transcriptButtonInMenu.innerText.toLowerCase().includes("transcript")) {
                            transcriptButtonInMenu.click();
                            transcriptButtonClicked = true;
                        }
                    }
                }

                if (!transcriptButtonClicked) {
                    return { error: "'Show transcript' button not found in any known location." };
                }
            }
            // --- END OF REBUILT STEP 2 ---


            // STEP 3: Wait for the main transcript renderer element
            const transcriptRenderer = await waitForElement('ytd-transcript-renderer', 5000);
            if (!transcriptRenderer) {
                return { error: "Transcript panel did not open after click." };
            }

            // STEP 4: Extract the content
            const contentContainer = await waitForElement('#segments-container', 2000) || transcriptRenderer;
            transcriptRenderer.scrollIntoView({ behavior: 'smooth', block: 'end' });
            await new Promise(resolve => setTimeout(resolve, 500));

            let fullTranscript = "";
            const transcriptItems = contentContainer.querySelectorAll('ytd-transcript-section-header-renderer, ytd-transcript-segment-renderer');

            if (transcriptItems.length === 0) {
                 return { error: "Could not find any transcript content." };
            }

            transcriptItems.forEach(item => {
                if (item.tagName.toLowerCase() === 'ytd-transcript-section-header-renderer') {
                    const chapterTitleEl = item.querySelector('h2 .yt-core-attributed-string');
                    const title = chapterTitleEl ? chapterTitleEl.textContent.trim() : "Untitled Chapter";
                    fullTranscript += `\n\nChapter: ${title}\n`;
                } else if (item.tagName.toLowerCase() === 'ytd-transcript-segment-renderer') {
                    const segmentTextEl = item.querySelector('yt-formatted-string.segment-text');
                    if (segmentTextEl) {
                        const text = segmentTextEl.innerText.replace(/\n/g, ' ').trim();
                        fullTranscript += text + " ";
                    }
                }
            });

            return { data: fullTranscript.trim() };

        } catch (error) {
            console.error("Transcript Extraction Error:", error);
            return { error: "An unexpected error occurred." };
        }
    };

    return await extractTranscript();
})();