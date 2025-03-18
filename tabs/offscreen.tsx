import axios from "axios"
import { Parser } from "m3u8-parser"
import React, { useEffect } from "react"

const Offscreen = () => {
  const downloadHLS = async (m3u8Url: string, filename: string) => {
    try {
      const response = await axios.get(m3u8Url)
      const parser = new Parser()
      parser.push(response.data)
      parser.end()
      const manifest = parser.manifest

      let segmentUrls: string[]
      let mediaPlaylistUrl: string | undefined

      if (manifest.segments && manifest.segments.length > 0) {
        // Media Playlist
        mediaPlaylistUrl = m3u8Url
        const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1)
        segmentUrls = manifest.segments.map((segment) => baseUrl + segment.uri)
      } else if (manifest.playlists && manifest.playlists.length > 0) {
        // Master Playlist
        const selectedPlaylist = manifest.playlists[0] as any // Select the first playlist
        mediaPlaylistUrl = new URL(selectedPlaylist.uri, m3u8Url).href

        const mediaResponse = await axios.get(mediaPlaylistUrl)
        const mediaParser = new Parser()
        mediaParser.push(mediaResponse.data)
        mediaParser.end()
        const mediaManifest = mediaParser.manifest

        if (!mediaManifest.segments || mediaManifest.segments.length === 0) {
          throw new Error("No segments found in media manifest.")
        }

        const baseUrl = mediaPlaylistUrl.substring(
          0,
          mediaPlaylistUrl.lastIndexOf("/") + 1
        )
        segmentUrls = mediaManifest.segments.map(
          (segment) => baseUrl + segment.uri
        )
      } else {
        throw new Error("No segments or playlists found in manifest.")
      }

      const segmentBlobs = await Promise.all(
        segmentUrls.map(async (url) => {
          const segmentResponse = await axios.get(url, {
            responseType: "arraybuffer"
          })
          return new Blob([segmentResponse.data], { type: "video/mp2t" })
        })
      )

      const combinedBlob = new Blob(segmentBlobs, { type: "video/mp2t" })
      const arrayBuffer = await combinedBlob.arrayBuffer()
      const mp4Blob = new Blob([arrayBuffer], { type: "video/mp4" })
      const reader = new FileReader()

      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(",")[1]
        chrome.runtime.sendMessage({
          action: "downloadVideo",
          filename: filename.endsWith(".mp4") ? filename : `${filename}.mp4`,
          data: base64Data
        })
      }

      reader.readAsDataURL(mp4Blob)
    } catch (error) {
      console.error("Error downloading HLS:", error)
    }
  }

  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.target === "offscreen" && message.action === "downloadHLS") {
        downloadHLS(message.url, message.filename)
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  return <div style={{ display: "none" }}></div>
}

export default Offscreen
