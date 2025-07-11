export const getSummaryFromDeepseek = (prompt) => {
  return new Promise(async (resolve, reject) => {
    try {
      const getElement = (selector, timeout = 10000) => {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
              clearInterval(interval);
              resolve(element);
            } else if (Date.now() - startTime > timeout) {
              clearInterval(interval);
              reject(new Error(`Element not found: ${selector}`));
            }
          }, 100);
        });
      };

      const textarea = await getElement("textarea#chat-input");
      textarea.value = prompt;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      // The send button is a div[role="button"] that has an SVG inside and is enabled.
      const sendButton = await getElement(
        'div[role="button"][aria-disabled="false"]:has(svg)'
      );
      sendButton.click();

      // The stop generating button also has role="button" and aria-disabled="false", but no SVG.
      const stopGeneratingButtonSelector =
        'div[role="button"][aria-disabled="false"]:not(:has(svg))';

      const observer = new MutationObserver(async (mutations, obs) => {
        const stopGeneratingButton = document.querySelector(
          stopGeneratingButtonSelector
        );
        if (stopGeneratingButton) {
          // The bot has started generating, so we can now wait for it to finish.
          obs.disconnect(); // Stop this observer
          const responseObserver = new MutationObserver(
            async (mutations, responseObs) => {
              // Wait for the "stop generating" button to disappear
              if (!document.querySelector(stopGeneratingButtonSelector)) {
                responseObs.disconnect();
                const messageElements =
                  document.querySelectorAll("div.ds-markdown");
                const lastMessage = messageElements[messageElements.length - 1];
                const titleElement = document.querySelector("div.d8ed659a");
                const filename = titleElement
                  ? titleElement.innerText
                      .trim()
                      .replace(/[^a-z0-9]/gi, "_")
                      .toLowerCase()
                  : "summary";

                if (lastMessage) {
                  resolve({
                    summary: lastMessage.innerText,
                    filename: `${filename}.md`,
                  });
                } else {
                  reject(new Error("Could not find the last message."));
                }
              }
            }
          );
          responseObserver.observe(document.body, {
            childList: true,
            subtree: true,
          });
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    } catch (error) {
      reject(error);
    }
  });
};
