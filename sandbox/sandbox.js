let ffmpegInstance = null;

// Request FFmpeg URLs from the content script
window.parent.postMessage({ action: "requestFFmpegURLs" }, "*");

window.addEventListener("message", async (event) => {
  if (event.data.action === "ffmpegURLs") {
    const { ffmpegScriptURL, ffmpegCoreURL } = event.data;
    loadFfmpeg(ffmpegScriptURL, ffmpegCoreURL);
  }
});

async function loadFfmpeg(ffmpegScriptURL, ffmpegCoreURL) {
  console.log("[Sandbox] Attempting to load FFmpeg...");

  if (ffmpegInstance) {
    console.log("[Sandbox] FFmpeg is already loaded.");
    return ffmpegInstance;
  }

  const script = document.createElement("script");
  script.src = ffmpegScriptURL;
  script.async = true;

  script.onload = async () => {
    console.log("[Sandbox] FFmpeg script loaded!");

    if (!window.FFmpeg || !window.FFmpeg.createFFmpeg) {
      console.error("[Sandbox] FFmpeg library is not available.");
      return;
    }

    const { createFFmpeg } = window.FFmpeg;

    ffmpegInstance = createFFmpeg({
      log: true,
      corePath: ffmpegCoreURL,
      worker: true,
    });

    try {
      console.log("[Sandbox] Loading FFmpeg...");
      await ffmpegInstance.load();
      console.log("[Sandbox] FFmpeg successfully loaded!");
    } catch (error) {
      console.error("[Sandbox] Error loading FFmpeg:", error);
      ffmpegInstance = null;
    }
  };

  script.onerror = () => {
    console.error("[Sandbox] Failed to load FFmpeg script.");
  };

  document.body.appendChild(script);
}

async function waitForFFmpeg() {
  let attempts = 0;
  while (!ffmpegInstance || !ffmpegInstance.isLoaded()) {
    console.log(`[Sandbox] Waiting for FFmpeg to load... Attempt ${attempts + 1}`);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms before retrying
    attempts++;

    if (attempts > 10) { // Give up after 10 attempts (5 seconds)
      console.error("[Sandbox] FFmpeg failed to load after multiple attempts!");
      return false;
    }
  }
  console.log("[Sandbox] FFmpeg is ready!");
  return true;
}

async function fetchM3U8WithSegments(m3u8Url) {
  console.log("[Sandbox] Fetching M3U8 file:", m3u8Url);

  const response = await fetch(m3u8Url);
  if (!response.ok) throw new Error("Failed to fetch M3U8 file");

  const m3u8Text = await response.text();
  console.log("[Sandbox] M3U8 File Content:\n", m3u8Text);

  const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1);

  // Extract video playlist M3U8 files
  let streamUrls = m3u8Text
    .split("\n")
    .filter((line) => line.includes(".m3u8"))
    .map((line) => (line.startsWith("http") ? line : baseUrl + line));

  console.log("[Sandbox] Extracted stream playlists:", streamUrls);

  if (streamUrls.length === 0) {
    throw new Error("No video playlists found in M3U8 file!");
  }

  //  Fetch the first available M3U8 video playlist (e.g., 720p)
  console.log("[Sandbox] Fetching first video playlist:", streamUrls[0]);
  return await fetchM3U8Segments(streamUrls[0]);
}

async function fetchM3U8Segments(videoPlaylistUrl) {
  console.log("[Sandbox] Fetching video M3U8 file:", videoPlaylistUrl);

  const response = await fetch(videoPlaylistUrl);
  if (!response.ok) throw new Error("Failed to fetch video M3U8 file");

  const m3u8Text = await response.text();
  console.log("[Sandbox] Video M3U8 File Content:\n", m3u8Text);

  const baseUrl = videoPlaylistUrl.substring(0, videoPlaylistUrl.lastIndexOf("/") + 1);

  // Extract .ts segment URLs
  let tsUrls = m3u8Text
    .split("\n")
    .filter((line) => line.includes(".ts"))
    .map((line) => (line.startsWith("http") ? line : baseUrl + line));

  console.log("[Sandbox] Extracted TS Segments:", tsUrls);

  if (tsUrls.length === 0) {
    throw new Error("No .ts files found in video M3U8 file!");
  }

  // Download and store .ts segments in FFmpeg memory
  const tsFiles = [];
  for (let i = 0; i < tsUrls.length; i++) {
    console.log(`[Sandbox] Downloading segment: ${tsUrls[i]}`);

    const tsResponse = await fetch(tsUrls[i]);
    if (!tsResponse.ok) throw new Error(`Failed to fetch segment: ${tsUrls[i]}`);

    const tsData = new Uint8Array(await tsResponse.arrayBuffer());

    // Write the .ts file to FFmpeg’s in-memory file system
    const tsFileName = `segment${i}.ts`;
    ffmpegInstance.FS("writeFile", tsFileName, tsData);
    tsFiles.push(tsFileName);
  }

  return tsFiles;
}





window.addEventListener("message", async (event) => {
  if (event.data.action === "convertHLS") {
    console.log("[Sandbox] Received conversion request.");

    // Fix: Wait until FFmpeg is fully loaded
    if (!(await waitForFFmpeg())) {
      window.parent.postMessage({ action: "conversionError", error: "FFmpeg failed to load" }, "*");
      return;
    }

    try {
      const m3u8Url = event.data.url;
      console.log("[Sandbox] Fetching M3U8 and TS segments:", m3u8Url);

      const tsFiles = await fetchM3U8WithSegments(m3u8Url);

      const ffmpegM3U8Content = tsFiles.map((file) => `file '${file}'`).join("\n");
      ffmpegInstance.FS("writeFile", "playlist.m3u8", ffmpegM3U8Content);

      console.log("[Sandbox] Running FFmpeg conversion...");

      

      await ffmpegInstance.run(
        "-f", "concat",
        "-safe", "0",
        "-i", "playlist.m3u8",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-strict", "experimental",
        "output.mp4"
      );

      console.log("[Sandbox] Checking if output.mp4 exists...");
      const files = ffmpegInstance.FS("readdir", "/");
      console.log("[Sandbox] FFmpeg FS Files:", files);

      if (!files.includes("output.mp4")) {
        console.error("[Sandbox] output.mp4 file not found!");
        window.parent.postMessage({ action: "conversionError", error: "MP4 file not created" }, "*");
        return;
      }

      console.log("[Sandbox] Conversion completed!");
      const outputData = ffmpegInstance.FS("readFile", "output.mp4");

      const mp4Blob = new Blob([outputData.buffer], { type: "video/mp4" });
      const mp4BlobUrl = URL.createObjectURL(mp4Blob);

      window.parent.postMessage({ action: "conversionComplete", blobUrl: mp4BlobUrl }, "*");

    } catch (error) {
      console.error("[Sandbox] Error during conversion:", error);
      window.parent.postMessage({ action: "conversionError", error: error.message }, "*");
    }
  }
});
