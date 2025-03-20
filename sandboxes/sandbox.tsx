import JSZip from "jszip"
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
  const [m3u8Urls, setM3u8Urls] = useState<string[]>([])
  const [filename, setFilename] = useState<string>("video")
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const completedDownloads = useRef<number>(0)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const m3u8UrlsParam = urlParams.getAll("m3u8Url")
    const filenameParam = urlParams.get("filename")

    if (m3u8UrlsParam.length > 0) {
      setM3u8Urls(m3u8UrlsParam.map(decodeURIComponent))
      setFilename(decodeURIComponent(filenameParam || "video"))

      if (m3u8UrlsParam.length === 1) {
        processSingleHLSVideo(m3u8UrlsParam[0])
      } else {
        processAllHLSVideos(m3u8UrlsParam.map(decodeURIComponent))
      }
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

  const processHLSVideo = async (url: string, index: number) => {
    try {
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1)
      let manifest = await fetchAndParseM3U8(url)

      if (manifest.playlists?.length) {
        updateStatus("Master playlist detected. Fetching sub-playlist...")
        const subPlaylistUrl = baseUrl + manifest.playlists[0].uri
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
        segmentUrls.map(async (url, i) => {
          updateStatus(`Downloading segment ${i + 1}/${segmentUrls.length}`)
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
        .map((_, i) => `file 'segment_${i}.ts'`)
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
        `output.mp4`
      )

      updateStatus("FFMPEG processing complete!")
      const outputData = ffmpeg.FS("readFile", `output.mp4`)
      const blob = new Blob([outputData.buffer], { type: "video/mp4" })

      return { blob, name: `${filename}/video_${index}.mp4` }
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
      throw error
    }
  }

  const processSingleHLSVideo = async (url: string) => {
    try {
      const { blob } = await processHLSVideo(url, 0)
      handleBlobDownload(blob, `${filename}.mp4`)
    } catch (error) {
      console.error("Error processing video:", error)
    }
  }

  const processAllHLSVideos = async (urls: string[]) => {
    try {
      const zip = new JSZip()
      const folder = zip.folder(filename)!
      const results = await Promise.all(
        urls.map((url, index) => processHLSVideo(url, index))
      )

      results.forEach(({ blob, name }) => {
        folder.file(name.split("/").pop()!, blob)
      })

      const zipBlob = await zip.generateAsync({ type: "blob" })
      handleBlobDownload(zipBlob, `${filename}.zip`)
    } catch (error) {
      console.error("Error processing videos:", error)
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
            completedDownloads.current++
            if (completedDownloads.current === m3u8Urls.length) {
              window.close()
            }
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
