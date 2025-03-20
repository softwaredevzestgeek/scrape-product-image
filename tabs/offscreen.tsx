import React, { useEffect, useRef, useState } from "react"

const HLSProcessor: React.FC = () => {
  const [status, setStatus] = useState<string>("Ready to process HLS videos")
  const iframeRef = useRef<HTMLIFrameElement>(null)
  let currentRequest = useRef<{ url: string; filename: string } | null>(null)

  // Listen for messages from the background script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message?.target === "offscreen" && message?.action === "processHLS") {
        processHLSVideo(message.url, message.filename)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  // Function to process the HLS video
  const processHLSVideo = async (m3u8Url: string, filename: string) => {
    setStatus("Starting HLS processing...")

    // Store the current request
    currentRequest.current = {
      url: m3u8Url,
      filename: filename
    }

    try {
      // Create a URL for the ffmpeg processor page
      const processorUrl = chrome.runtime.getURL("ffmpeg-processor.html")

      // Add parameters to the URL
      const url = new URL(processorUrl)
      url.searchParams.append("m3u8Url", encodeURIComponent(m3u8Url))
      url.searchParams.append("filename", encodeURIComponent(filename))

      // Load the processor page in the iframe
      if (iframeRef.current) {
        iframeRef.current.src = url.toString()
      }

      setStatus("HLS processor loaded, waiting for processing to complete...")
    } catch (error: any) {
      setStatus(`Error: ${error.message}`)
      console.error("Error in offscreen processing:", error)
    }
  }

  // Listen for messages from the iframe
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.source === iframeRef.current?.contentWindow) {
        const message = event.data

        if (message.action === "processingComplete") {
          setStatus("Processing complete, sending data back to background...")

          // Send the processed data back to the background script
          chrome.runtime.sendMessage({
            action: "videoProcessed",
            dataUrl: message.dataUrl,
            filename: currentRequest.current?.filename
          })

          setStatus("Data sent to background, ready for download.")
        } else if (message.action === "processingError") {
          setStatus(`Processing error: ${message.error}`)
          console.error("Processing error:", message.error)
        } else if (message.action === "processingStatus") {
          setStatus(`Status: ${message.status}`)
        }
      }
    }

    window.addEventListener("message", handleIframeMessage)
    return () => {
      window.removeEventListener("message", handleIframeMessage)
    }
  }, [])

  return (
    <div>
      <div id="status">{status}</div>
      <iframe
        ref={iframeRef}
        id="ffmpeg-iframe"
        style={{ display: "none" }}></iframe>
    </div>
  )
}

export default HLSProcessor
