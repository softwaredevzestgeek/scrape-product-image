// background.ts

export const downloadM3U8AsMP4 = async (
  m3u8Url: string,
  filename: string = "video.mp4"
) => {
  try {
    // Message the offscreen document to perform the download
    chrome.runtime.sendMessage({
      target: "offscreen",
      action: "downloadHLS",
      url: m3u8Url,
      filename: filename
    })
  } catch (error) {
    console.error("Error initiating M3U8 download:", error)
  }
}

// // Listen for messages from offscreen document
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.target === "background" && message.action === "downloadReady") {
//     const blobUrl = `data:video/mp4;base64,${message.data}`

//     chrome.downloads.download(
//       {
//         url: blobUrl,
//         filename: message.filename,
//         saveAs: false
//       },
//       (downloadId) => {
//         if (chrome.runtime.lastError) {
//           console.error("Download error:", chrome.runtime.lastError.message)
//         } else {
//           console.log(`Download started with ID: ${downloadId}`)
//         }
//       }
//     )
//   }
//   return true
// })
