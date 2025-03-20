import { useEffect } from "react"

const Sandbox: React.FC = () => {
  useEffect(() => {
    console.log("Sandbox component mounted")
    window.addEventListener("message", async (event) => {
      const message = event.data
      console.log("Received blob:", message.blob)
      if (message.type === "download-blob-file") {
        console.log("Received blob:", message.blob, message?.filename)
        const url = window.URL.createObjectURL(message.blob)
        chrome.downloads.download(
          {
            url: url,
            filename: message?.filename || "video.mp4"
          },
          () => {
            window.URL.revokeObjectURL(url)
            window.parent.postMessage({ type: "download-complete" }, "*")
          }
        )
      }
    })
  }, [])

  return <div>Sandbox</div>
}

export default Sandbox
