import { useState, useEffect } from "react";

function IndexPopup() {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<{ url: string; thumbnail: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [convertingVideo, setConvertingVideo] = useState<string | null>(null);
  const [conversionProgress, setConversionProgress] = useState<number>(0);


  useEffect(() => {
    // Listen for scraped data from content script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === "scrapedData") {
        console.log("Received Scraped Data:", message);

        if (message.images) {
          setImageUrls(message.images);
        }
        if (message.videos) {
          setVideoUrls(message.videos);
        }
        setLoading(false);
      }

      if (message.action === "conversionProgress") {
        console.log(`Conversion Progress: ${message.progress}%`);
        setConversionProgress(message.progress);
      }
  
      if (message.action === "conversionComplete") {
        console.log("Conversion complete!");
        setTimeout(() => {
          setConvertingVideo(null);
          setConversionProgress(0); // Reset progress after UI updates
        }, 1000);
      }
  
      if (message.action === "conversionError") {
        console.error(`Conversion failed: ${message.error}`);
        setError(`Conversion failed: ${message.error}`);
        setConvertingVideo(null);
        setConversionProgress(0);
      }

    });
  }, [convertingVideo]);

  const handleScrapeImages = async () => {
    setLoading(true);
    setError(null);
    setImageUrls([]);
    setVideoUrls([]);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab.id) {
        console.log("Sending message to content script to scrape images...");
        chrome.tabs.sendMessage(tab.id, { action: "scrapeImages" });
      } else {
        setError("No active tab found");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error scraping content:", error);
      setError("Failed to scrape content: " + (error instanceof Error ? error.message : String(error)));
      setLoading(false);
    }
  };

  const downloadImage = (url: string, index: number) => {
    console.log(`Downloading image: ${url}`);
    const link = document.createElement("a");
    link.href = url;
    link.download = `amazon_image_${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadVideo = async (url: string) => {
    console.log(`Starting conversion for video: ${url}`);
    setConvertingVideo(url);
    setError(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab.id) {
        console.log(`Sending message to content script to convert video: ${url}`);
        chrome.tabs.sendMessage(tab.id, { 
          action: "convertHLS", 
          url: url 
        });
      } else {
        console.error("No active tab found");
        setError("No active tab found");
        setConvertingVideo(null);
      }
    } catch (error) {
      console.error("Error downloading video:", error);
      setError("Failed to download video: " + (error instanceof Error ? error.message : String(error)));
      setConvertingVideo(null);
    }
  };

  return (
    <div style={{ width: "620px", padding: "16px", display: "flex", flexDirection: "column" }}>
      <h1 style={{ textAlign: "center", fontSize: "18px", marginBottom: "10px" }}>Amazon Media Scraper</h1>

      {/* Scrape Button */}
      <button
        onClick={handleScrapeImages}
        disabled={loading || convertingVideo !== null}
        style={{
          padding: "10px",
          background: "#f0c14b",
          border: "1px solid #a88734",
          borderRadius: "3px",
          cursor: loading || convertingVideo !== null ? "not-allowed" : "pointer",
          fontSize: "16px",
          fontWeight: "bold",
          width: "100%",
          marginBottom: "10px",
        }}
      >
        {loading ? "Scraping..." : "Scrape Product Media"}
      </button>

      {/* Error Message */}
      {error && (
        <div style={{ padding: "10px", backgroundColor: "#ffe0e0", color: "#d8000c", border: "1px solid #d8000c", borderRadius: "3px", marginBottom: "10px" }}>
          {error}
        </div>
      )}

      {/* Content Layout */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "center", overflow: "hidden" }}>
        {/* Left Side - Images */}
        <div style={{ width: "300px", maxHeight: "450px", overflowY: "auto", border: "1px solid #ddd", padding: "10px" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "5px" }}>Images</h2>
          {imageUrls.length > 0 ? (
            imageUrls.map((url, index) => (
              <div key={index} style={{ marginBottom: "10px" }}>
                <img src={url} alt={`Amazon Image ${index + 1}`} style={{ width: "100%", borderRadius: "5px" }} />
                <button
                  onClick={() => downloadImage(url, index)}
                  style={{
                    width: "100%",
                    padding: "5px",
                    marginTop: "5px",
                    background: "#f0c14b",
                    border: "1px solid #a88734",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Download Image
                </button>
              </div>
            ))
          ) : (
            <p style={{ fontSize: "14px", color: "#666" }}>No product images found.</p>
          )}
        </div>

        {/* Right Side - Videos */}
        <div style={{ width: "300px", maxHeight: "450px", overflowY: "auto", border: "1px solid #ddd", padding: "10px" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "5px" }}>Videos</h2>
          {videoUrls.length > 0 ? (
            videoUrls.map((item, index) => (
              <div key={index} style={{ marginBottom: "10px" }}>
                <img src={item.thumbnail} alt="Video Thumbnail" style={{ width: "100%", borderRadius: "5px" }} />
                {/* <video src={url} controls style={{ width: "100%", borderRadius: "5px" }} /> */}
                <button
                  onClick={() => downloadVideo(item.url)}
                  disabled={convertingVideo === item.url}
                  style={{
                    width: "100%",
                    padding: "5px",
                    marginTop: "5px",
                    background: "#f0c14b",
                    border: "1px solid #a88734",
                    borderRadius: "3px",
                    cursor: convertingVideo === item.url ? "not-allowed" : "pointer",
                    fontSize: "14px",
                  }}
                >
                  {convertingVideo === item.url ? `Converting... (${conversionProgress}%)` : "Download Video"}
                </button>
                
              </div>
            ))
          ) : (
            <p style={{ fontSize: "14px", color: "#666" }}>No product videos found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default IndexPopup;