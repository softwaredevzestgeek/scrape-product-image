chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "triggerDownload") {
      const { url, filename } = message;
      console.log("[Background Script] Triggering download for URL:", url);
  
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true,
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("[Background Script] Download failed:", chrome.runtime.lastError);
        } else {
          console.log("[Background Script] Download started successfully. Download ID:", downloadId);
        }
      });
    }
  });