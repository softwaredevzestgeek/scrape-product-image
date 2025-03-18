import FFmpegWrapper from './ffmpeg-wrapper';

const ffmpeg = new FFmpegWrapper(
  chrome.runtime.getURL('./vendor/ffmpeg-core.js'),
  chrome.runtime.getURL('./vendor/ffmpeg-core.wasm'),
  chrome.runtime.getURL('./vendor/ffmpeg-core.worker.js')
);

async function convertHLS(m3u8Url: string) {
  try {
    console.log("[Content Script] Starting HLS conversion for URL:", m3u8Url);

    // Load FFmpeg
    await ffmpeg.load();

    // Fetch the .m3u8 file
    const response = await fetch(m3u8Url);
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Write the file to FFmpeg's file system
    await ffmpeg.writeFile('input.m3u8', data);

    // Convert to MP4
    await ffmpeg.run(['-i', 'input.m3u8', 'output.mp4']);

    // Read the converted file
    const outputData = await ffmpeg.readFile('output.mp4');

    // Create a Blob from the MP4 data
    const blob = new Blob([outputData], { type: 'video/mp4' });

    // Create a URL for the Blob
    const blobUrl = URL.createObjectURL(blob);

    // Trigger download
    chrome.runtime.sendMessage({
      action: "triggerDownload",
      url: blobUrl,
      filename: "converted_video.mp4",
    });

    // Clean up
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("[Content Script] Conversion failed:", error);
    chrome.runtime.sendMessage({
      action: "conversionError",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Message listener
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "convertHLS") {
    convertHLS(message.url);
  }
});

// Scrape media data
function scrapeAndSendData() {
  console.log("Starting to scrape media data...");
  const div = document.querySelector("#imageBlockVariations_feature_div");
  if (!div) return console.log("No product media found.");

  const scriptTag = div.querySelector("script");
  if (scriptTag?.textContent) {
    const jsonStringMatch = scriptTag.textContent.match(/jQuery\.parseJSON\('(.*?)'\)/);
    if (jsonStringMatch && jsonStringMatch[1]) {
      try {
        const jsonString = jsonStringMatch[1]
          .replace(/\\"/g, '"')
          .replace(/\\/g, '');

        const obj = JSON.parse(jsonString);
        const videoData = obj?.videos?.map((video: { url: string; thumb?: string }) => ({
          url: video.url,
          thumbnail: video.thumb,
        })) || [];
        const colorKeys = Object.keys(obj?.colorImages || {});
        const imageUrls: string[] = [];

        if (colorKeys.length > 0) {
          const firstKey = colorKeys[0];
          obj.colorImages[firstKey].forEach((image: { hiRes?: string; large?: string }) => {
            if (image.hiRes) imageUrls.push(image.hiRes);
            else if (image.large) imageUrls.push(image.large);
          });
        }

        console.log("Scraped Image URLs:", imageUrls);
        console.log("Scraped Video URLs:", videoData);

        // Send data to popup
        chrome.runtime.sendMessage({
          action: "scrapedData",
          images: imageUrls,
          videos: videoData,
        });
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    }
  }
}

// Message listener
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "scrapeImages") {
    scrapeAndSendData();
  }
  if (message.action === "convertHLS") {
    convertHLS(message.url);
  }
});

// Initial scrape on page load
scrapeAndSendData();