import { saveAs } from "file-saver"
import { type User } from "firebase/auth"
import JSZip from "jszip"
import { Download, Play } from "lucide-react"
import React, { useEffect, useState } from "react"

import { Image } from "~components"

interface MediaExtractorProps {
  user: User
}

export function MediaExtractor({ user }: MediaExtractorProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [videoUrls, setVideoUrls] = useState<
    { url: string; thumbnail: string }[]
  >([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [convertingVideo, setConvertingVideo] = useState<string | null>(null)
  const [downloadingAll, setDownloadingAll] = useState<boolean>(false)

  useEffect(() => {
    // Try to scrape images when component mounts
    try {
      handleScrapeImages()
    } catch (err) {
      console.log(err)
    }

    // Set up event listeners for messages from background script
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

  const downloadImage = async (url: string, index: number) => {
    try {
      // Fetch image using fetch API to bypass CORS
      const response = await fetch(url, {
        mode: "cors",
        credentials: "omit"
      })

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`)
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      // Create download link
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = `amazon_image_${index + 1}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      setError(
        `Failed to download image: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  const downloadAllImages = async () => {
    if (imageUrls.length === 0) {
      setError("No images to download")
      return
    }

    setDownloadingAll(true)
    setError(null)

    try {
      // Create a new JSZip instance
      const zip = new JSZip()
      const folder = zip.folder("amazon_product_images")

      // Download all images and add them to the zip
      const imagePromises = imageUrls.map(async (url, index) => {
        try {
          const response = await fetch(url, {
            mode: "cors",
            credentials: "omit"
          })

          if (!response.ok) {
            throw new Error(
              `Failed to download image ${index + 1}: ${response.status}`
            )
          }

          const blob = await response.blob()
          folder.file(`amazon_image_${index + 1}.jpg`, blob)
          return true
        } catch (err) {
          console.error(`Error downloading image ${index + 1}:`, err)
          return false
        }
      })

      await Promise.all(imagePromises)

      // Generate the zip file
      const zipContent = await zip.generateAsync({ type: "blob" })

      // Save the zip file
      saveAs(zipContent, "amazon_product_images.zip")
    } catch (err) {
      setError(
        `Failed to download all images: ${err instanceof Error ? err.message : String(err)}`
      )
    } finally {
      setDownloadingAll(false)
    }
  }

  const downloadVideo = async (url: string) => {
    setConvertingVideo(url)
    setError(null)

    chrome.windows.create(
      {
        url: chrome.runtime.getURL(
          `sandboxes/sandbox.html?m3u8Url=${url}&filename=${url}`
        ),
        type: "popup",
        state: "minimized"
      },
      function (createdWindow) {
        const windowId = createdWindow.id

        chrome.windows.onRemoved.addListener(function (closedWindowId) {
          if (closedWindowId === windowId) {
            console.log("Popup window closed!")
            setConvertingVideo(null)
          }
        })
      }
    )
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6"></div>
      <button
        onClick={handleScrapeImages}
        disabled={loading || convertingVideo !== null || downloadingAll}
        className="w-full py-2 rounded-lg font-bold text-[#111] transition disabled:opacity-50
                 bg-gradient-to-r from-[#f0c14b] to-[#ff9900]
                 hover:bg-gradient-to-r hover:from-[#e6b93e] hover:to-[#ff8c00]">
        {loading ? "Extracting..." : "Extract Product Media"}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-800 border border-red-300 rounded-lg">
          {error}
        </div>
      )}

      <div className="mt-4 flex gap-6">
        {/* Image Container */}
        <div className="flex-1 max-h-80 overflow-y-auto border rounded-lg pt-0 bg-gray-50 shadow-inner">
          <div className="sticky top-0 px-4 py-2 bg-white backdrop-blur-md bg-opacity-75 border-b rounded-t-lg">
            <div className="flex justify-between items-center">
              <p className="text-lg font-medium">🖼️ Images</p>
              {imageUrls.length > 0 && (
                <button
                  onClick={downloadAllImages}
                  disabled={downloadingAll}
                  className="flex items-center gap-1 py-1 px-3 bg-[#f0c14b] text-[#111] font-medium rounded-lg hover:bg-[#ddb347] transition disabled:opacity-50">
                  <Download className="w-4 h-4" />
                  {downloadingAll ? "Creating ZIP..." : "Download All"}
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 px-4">
            {imageUrls.length > 0 ? (
              imageUrls.map((url, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center mb-4 p-3 rounded-lg bg-white shadow hover:shadow-md transition">
                  <Image
                    src={url}
                    alt={`Amazon Image ${index + 1}`}
                    className="w-32 h-32 object-cover rounded-lg border border-gray-200 mb-2"
                  />
                  <button
                    onClick={() => downloadImage(url, index)}
                    disabled={downloadingAll}
                    className="w-full py-2 bg-[#f0c14b] text-[#111] font-medium rounded-lg hover:bg-[#ddb347] transition disabled:opacity-50">
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
          <p className="z-50 text-lg font-medium mb-4 sticky top-0 px-4 py-2 bg-white backdrop-blur-md bg-opacity-75 border-b rounded-t-lg">
            🎬 Videos
          </p>
          <div className="grid grid-cols-2 gap-4 px-4">
            {videoUrls.length > 0 ? (
              videoUrls.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center mb-4 p-3 rounded-lg bg-white shadow hover:shadow-md transition">
                  <div className="relative mb-2">
                    <Image
                      src={item.thumbnail}
                      alt="Video Thumbnail"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <div className="absolute inset-0 bg-black opacity-50 rounded-lg" />
                    <Play className="absolute inset-0 m-auto w-10 h-10 text-white opacity-80" />
                  </div>

                  <button
                    onClick={() => downloadVideo(item.url)}
                    disabled={convertingVideo === item.url || downloadingAll}
                    className={`w-full py-2 rounded-lg font-medium transition ${
                      convertingVideo === item.url
                        ? "bg-gray-400 text-white"
                        : "bg-[#f0c14b] text-[#111] hover:bg-[#ddb347]"
                    } disabled:opacity-50`}>
                    {convertingVideo === item.url ? "Downloading" : "Download"}
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 col-span-2 text-center mb-4">
                No product videos found.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
