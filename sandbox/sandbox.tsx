import { FFmpeg } from "@ffmpeg/ffmpeg";
// import { type MessagePayload } from "~types";

// Initialize FFmpeg once
const ffmpeg = new FFmpeg();
let initialized = false;

async function initializeFFmpeg() {
  if (initialized) return;
  
  await ffmpeg.load({
    coreURL: chrome.runtime.getURL("vendor/ffmpeg-core.js"),
    wasmURL: chrome.runtime.getURL("vendor/ffmpeg-core.wasm"),
    workerURL: chrome.runtime.getURL("vendor/ffmpeg-core.worker.js"),
  });
  initialized = true;
}

// Handle messages from content script
window.addEventListener("message", async (event: MessageEvent<any>) => {
  if (event.data.action === "CONVERT_HLS") {
    try {
      await initializeFFmpeg();
      const { url } = event.data.payload;
      
      // Fetch and process HLS
      const response = await fetch(url);
      const data = new Uint8Array(await response.arrayBuffer());
      
      await ffmpeg.writeFile("input.m3u8", data);
      await ffmpeg.exec(["-i", "input.m3u8", "output.mp4"]);
      
      const outputData = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([outputData], { type: "video/mp4" });

      // Send result back
      window.parent.postMessage({
        action: "CONVERSION_COMPLETE",
        payload: { blob }
      }, "*");
      
    } catch (error) {
      window.parent.postMessage({
        action: "CONVERSION_ERROR",
        payload: { error: error.message }
      }, "*");
    }
  }
});

// Empty component - we just need the script
export default function SandboxPage() {
  return null;
}