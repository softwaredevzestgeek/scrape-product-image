// import FFmpegWrapper from "./ffmpeg-wrapper"

// const ffmpeg = new FFmpegWrapper(
//   chrome.runtime.getURL("./vendor/ffmpeg-core.js"),
//   chrome.runtime.getURL("./vendor/ffmpeg-core.wasm"),
//   chrome.runtime.getURL("./vendor/ffmpeg-core.worker.js")
// )

// async function convertHLS(m3u8Url) {
//   try {
//     console.log("[Content Script] Starting HLS conversion for URL:", m3u8Url)

//     await ffmpeg.load()

//     const response = await fetch(m3u8Url)
//     const data = new Uint8Array(await response.arrayBuffer())

//     await ffmpeg.writeFile("input.m3u8", data)
//     await ffmpeg.run(["-i", "input.m3u8", "output.mp4"])

//     const outputData = await ffmpeg.readFile("output.mp4")
//     const blobUrl = URL.createObjectURL(
//       new Blob([outputData], { type: "video/mp4" })
//     )

//     chrome.runtime.sendMessage({
//       action: "triggerDownload",
//       url: blobUrl,
//       filename: "converted_video.mp4"
//     })

//     URL.revokeObjectURL(blobUrl)
//   } catch (error) {
//     console.error("[Content Script] Conversion failed:", error)
//     chrome.runtime.sendMessage({
//       action: "conversionError",
//       error: error instanceof Error ? error.message : String(error)
//     })
//   }
// }

// Scrape media data
function scrapeAndSendData() {
  console.log("Starting to scrape media data...")
  const div = document.querySelector("#imageBlockVariations_feature_div")
  if (!div) return console.log("No product media found.")

  const scriptTag = div.querySelector("script")
  if (scriptTag?.textContent) {
    const match = scriptTag.textContent.match(/jQuery\.parseJSON\('(.*?)'\)/)
    if (!match || !match[1]) return

    try {
      const jsonString = match[1].replace(/\\"/g, '"').replace(/\\/g, "")
      const obj = JSON.parse(jsonString)

      const videoData =
        obj?.videos?.map((video) => ({
          url: video.url,
          thumbnail: video?.slateUrl || video?.thumb || null
        })) || []

      const imageUrls = (
        obj?.colorImages?.[Object.keys(obj.colorImages)?.[0]] || []
      )
        .map((image) => image.hiRes || image.large)
        .filter(Boolean)

      console.log("Scraped Image URLs:", imageUrls)
      console.log("Scraped Video URLs:", videoData)

      chrome.runtime.sendMessage({
        action: "scrapedData",
        images: imageUrls,
        videos: videoData
      })
    } catch (error) {
      console.error("Error parsing JSON:", error)
    }
  }
}

// Message listener
chrome.runtime.onMessage.addListener((message) => {
  switch (message.action) {
    case "scrapeImages":
      scrapeAndSendData()
      break

    // case "convertHLS":
    //   convertHLS(message.url)
    //   break
    // case "convertHLS":
    // case "downloadVideo":
    //   console.log("downloadVideo", message)
    //   const { filename, data } = message
    //   const blob = new Blob(
    //     [Uint8Array.from(atob(data), (c) => c.charCodeAt(0))],
    //     { type: "video/mp4" }
    //   )
    //   const url = URL.createObjectURL(blob)

    //   const a = document.createElement("a")
    //   a.href = url
    //   a.download = filename
    //   a.style.display = "none"
    //   document.body.appendChild(a)
    //   a.click()

    //   URL.revokeObjectURL(url)
    //   a.remove()

    //   console.log(`Download started: ${filename}`)
    //   break
  }
})

// Initial scrape on page load
scrapeAndSendData()
