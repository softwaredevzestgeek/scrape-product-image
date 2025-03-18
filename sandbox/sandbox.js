console.log("[Sandbox] Sandbox script loaded.");

let ffmpeg = null;

async function initializeFFmpeg(ffmpegCorePath, ffmpegWasmPath, ffmpegWorkerPath) {
  console.log("[Sandbox] Initializing FFmpeg...");
  try {
    const { createFFmpeg } = FFmpeg; // Use the global FFmpeg object

    // Configure with threads: false to avoid SharedArrayBuffer requirement
    ffmpeg = createFFmpeg({
      log: true,
      corePath: ffmpegCorePath,
      wasmPath: ffmpegWasmPath,
      workerPath: ffmpegWorkerPath,
      threads: false, // Disable multi-threading
      noWebWorker: true, // Disable WebWorker for isolated environments like iframe
      worker: false, // Disable worker as well for environments without threading
    });

    await ffmpeg.load();
    console.log("[Sandbox] FFmpeg loaded successfully!");
  } catch (error) {
    console.error("[Sandbox] Failed to initialize FFmpeg:", error);
    throw new Error("Failed to initialize FFmpeg");
  }
}

window.addEventListener("message", async (event) => {
  console.log("[Sandbox] Received message:", event);

  // Check if the message is from the extension
  if (event.source !== window.parent) {
    console.log("[Sandbox] Ignoring message from unknown source.");
    return;
  }

  if (event.data.action === "convertHLS") {
    console.log("[Sandbox] Starting conversion process...");
    console.log("[Sandbox] M3U8 URL:", event.data.m3u8Url);

    try {
      if (!ffmpeg) {
        await initializeFFmpeg(
          event.data.ffmpegCorePath,
          event.data.ffmpegWasmPath,
          event.data.ffmpegWorkerPath
        ); // Pass the FFmpeg core path
      }

      // Fetch the .m3u8 file
      console.log("[Sandbox] Fetching .m3u8 file from URL:", event.data.m3u8Url);
      const response = await fetch(event.data.m3u8Url);
      const m3u8Data = await response.text();
      console.log("[Sandbox] .m3u8 file fetched successfully!");
      console.log("[Sandbox] .m3u8 file contents:", m3u8Data);

      // Write the .m3u8 file to FFmpeg's filesystem
      console.log("[Sandbox] Writing .m3u8 file to FFmpeg's filesystem...");
      ffmpeg.FS("writeFile", "input.m3u8", new TextEncoder().encode(m3u8Data));

      // Convert to .mp4
      console.log("[Sandbox] Starting conversion to .mp4...");
      ffmpeg.setLogging(true); // Enable detailed logging
      await ffmpeg.run(
        "-i", "input.m3u8",
        "-c:v", "libx264", // Re-encode video with H.264
        "-c:a", "aac",     // Re-encode audio with AAC
        "output.mp4"
      );
      console.log("[Sandbox] Conversion completed successfully!");

      // Verify output file exists
      const files = ffmpeg.FS("readdir", "/");
      console.log("[Sandbox] Files in FFmpeg FS:", files);

      if (!files.includes("output.mp4")) {
        throw new Error("Output file not found in FFmpeg FS");
      }

      // Read the output file
      console.log("[Sandbox] Reading output .mp4 file...");
      const outputData = ffmpeg.FS("readFile", "output.mp4");

      // Create a Blob URL for the output file
      console.log("[Sandbox] Creating Blob URL for the output file...");
      const outputBlob = new Blob([outputData.buffer], { type: "video/mp4" });
      const outputUrl = URL.createObjectURL(outputBlob);

      // Send the result back to the content script
      console.log("[Sandbox] Sending conversion result to content script...");
      window.parent.postMessage(
        {
          action: "conversionComplete",
          url: outputUrl,
          filename: "converted_video.mp4",
        },
        "*" // Allow postMessage to all domains (suitable for sandboxed iframe)
      );

      // Optionally revoke the Blob URL after use (to avoid memory leaks)
      outputUrl && URL.revokeObjectURL(outputUrl);

    } catch (error) {
      console.error("[Sandbox] Conversion failed:", error);
      window.parent.postMessage(
        {
          action: "conversionError",
          error: error instanceof Error ? error.message : String(error),
        },
        "*" // Allow postMessage to all domains (suitable for sandboxed iframe)
      );
    }
  }
});