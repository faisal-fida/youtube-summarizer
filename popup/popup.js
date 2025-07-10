import { getTranscript } from "../features/transcript.js";

document.addEventListener("DOMContentLoaded", () => {
  const transcriptContainer = document.getElementById("transcript");

  const showMessage = (message) => {
    transcriptContainer.textContent = message;
    transcriptContainer.style.whiteSpace = "pre-wrap";
  };

  const main = async () => {
    try {
      // Step 1: Get the processed transcript
      showMessage("Loading transcript...");
      const transcript = await getTranscript();
      transcriptContainer.textContent = transcript;

      // Step 2:
    } catch (error) {
      showMessage(`An error occurred: ${error.message}`);
    }
  };

  main();
});
