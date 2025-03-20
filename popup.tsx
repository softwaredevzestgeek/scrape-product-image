import { useEffect, useState } from "react"

import "./style.css"

function IndexPopup() {
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [videoUrls, setVideoUrls] = useState<
    { url: string; thumbnail: string }[]
  >([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [convertingVideo, setConvertingVideo] = useState<string | null>(null)
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false)

  useEffect(() => {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === "scrapedData") {
        if (message.images) setImageUrls(message.images)
        if (message.videos) setVideoUrls(message.videos)
        setLoading(false)
      }

      if (message.action === "conversionProgress")
        console.log(
          `Conversion Progress for ${message.url}: ${message.progress}%`
        )

      if (message.action === "conversionError") {
        setError(`Conversion failed for ${message.url}: ${message.error}`)
        setConvertingVideo(null)
      }

      if (message.action === "conversionComplete") setConvertingVideo(null)
    })
  }, [])

  useEffect(() => {
    try {
      handleScrapeImages()
    } catch (err) {
      console.log(err)
    }
  }, [])

  console.log(imageUrls, videoUrls, "asdfasdfasdfasdf")

  const handleScrapeImages = async () => {
    setLoading(true)
    setError(null)
    setImageUrls([])
    setVideoUrls([])

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: "scrapeImages" })
      else setError("No active tab found")
    } catch (error) {
      setError(
        "Failed to scrape content: " +
          (error instanceof Error ? error.message : String(error))
      )
      setLoading(false)
    }
  }

  const downloadImage = (url: string, index: number) => {
    const link = document.createElement("a")
    link.href = url
    link.download = `amazon_image_${index + 1}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadVideo = async (url: string) => {
    setConvertingVideo(url)
    setError(null)

    // chrome.tabs.create({
    //   url: chrome.runtime.getURL(
    //     `sandboxes/sandbox.html?m3u8Url=${url}&filename=${url}`
    //   )
    // })

    chrome.windows.create({
      url: chrome.runtime.getURL(
        `sandboxes/sandbox.html?m3u8Url=${url}&filename=${url}`
      ),
      type: "popup",
      state: "minimized"
    })

    setConvertingVideo(null)

    return

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      if (tab?.id)
        chrome.runtime.sendMessage({
          action: "triggerM3U8Download",
          url,
          filename: "converted_video.mp4"
        })
      else setError("No active tab found")
    } catch (error) {
      setError(
        "Failed to download video: " +
          (error instanceof Error ? error.message : String(error))
      )
      setConvertingVideo(null)
    }
  }

  const downloadAllVideos = async () => {
    if (videoUrls.length === 0) {
      setError("No videos available to download.")
      return
    }

    setIsDownloadingAll(true)
    const queryParams = videoUrls
      .map(
        (item, index) =>
          `m3u8Url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(index + "video")}`
      )
      .join("&")

    chrome.windows.create(
      {
        url: chrome.runtime.getURL(`sandboxes/sandbox.html?${queryParams}`),
        type: "popup",
        state: "minimized"
      },
      function (createdWindow) {
        const windowId = createdWindow.id

        chrome.windows.onRemoved.addListener(function (closedWindowId) {
          if (closedWindowId === windowId) {
            console.log("Popup window closed!")
            setIsDownloadingAll(false)
            // Perform any actions you need here
          }
        })
      }
    )
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg w-[620px] border border-gray-200">
      <h1 className="text-2xl font-semibold text-gray-800 text-center mb-6 mt-2">
        🛒 Amazon Media Scraper
      </h1>

      {/* <button
        onClick={handleScrapeImages}
        disabled={loading || convertingVideo !== null}
        className="w-full bg-[#f0c14b] text-[#111] font-bold py-2 rounded-lg hover:bg-[#ddb347] transition disabled:opacity-50">
        {loading ? "Scraping..." : "Scrape Product Media"}
      </button> */}
      <button
        onClick={handleScrapeImages}
        disabled={loading || convertingVideo !== null}
        className="w-full py-2 rounded-lg font-bold text-[#111] transition disabled:opacity-50
                   bg-gradient-to-r from-[#f0c14b] to-[#ff9900]
                   hover:bg-gradient-to-r hover:from-[#e6b93e] hover:to-[#ff8c00]">
        {loading ? "Scraping..." : "Scrape Product Media"}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-800 border border-red-300 rounded-lg">
          {error}
        </div>
      )}

      <div className="mt-4 flex gap-6">
        {/* Image Container */}
        <div className="flex-1 max-h-80 overflow-y-auto border rounded-lg pt-0 bg-gray-50 shadow-inner">
          <p className="text-lg font-medium mb-4 sticky top-0 px-4 py-2 bg-white backdrop-blur-md bg-opacity-75 border-b rounded-t-lg">
            🖼️ Images
          </p>
          <div className="grid grid-cols-2 gap-4 px-4">
            {imageUrls.length > 0 ? (
              imageUrls.map((url, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center mb-4 p-3 rounded-lg bg-white shadow hover:shadow-md transition">
                  <img
                    src={url}
                    alt={`Amazon Image ${index + 1}`}
                    className="w-32 h-32 object-cover rounded-lg border border-gray-200 mb-2"
                  />
                  <button
                    onClick={() => downloadImage(url, index)}
                    className="w-full py-2 bg-[#f0c14b] text-[#111] font-medium rounded-lg hover:bg-[#ddb347] transition">
                    Download
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 col-span-2 text-center">
                No product images found.
              </p>
            )}
          </div>
        </div>

        {/* Video Container */}
        <div className="flex-1 max-h-80 overflow-y-auto border rounded-lg bg-gray-50 shadow-inner">
          <div className="flex justify-between sticky top-0 mb-4 px-4 py-2 bg-white backdrop-blur-md bg-opacity-75 border-b rounded-t-lg">
            <p className="text-lg font-medium">🎬 Videos</p>
            <button
              onClick={downloadAllVideos}
              disabled={videoUrls.length === 0}
              className={`text-xs px-4 rounded-lg font-semibold ${
                videoUrls.length === 0
                  ? " text-gray-400 cursor-not-allowed"
                  : "text-black"
              }`}>
              ⬇️ Download All Videos
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 px-4">
            {videoUrls.length > 0 ? (
              videoUrls.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center mb-4 p-3 rounded-lg bg-white shadow hover:shadow-md transition">
                  <img
                    src={item.thumbnail}
                    alt="Video Thumbnail"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-200 mb-2"
                  />
                  <button
                    onClick={() => downloadVideo(item.url)}
                    disabled={convertingVideo === item.url || isDownloadingAll}
                    className={`w-full py-2 rounded-lg font-medium transition ${
                      convertingVideo === item.url || isDownloadingAll
                        ? "bg-gray-400 text-white"
                        : "bg-[#f0c14b] text-[#111] hover:bg-[#ddb347]"
                    }`}>
                    {convertingVideo === item.url || isDownloadingAll
                      ? "Downloading..."
                      : "Download"}
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 col-span-2 text-center">
                No product videos found.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default IndexPopup
