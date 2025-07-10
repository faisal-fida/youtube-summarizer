import { getTranscript } from "../features/transcript.js";
import { summarizeTranscript } from "../features/summary.js";
import { exportSummary } from "../features/export.js";

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

      // Step 2: Summarize the transcript
      showMessage("Summarizing transcript...");
      const summary = await summarizeTranscript(transcript);
      transcriptContainer.textContent = summary;

      // Step 3: Export the summary
      showMessage("Exporting summary...");
      await exportSummary(summary);
    } catch (error) {
      showMessage(`An error occurred: ${error.message}`);
    }
  };

  main();
});
