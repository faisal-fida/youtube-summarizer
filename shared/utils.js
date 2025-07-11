export const getActiveTab = async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab;
};

export const exportToFile = (content, filename) => {
  let url;
  let shouldRevoke = false;

  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    // Service Worker may not have createObjectURL; guard accordingly.
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    url = URL.createObjectURL(blob);
    shouldRevoke = true;
  } else {
    // Fallback to data URL so we can still trigger a download.
    url = `data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`;
  }

  chrome.downloads.download(
    {
      url,
      filename,
      saveAs: true,
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("Download failed:", chrome.runtime.lastError);
      }

      // Clean up blob URL after download completes
      if (shouldRevoke && downloadId !== undefined) {
        const listener = (delta) => {
          if (
            delta.id === downloadId &&
            delta.state &&
            delta.state.current === "complete"
          ) {
            URL.revokeObjectURL(url);
            chrome.downloads.onChanged.removeListener(listener);
          }
        };
        chrome.downloads.onChanged.addListener(listener);
      }
    }
  );
};
