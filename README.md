# YouTube Transcript Summarizer

A browser extension to extract and format transcripts from YouTube videos.

## Features

- Extracts the entire transcript.
- Captures chapter markers within the transcript for better organization.
- A popup interface to display the extracted transcript.
- Formats the transcript with clear headings for chapters.

### Planned Features

- Summarize the transcript using an (Deepseek)[https://chat.deepseek.com/] (Large Language Model).
- Export transcript as `.pdf` or `.md`

## Extension is built with following key components:


1.  **Popup (`popup/`)**: The user interface. When the user clicks the extension icon, `popup.html` is shown. `popup.js` then initiates the transcript extraction process.

2.  **Feature Logic (`features/`)**: This contains the main logic.
    - `transcript.js`: This script is responsible for orchestrating the transcript extraction. It injects the content script into the active YouTube tab, receives the data, and formats it for display.

3.  **Content Script (`content-scripts/`)**:
    - `transcript-extractor.js`: This script is injected directly into the YouTube video page. It programmatically opens the transcript panel, waits for all the transcript lines to load, and then scrapes the content, including chapter titles and text segments. It then sends this data back to the feature logic.

4.  **Shared Utilities (`shared/`)**: This directory is for code that can be shared across different parts of the extension, like constants or helper functions. (Currently empty).

## Project Structure

```
youtube-transcript-summarizer/
├── content-scripts/
│   └── transcript-extractor.js  # Injected into YouTube pages to get transcript
├── features/
│   ├── transcript.js            # Core logic for getting and formatting transcript
│   ├── export.js                # (Planned) For export functionality
│   └── summary.js               # (Planned) For summarization
├── popup/
│   ├── popup.html               # The extension's popup UI
│   ├── popup.css                # Styles for the popup
│   └── popup.js                 # Logic for the popup UI
├── shared/
│   ├── constants.js             # (Planned) For shared constants
│   └── utils.js                 # (Planned) For shared utility functions
└── manifest.json                # Extension configuration file
```

