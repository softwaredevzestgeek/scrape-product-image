// Function to create and load the sandboxed iframe
function createSandboxIframe() {
  const sandbox = document.createElement("iframe");
  sandbox.src = chrome.runtime.getURL("./sandbox/sandbox.html");
  sandbox.style.display = "none";
  sandbox.setAttribute("allow", "cross-origin-isolated");
  sandbox.setAttribute("sandbox", "allow-scripts allow-modals allow-popups allow-clipboard-write");
  document.body.appendChild(sandbox);
  return sandbox;
}

// Function to send a message to the sandboxed iframe
function sendMessageToSandbox(sandbox: HTMLIFrameElement, message: any) {
  console.log("[Content Script] Sending message to sandbox:", message);
  sandbox.contentWindow?.postMessage(message, "*");
}

// Function to request FFmpeg URLs from the background script
async function requestFFmpegURLs() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "requestFFmpegURLs" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// Global reference to sandbox iframe
let sandbox: HTMLIFrameElement | null = null;

// Function to handle HLS conversion
async function convertHLS(m3u8Url: string) {
  try {
    console.log("[Content Script] Starting HLS conversion for URL:", m3u8Url);

    // Create sandbox if it doesn't exist
    if (!sandbox) {
      sandbox = createSandboxIframe();

      // Wait for the iframe to load
      await new Promise<void>((resolve) => {
        sandbox.onload = () => {
          console.log("[Content Script] Sandbox iframe loaded.");
          resolve();
        };
      });
    

      // Request FFmpeg URLs and send to sandbox
      const ffmpegURLs = await requestFFmpegURLs();
      sendMessageToSandbox(sandbox, ffmpegURLs);
    }

    // Send conversion request to sandbox
    sendMessageToSandbox(sandbox, { action: "convertHLS", url: m3u8Url });
  } catch (error) {
    console.error("[Content Script] Error during conversion:", error);
  }
}

// Listen for messages from the sandbox
window.addEventListener("message", (event) => {
  if (event.data.action === "conversionComplete") {
    console.log("[Content Script] Conversion completed. Triggering download...");

    chrome.runtime.sendMessage({
      action: "triggerDownload",
      url: event.data.blobUrl,
      filename: "converted_video.mp4",
    });

    

    // Delay revoking the blob URL to ensure the download starts
    setTimeout(() => {
      URL.revokeObjectURL(event.data.blobUrl);
    }, 5000); // 5-second delay
  } else if (event.data.action === "conversionError") {
    console.error("[Content Script] Conversion failed:", event.data.error);
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "scrapeImages") {
    const images = Array.from(document.querySelectorAll("img")).map((img) => img.src);
    const videos = Array.from(document.querySelectorAll("video")).map((video) => ({
      url: video.src,
      thumbnail: video.poster || images[0], 
    }));
    scrapeAndSendData();
  }
  if (message.action === "convertHLS") {
    convertHLS(message.url);
  }
});

// Initial scrape on page load
scrapeAndSendData();
