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

  return (
    <div className="p-6 bg-white rounded-lg shadow-xl w-[620px]">
      <h1 className="text-2xl font-semibold text-gray-800 text-center mb-6">
        Amazon Media Scraper
      </h1>

      <button
        onClick={handleScrapeImages}
        disabled={loading || convertingVideo !== null}
        className="w-full bg-[#f0c14b] text-[#111] font-bold py-2 rounded-lg hover:bg-[#ddb347] transition disabled:opacity-50">
        {loading ? "Scraping..." : "Scrape Product Media"}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-800 border border-red-300 rounded-lg">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-6">
        <div className="flex-1 max-h-80 overflow-y-auto border rounded-lg p-4 bg-gray-50">
          <h2 className="text-lg font-medium mb-4">Images</h2>
          {imageUrls.length > 0 ? (
            imageUrls.map((url, index) => (
              <div key={index} className="mb-4">
                <img
                  src={url}
                  alt={`Amazon Image ${index + 1}`}
                  className="w-full rounded-lg mb-2"
                />
                <button
                  onClick={() => downloadImage(url, index)}
                  className="w-full py-2 bg-[#f0c14b] text-[#111] font-medium rounded-lg">
                  Download Image
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No product images found.</p>
          )}
        </div>

        <div className="flex-1 max-h-80 overflow-y-auto border rounded-lg p-4 bg-gray-50">
          <h2 className="text-lg font-medium mb-4">Videos</h2>
          {videoUrls.length > 0 ? (
            videoUrls.map((item, index) => (
              <div key={index} className="mb-4">
                <img
                  src={item.thumbnail}
                  alt="Video Thumbnail"
                  className="w-full rounded-lg mb-2"
                />
                <button
                  onClick={() => downloadVideo(item.url)}
                  disabled={convertingVideo === item.url}
                  className={`w-full py-2 rounded-lg font-medium ${convertingVideo === item.url ? "bg-gray-400" : "bg-[#f0c14b] text-[#111]"}`}>
                  {convertingVideo === item.url
                    ? "Converting..."
                    : "Download Video"}
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No product videos found.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default IndexPopup
