import { downloadM3U8AsMP4 } from "~utils"

// chrome.action.onClicked.addListener((tab) => {
//   console.log("[Background Script] Extension icon clicked.")
//   chrome.tabs.sendMessage(tab.id, { action: "scrapeImages" })
// })

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // if (message.action === "triggerDownload") {
  //   const { url, filename } = message
  //   console.log("[Background Script] Triggering download for URL:", url)

  //   chrome.downloads.download(
  //     {
  //       url: url,
  //       filename: filename,
  //       saveAs: true
  //     },
  //     (downloadId) => {
  //       if (chrome.runtime.lastError) {
  //         console.error(
  //           "[Background Script] Download failed:",
  //           chrome.runtime.lastError
  //         )
  //       } else {
  //         console.log(
  //           "[Background Script] Download started successfully. Download ID:",
  //           downloadId
  //         )
  //       }
  //     }
  //   )
  // }

  if (message.action === "triggerM3U8Download") {
    const { url, filename } = message
    console.log("[Background Script] Triggering M3U8 download for URL:", url)

    downloadM3U8AsMP4(url, filename)
      .then(() => {
        console.log("[Background Script] M3U8 download completed successfully.")
      })
      .catch((error) => {
        console.error("[Background Script] M3U8 download failed:", error)
      })
  }

  if (message.action === "downloadVideo") {
    const { filename, data } = message
    const url = `data:video/mp4;base64,${data}` // Create a data URL

    chrome.downloads.download(
      {
        url,
        filename
        // saveAs: true // or false, depending on your preference
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("Download error:", chrome.runtime.lastError.message)
        } else {
          console.log(`Download started with ID: ${downloadId}`)
          chrome.runtime.sendMessage({ action: "conversionComplete" })
        }
        // No need for URL.revokeObjectURL here
      }
    )
  }
  return
})
