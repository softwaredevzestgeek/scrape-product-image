import { Parser } from "m3u8-parser"
import React, { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    parent: {
      postMessage: (message: any, targetOrigin: string) => void
    }
  }
}

const Sandbox: React.FC = () => {
  const [status, setStatus] = useState<string>("Initializing...")
  const [m3u8Url, setM3u8Url] = useState<string>("")
  const [filename, setFilename] = useState<string>("")
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const m3u8UrlParam = urlParams.get("m3u8Url")
    const filenameParam = urlParams.get("filename")

    if (m3u8UrlParam && filenameParam) {
      setM3u8Url(decodeURIComponent(m3u8UrlParam))
      setFilename(decodeURIComponent(filenameParam))
      processHLSVideo(decodeURIComponent(m3u8UrlParam))
    } else {
      setStatus("Error: Missing required parameters.")
    }
  }, [])

  const updateStatus = (newStatus: string) => {
    setStatus(newStatus)
    window.parent.postMessage(
      {
        action: "processingStatus",
        status: newStatus
      },
      "*"
    )
  }

  const fetchAndParseM3U8 = async (url: string) => {
    updateStatus(`Fetching M3U8 content from ${url}`)
    const response = await fetch(url)
    const content = await response.text()

    const parser = new Parser()
    parser.push(content)
    parser.end()

    return parser.manifest
  }

  const processHLSVideo = async (url: string) => {
    try {
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1)
      let manifest = await fetchAndParseM3U8(url)

      console.log(manifest, baseUrl, "baseUrlbaseUrlbaseUrl")

      if (manifest.playlists?.length) {
        updateStatus("Master playlist detected. Fetching sub-playlist...")
        const lastItem = manifest.playlists.length - 1
        const subPlaylistUrl = baseUrl + manifest.playlists[lastItem].uri
        manifest = await fetchAndParseM3U8(subPlaylistUrl)
      }

      if (!manifest.segments?.length) {
        throw new Error("No segments found in the playlist.")
      }

      const segmentUrls = manifest.segments.map(
        (segment) => baseUrl + segment.uri
      )
      updateStatus(`Found ${segmentUrls.length} segments. Downloading...`)

      const segments = await Promise.all(
        segmentUrls.map(async (url, index) => {
          updateStatus(`Downloading segment ${index + 1}/${segmentUrls.length}`)
          const segmentResponse = await fetch(url)
          return await segmentResponse.arrayBuffer()
        })
      )

      updateStatus("All segments downloaded. Initializing FFMPEG...")
      const { createFFmpeg, fetchFile } = await import(
        "../vendor/ffmpeg.min.js"
      )

      const ffmpeg = createFFmpeg({
        log: true,
        corePath: "../vendor/ffmpeg-core.js",
        wasmPath: "../vendor/ffmpeg-core.wasm",
        workerPath: "../vendor/ffmpeg-core.worker.js"
      })
      await ffmpeg.load()

      const concatFileContent = segments
        .map((_, index) => `file 'segment_${index}.ts'`)
        .join("\n")

      segments.forEach((segment, i) => {
        ffmpeg.FS("writeFile", `segment_${i}.ts`, new Uint8Array(segment))
      })

      ffmpeg.FS("writeFile", "concat.txt", concatFileContent)

      await ffmpeg.run(
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "concat.txt",
        "-c",
        "copy",
        `${filename}.mp4`
      )

      updateStatus("FFMPEG processing complete!")
      const outputData = ffmpeg.FS("readFile", `${filename}.mp4`)
      const blob = new Blob([outputData.buffer], { type: "video/mp4" })
      // const downloadUrl = URL.createObjectURL(blob)

      handleBlobDownload(blob, `${filename || "converted-video"}.mp4`)

      // console.log(downloadUrl, outputData, "downloadUrldownloadUrldownloadUrl")

      // const a = document.createElement("a")
      // a.href = downloadUrl
      // a.download = `${filename}.mp4`
      // a.click()
    } catch (error: any) {
      console.error("Error processing HLS video:", error)
      window.parent.postMessage(
        {
          action: "processingError",
          error: error.message
        },
        "*"
      )
      setStatus(`Error: ${error.message}`)
    }
  }

  const handleBlobDownload = (blob: Blob, filename: string) => {
    if (iframeRef.current) {
      const iframeWindow = iframeRef.current.contentWindow
      if (iframeWindow) {
        iframeWindow.postMessage(
          { type: "download-blob-file", blob, filename },
          "*"
        )

        window.addEventListener("message", (event) => {
          if (event.data.type === "download-complete") {
            window.close()
          }
        })
      }
    }
  }

  return (
    <div>
      {status}
      <iframe
        ref={iframeRef}
        src="/tabs/download-listner-iframe.html"
        title="Downloaded Video"
      />
    </div>
  )
}

export default Sandbox
