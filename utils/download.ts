import axios from "axios"
import { Parser } from "m3u8-parser"
import MP4Box from "mp4box"

export const downloadM3U8AsMP4 = async (
  m3u8Url: string,
  filename: string = "video.mp4"
) => {
  try {
    console.log("Initiating M3U8 download with URL:", m3u8Url)
    chrome.runtime.sendMessage({
      target: "offscreen",
      action: "processHLS",
      url: m3u8Url,
      filename: filename
    })
  } catch (error) {
    console.error("Error initiating M3U8 download:", error)
  }
}

// chrome.runtime.onMessage.addListener(async (message) => {
//   console.log("Received message in background:", message)
//   if (message.action === "downloadHLS") {
//     try {
//       await downloadHLS(message.url, message.filename)
//     } catch (error) {
//       console.error("Error downloading HLS:", error)
//     }
//   }
// })

// export const downloadHLS = async (m3u8Url: string, filename: string) => {
//   try {
//     console.log("Fetching M3U8 URL:", m3u8Url)
//     const response = await axios.get(m3u8Url)
//     console.log("M3U8 content fetched:", response.data)

//     const parser = new Parser()
//     parser.push(response.data)
//     parser.end()
//     const manifest = parser.manifest

//     console.log("Parsed manifest:", manifest)

//     let segmentUrls: string[] = []
//     let mediaPlaylistUrl: string | undefined

//     if (manifest.segments?.length) {
//       console.log("Manifest contains segments directly.")
//       mediaPlaylistUrl = m3u8Url
//       const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1)
//       segmentUrls = manifest.segments.map((segment) => baseUrl + segment.uri)
//     } else if (manifest.playlists?.length) {
//       console.log("Manifest contains playlists. Selecting the first one.")
//       const selectedPlaylist = manifest.playlists[0]
//       mediaPlaylistUrl = new URL(selectedPlaylist.uri, m3u8Url).href

//       console.log("Fetching media playlist URL:", mediaPlaylistUrl)
//       const mediaResponse = await axios.get(mediaPlaylistUrl)
//       const mediaParser = new Parser()
//       mediaParser.push(mediaResponse.data)
//       mediaParser.end()
//       const mediaManifest = mediaParser.manifest

//       console.log("Parsed media manifest:", mediaManifest)

//       if (!mediaManifest.segments?.length) {
//         throw new Error("No segments found in media manifest.")
//       }

//       const baseUrl = mediaPlaylistUrl.substring(
//         0,
//         mediaPlaylistUrl.lastIndexOf("/") + 1
//       )
//       segmentUrls = mediaManifest.segments.map(
//         (segment) => baseUrl + segment.uri
//       )
//     } else {
//       throw new Error("No segments or playlists found in manifest.")
//     }

//     console.log("Segment URLs to download:", segmentUrls)

//     const segmentBlobs = await Promise.all(
//       segmentUrls.map(async (url, index) => {
//         console.log(`Fetching segment ${index + 1}/${segmentUrls.length}:`, url)
//         const segmentResponse = await axios.get(url, {
//           responseType: "arraybuffer"
//         })
//         console.log(
//           `Segment ${index + 1} fetched with size:`,
//           segmentResponse.data.byteLength
//         )
//         return segmentResponse.data
//       })
//     )

//     console.log("All segments fetched. Initializing MP4Box.")
//     const mp4boxFile = MP4Box.createFile()

//     // Set up event listeners before appending data
//     let isReady = false

//     // Create a promise that resolves when the file is processed
//     const fileProcessed = new Promise((resolve, reject) => {
//       mp4boxFile.onReady = (info) => {
//         console.log("MP4Box is ready. File info:", info)
//         isReady = true

//         try {
//           // Save the processed file
//           const arrayBuffer = mp4boxFile.getBuffer()
//           resolve(arrayBuffer)
//         } catch (error) {
//           console.error("Error getting MP4 buffer:", error)
//           reject(error)
//         }
//       }

//       mp4boxFile.onError = (error) => {
//         console.error("MP4Box error:", error)
//         reject(error)
//       }
//     })

//     // Append all segments with correct fileStart
//     let offset = 0
//     for (let i = 0; i < segmentBlobs.length; i++) {
//       const segmentData = segmentBlobs[i]

//       // Create a new ArrayBuffer with fileStart property
//       const uint8Array = new Uint8Array(segmentData)
//       const buffer = uint8Array.buffer

//       // Add the fileStart property to the buffer
//       Object.defineProperty(buffer, "fileStart", {
//         value: offset,
//         writable: true
//       })

//       console.log(`Appending segment ${i + 1} with fileStart: ${offset}`)
//       mp4boxFile.appendBuffer(buffer)

//       offset += buffer.byteLength
//     }

//     // Flush the file to finish processing
//     console.log("All segments appended. Flushing MP4Box.")
//     mp4boxFile.flush()

//     // Wait for the processing to complete
//     const finalBuffer = await fileProcessed
//     console.log("MP4 processing completed. Final size:", finalBuffer.byteLength)

//     // Create a blob and trigger the download
//     const blob = new Blob([finalBuffer], { type: "video/mp4" })
//     const reader = new FileReader()

//     reader.onloadend = () => {
//       const base64Data = reader.result?.toString().split(",")[1]
//       console.log(
//         "MP4 file created and converted to Base64. Sending for download."
//       )
//       chrome.runtime.sendMessage({
//         action: "downloadVideo",
//         filename,
//         data: base64Data
//       })
//     }

//     reader.readAsDataURL(blob)
//   } catch (error) {
//     console.error("Error downloading HLS:", error)
//   }
// }
