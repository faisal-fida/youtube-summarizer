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

  // Main extraction logic for youtube transcript
  const extractTranscriptData = async () => {
    try {
      // STEP 1: Expand description section
      const descriptionBox = document.querySelector(
        "#description.ytd-watch-metadata"
      );
      if (descriptionBox) {
        const expandButton = descriptionBox.querySelector(
          "tp-yt-paper-button#expand, yt-button-renderer#expand"
        );
        if (expandButton) {
          expandButton.click();
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      let transcriptPanel = document.querySelector(
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
      );
      if (!transcriptPanel || transcriptPanel.offsetParent === null) {
        let transcriptButtonClicked = false;
        const directTranscriptButton = document.querySelector(
          'yt-button-shape button[aria-label="Show transcript"]'
        );
        if (directTranscriptButton) {
          directTranscriptButton.click();
          transcriptButtonClicked = true;
        }
        if (!transcriptButtonClicked) {
          const moreActionsButton = document.querySelector(
            'ytd-menu-renderer button[aria-label="More actions"]'
          );
          if (moreActionsButton) {
            moreActionsButton.click();
            const buttonInMenu = await waitForElement(
              "ytd-menu-service-item-renderer a, ytd-menu-service-item-renderer yt-button-shape"
            );
            if (
              buttonInMenu &&
              buttonInMenu.innerText.toLowerCase().includes("transcript")
            ) {
              buttonInMenu.click();
              transcriptButtonClicked = true;
            }
          }
        }
        if (!transcriptButtonClicked)
          return { error: "'Show transcript' button not found." };
      }

      // STEP 2: Open transcript panel
      const transcriptRenderer = await waitForElement(
        "ytd-transcript-renderer",
        5000
      );
      if (!transcriptRenderer)
        return { error: "Transcript panel did not open." };

      const contentContainer =
        (await waitForElement("#segments-container", 2000)) ||
        transcriptRenderer;
      transcriptRenderer.scrollIntoView({ behavior: "smooth", block: "end" });
      await new Promise((resolve) => setTimeout(resolve, 500));

      // STEP 3: Extract all items into a structured array
      const transcriptData = [];
      const transcriptItems = contentContainer.querySelectorAll(
        "ytd-transcript-section-header-renderer, ytd-transcript-segment-renderer"
      );

      if (transcriptItems.length === 0)
        return { error: "Could not find any transcript content." };

      transcriptItems.forEach((item) => {
        if (
          item.tagName.toLowerCase() ===
          "ytd-transcript-section-header-renderer"
        ) {
          const chapterTitleEl = item.querySelector(
            "h2 .yt-core-attributed-string"
          );
          if (chapterTitleEl) {
            transcriptData.push({
              type: "chapter",
              text: chapterTitleEl.textContent.trim(),
            });
          }
        } else if (
          item.tagName.toLowerCase() === "ytd-transcript-segment-renderer"
        ) {
          const segmentTextEl = item.querySelector(
            "yt-formatted-string.segment-text"
          );
          const timestampEl = item.querySelector(".segment-timestamp");
          if (segmentTextEl && timestampEl) {
            transcriptData.push({
              type: "segment",
              timestamp: timestampEl.textContent.trim(),
              text: segmentTextEl.innerText.replace(/\n/g, " ").trim(),
            });
          }
        }
      });

      return { data: transcriptData };
    } catch (error) {
      console.error("Transcript Extraction Error:", error);
      return { error: "An unexpected error occurred." };
    }
  };

  return await extractTranscriptData();
})();
