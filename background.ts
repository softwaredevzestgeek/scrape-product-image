chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "requestFFmpegURLs") {
    sendResponse({
      action: "ffmpegURLs",
      ffmpegScriptURL: chrome.runtime.getURL("vendor/ffmpeg.min.js"),
      ffmpegCoreURL: chrome.runtime.getURL("vendor/ffmpeg-core.js"),
    });
  }

  if (message.action === "triggerDownload") {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename,
    });
  }
});


