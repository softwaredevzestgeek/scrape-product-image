chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Background] Received message:", message);

  if (message.action === "requestFFmpegURLs") {
    sendResponse({
      action: "ffmpegURLs",
      ffmpegScriptURL: chrome.runtime.getURL("vendor/ffmpeg.min.js"),
      ffmpegCoreURL: chrome.runtime.getURL("vendor/ffmpeg-core.js"),
    });
  }

  if (message.action === "triggerDownload") {
    console.log("[Background] Triggering download for:", message.url);
    
    chrome.downloads.download(
      {
        url: message.url,
        filename: message.filename,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("[Background] Download error:", chrome.runtime.lastError);
          return;
        }

        console.log("[Background] Download started with ID:", downloadId);

        // Listen for download completion
        chrome.downloads.onChanged.addListener(function listener(downloadDelta) {
          if (downloadDelta.id === downloadId && downloadDelta.state?.current === "complete") {
            console.log("[Background] Download completed!");

            // Remove listener after detecting completion
            chrome.downloads.onChanged.removeListener(listener);

            // Notify popup that download is complete
            chrome.runtime.sendMessage({
              action: "downloadCompleted",
              filename: message.filename,
            });
          }
        });
      }
    );
  }

  
});


