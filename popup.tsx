import { useState, useEffect } from "react";
import { Image, Video, Download, LoaderCircle, Package, X } from "lucide-react";


function IndexPopup() {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<{ url: string; thumbnail: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [convertingVideo, setConvertingVideo] = useState<string | null>(null);
  const [conversionProgress, setConversionProgress] = useState<number>(0);
  const [fakeProgress, setFakeProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const messageListener = (message: any) => {
      console.log("[Popup] Received message:", message);

      if (message.action === "scrapedData") {
        setImageUrls(message.images || []);
        setVideoUrls(message.videos || []);
        setLoading(false);
      }

      if (message.action === "downloadCompleted") {
        console.log("[Popup]  Download completed:", message.filename);
        setMessage(` Download completed: ${message.filename}`);

        setConvertingVideo(null);
        setConversionProgress(0);
        setFakeProgress(0);
      }

      if (message.action === "conversionProgress") {
        setConversionProgress(message.progress);
      }

      if (message.action === "conversionComplete") {
        console.log("[Popup]  Conversion complete!");
        setFakeProgress(100);
        setTimeout(() => {
          setFakeProgress(0);
          setConversionProgress(0);
        }, 2000);
      }

      if (message.action === "conversionError") {
        setError(` Conversion failed: ${message.error}`);
        setConvertingVideo(null);
        setFakeProgress(0);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: "scrapeImages" });
        setLoading(true);
        setError(null);
      } else {
        setError(" No active tab found.");
      }
    });
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (convertingVideo) {
      setFakeProgress(5);
      interval = setInterval(() => {
        setFakeProgress((prev) => (prev >= 90 ? prev : prev + 5));
      }, 1000);
    } else {
      clearInterval(interval);
      setFakeProgress(0);
    }

    return () => clearInterval(interval);
  }, [convertingVideo]);

  return (
    <div style={{ width: "620px", padding: "16px", background: "#f9f9f9", borderRadius: "8px", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" }}>
      <h1 style={{ textAlign: "center", fontSize: "20px", fontWeight: "bold", color: "#ff9900", marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px", justifyContent:"center" }}>
      <Package style={{color:"#ff9900"}} /> Amazon Media Scraper
      </h1>

      {message && (
        <div style={{ padding: "12px", background: "#dff0d8", color: "#3c763d", borderRadius: "5px", fontWeight: "bold", marginBottom: "12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          {message}
          <X style={{cursor:"pointer"}} onClick={() => setMessage(null)} />
        </div>
      )}

      {error && (
        <div style={{ padding: "12px", background: "#ffe0e0", color: "#d8000c", borderRadius: "5px", fontWeight: "bold", marginBottom: "12px" }}>
          {error}
          <X onClick={() => setMessage(null)} />
        </div>
      )}

      <div style={{ display: "flex", gap: "16px", justifyContent: "center", overflow: "hidden" }}>
        {/* Images Section */}
        <div style={{ width: "48%", maxHeight: "500px", overflowY: "auto", background: "#fff", borderRadius: "8px", padding: "12px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px", color: "#444", display: "flex", alignItems: "center", gap: "5px", justifyContent: "center" }}>
            <Image size={18} /> Product Images
          </h2>
          {imageUrls.length > 0 ? (
            imageUrls.map((url, index) => (
              <div key={index} style={{ marginBottom: "12px", textAlign: "center" }}>
                <img src={url} alt={`Image ${index + 1}`} style={{ width: "100%", borderRadius: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `amazon_image_${index + 1}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  style={{
                    width: "100%",
                    padding: "6px",
                    marginTop: "6px",
                    background: "#ff9900",
                    border: "none",
                    borderRadius: "4px",
                    color: "#fff",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                  }}
                >
                  <Download size={16} /> Download Image
                </button>
              </div>
            ))
          ) : (
            <p style={{ textAlign: "center", color: "#777" }}>No images found.</p>
          )}
        </div>

        {/* Videos Section */}
        <div style={{ width: "48%", maxHeight: "500px", overflowY: "auto", background: "#fff", borderRadius: "8px", padding: "12px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px", color: "#444", display: "flex", alignItems: "center", gap: "5px",justifyContent: "center" }}>
            <Video size={18} /> Product Videos
          </h2>
          {videoUrls.length > 0 ? (
            videoUrls.map((item, index) => (
              <div key={index} style={{ marginBottom: "12px", textAlign: "center" }}>
                <div style={{height: "150px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        overflow: "hidden" }}>
                <img src={item.thumbnail} alt="Video Thumbnail" style={{ width: "100%", borderRadius: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            objectFit: "contain" }} />
                </div>
                <button
                onClick={() => {
                  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
                    if (tab.id) {
                      chrome.tabs.sendMessage(tab.id, { action: "convertHLS", url: item.url });
                      setConvertingVideo(item.url);
                      setConversionProgress(0);
                    } else {
                      setError("No active tab found.");
                    }
                  });
                }}
                  disabled={convertingVideo === item.url}
                  style={{
                    width: "100%",
                    padding: "6px",
                    marginTop: "6px",
                    background: convertingVideo === item.url ? "#ffcc00" : "#ff9900",
                    border: "none",
                    borderRadius: "4px",
                    color: "#fff",
                    fontWeight: "bold",
                    cursor: convertingVideo === item.url ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                  }}
                >
                  {convertingVideo === item.url ? <LoaderCircle size={16} /> : <Download size={16} />}
                  {convertingVideo === item.url ? "Converting..." : "Download Video"}
                </button>
              </div>
            ))
          ) : (
            <p style={{ textAlign: "center", color: "#777" }}>No videos found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default IndexPopup;
