(async () => {
  const waitForElement = (selector, parent = document, timeout = 5000) => {
    return new Promise((resolve) => {
      const el = parent.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = parent.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(parent, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  };

  const openTranscriptPanel = async () => {
    let transcriptPanel = document.querySelector(
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
    );
    if (transcriptPanel && transcriptPanel.offsetParent !== null) {
      return transcriptPanel;
    }

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
        const menu = await waitForElement(
          "ytd-menu-popup-renderer",
          document.body,
          2000
        );
        if (menu) {
          const menuItems = menu.querySelectorAll(
            "ytd-menu-service-item-renderer"
          );
          for (const item of menuItems) {
            if (
              item.innerText &&
              item.innerText.toLowerCase().includes("transcript")
            ) {
              item.click();
              transcriptButtonClicked = true;
              break;
            }
          }
        }
      }
    }

    if (!transcriptButtonClicked) {
      throw new Error("'Show transcript' button not found.");
    }

    const transcriptRenderer = await waitForElement(
      "ytd-transcript-renderer",
      document.body,
      5000
    );
    if (!transcriptRenderer) {
      throw new Error("Transcript panel did not open after clicking button.");
    }
    return transcriptRenderer;
  };

  const ensureAllSegmentsLoaded = async (container) => {
    let lastSegmentCount = 0;
    let currentSegmentCount = container.querySelectorAll(
      "ytd-transcript-segment-renderer"
    ).length;

    while (currentSegmentCount > lastSegmentCount) {
      lastSegmentCount = currentSegmentCount;
      const lastSegment = container.querySelector(
        "ytd-transcript-segment-renderer:last-child"
      );
      if (lastSegment) {
        lastSegment.scrollIntoView({ behavior: "auto", block: "nearest" });
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      currentSegmentCount = container.querySelectorAll(
        "ytd-transcript-segment-renderer"
      ).length;
    }
  };

  const extractTranscriptData = async () => {
    try {
      const transcriptRenderer = await openTranscriptPanel();

      const contentContainer =
        (await waitForElement(
          "#segments-container",
          transcriptRenderer,
          2000
        )) || transcriptRenderer;

      await ensureAllSegmentsLoaded(contentContainer);

      const transcriptData = [];
      const transcriptItems = contentContainer.querySelectorAll(
        "ytd-transcript-section-header-renderer, ytd-transcript-segment-renderer"
      );

      if (transcriptItems.length === 0) {
        return { error: "Could not find any transcript content." };
      }

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
      return { error: error.message || "An unexpected error occurred." };
    }
  };

  return await extractTranscriptData();
})();
