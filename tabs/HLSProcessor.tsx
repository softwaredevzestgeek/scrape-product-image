// src/components/HLSProcessor.tsx
import { Parser } from "m3u8-parser"
import React, { useEffect, useState } from "react"

// Define the types
declare global {
  interface Window {
    parent: {
      postMessage: (message: any, targetOrigin: string) => void
    }
  }
}

// Props to pass m3u8Url and filename dynamically
interface HLSProcessorProps {
  m3u8Url: string
  filename: string
}

const HLSProcessor: React.FC<HLSProcessorProps> = ({ m3u8Url, filename }) => {
  const [status, setStatus] = useState<string>("Loading FFMPEG...")

  // Function to send status updates to parent
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

  // Process HLS video
  const processHLSVideo = async () => {
    try {
      updateStatus("Fetching M3U8 content...")

      // Fetch M3U8 content
      const response = await fetch(m3u8Url)
      const m3u8Content = await response.text()

      updateStatus("Parsing M3U8 content...")

      // Parse M3U8 content
      const parser = new Parser()
      parser.push(m3u8Content)
      parser.end()
      const manifest = parser.manifest

      let segmentUrls: string[] = []
      let baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1)

      if (manifest.segments?.length) {
        updateStatus(`Found ${manifest.segments.length} segments.`)
        segmentUrls = manifest.segments.map((segment) => baseUrl + segment.uri)
      } else if (manifest.playlists?.length) {
        updateStatus("Found playlist, fetching first playlist...")
        const playlistUrl = new URL(manifest.playlists[0].uri, m3u8Url).href

        const playlistResponse = await fetch(playlistUrl)
        const playlistContent = await playlistResponse.text()

        const playlistParser = new Parser()
        playlistParser.push(playlistContent)
        playlistParser.end()

        const playlistManifest = playlistParser.manifest

        if (playlistManifest.segments?.length) {
          updateStatus(
            `Found ${playlistManifest.segments.length} segments in playlist.`
          )
          baseUrl = playlistUrl.substring(0, playlistUrl.lastIndexOf("/") + 1)
          segmentUrls = playlistManifest.segments.map(
            (segment) => baseUrl + segment.uri
          )
        } else {
          throw new Error("No segments found in playlist.")
        }
      } else {
        throw new Error("No segments or playlists found in manifest.")
      }

      updateStatus(`Downloading ${segmentUrls.length} segments...`)

      // Download segments
      const segments = await Promise.all(
        segmentUrls.map(async (url, index) => {
          updateStatus(`Downloading segment ${index + 1}/${segmentUrls.length}`)
          const segmentResponse = await fetch(url)
          return await segmentResponse.arrayBuffer()
        })
      )

      updateStatus("All segments downloaded. Initializing FFMPEG...")

      // Load FFMPEG from vendor
      const { createFFmpeg, fetchFile } = await import(
        chrome.runtime.getURL("vendor/ffmpeg-core.js")
      )

      const ffmpeg = createFFmpeg({
        log: true,
        coreURL: chrome.runtime.getURL("vendor/ffmpeg-core.js"),
        wasmURL: chrome.runtime.getURL("vendor/ffmpeg-core.wasm"),
        workerURL: chrome.runtime.getURL("vendor/ffmpeg-core.worker.js")
      })

      await ffmpeg.load()

      updateStatus("FFMPEG ready. Starting processing...")

      // Write segments to virtual file system
      const concatFileContent = segments
        .map((_, index) => `file 'segment_${index}.ts'`)
        .join("\n")

      for (let i = 0; i < segments.length; i++) {
        ffmpeg.FS("writeFile", `segment_${i}.ts`, new Uint8Array(segments[i]))
      }
      ffmpeg.FS("writeFile", "concat.txt", concatFileContent)

      // Run FFMPEG to concatenate and process
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

      // Get the output file
      const outputData = ffmpeg.FS("readFile", `${filename}.mp4`)
      const blob = new Blob([outputData.buffer], { type: "video/mp4" })
      const url = URL.createObjectURL(blob)

      // Send the URL to the parent window
      window.parent.postMessage(
        {
          action: "processingComplete",
          dataUrl: url
        },
        "*"
      )
    } catch (error: any) {
      console.error("Error processing HLS video:", error)
      window.parent.postMessage(
        {
          action: "processingError",
          error: error.message
        },
        "*"
      )
    }
  }

  useEffect(() => {
    processHLSVideo()
  }, [])

  return <div>{status}</div>
}

export default HLSProcessor
