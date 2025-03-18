import { useEffect, useRef, useState } from "react";



export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

const DemoSand = () => {
  const iframeRef = useRef(null);
  const scriptLoaded = useRef(false);
  const ffmpegInstance = useRef<any>(null);
  const [editMode, setEditMode] = useState(false)
  const triggerLoad = useRef(false)

  const sendMessage = (message) => {
    iframeRef.current.contentWindow.postMessage(message, "*");
  };




  const loadFfmpeg = async () => {
    if (!scriptLoaded.current) return;
    if (!triggerLoad.current) return;
    if (ffmpegInstance.current) return;
    try {
      const { createFFmpeg } = (window as any)?.FFmpeg;

      if (!createFFmpeg) {
        console.error("FFmpeg is not available");
        return;
      }

      ffmpegInstance.current = createFFmpeg({
        // log: true, // Enable logs for debugging
        progress: (progress) => {
          console.log("Progress:", progress);
        },
        corePath: "/vendor/ffmpeg-core.js", // Ensure this path is correct
      });

      console.log("Loading FFmpeg...");
      await ffmpegInstance.current.load();
      console.log("FFmpeg Loaded!", ffmpegInstance.current?.isLoaded());
      sendMessage({ type: "ffmpeg-loaded" });
      // Notify the parent (background or popup script) that FFmpeg is ready
      // window.parent.postMessage({ type: "ready" }, "*");
    } catch (error) {
      sendMessage({
        type: "ffmpeg-load-error",
        error: JSON.stringify(error),
      });
      console.error("Error loading FFmpeg:", error);
    }
  };

  useEffect(() => {
    //   Load FFmpeg script dynamically
    document.body.style.margin = "0px";
    document.body.style.padding = "0px";
    const script = document.createElement("script");
    script.src = "/vendor/ffmpeg.min.js";
    script.async = true;

    script.onload = () => {
      scriptLoaded.current = true;
      loadFfmpeg();
    }

    document.body.appendChild(script);
  }, []);

  return <>
    <>
      <div style={{ display: 'none'}} >
        <iframe
          ref={iframeRef}
          src="../sandbox/sandbox.html"
          allowFullScreen={true}
          allow="clipboard-read; clipboard-write"
          sandbox="allow-scripts allow-modals allow-popups allow-clipboard-write"
          // sandbox="allow-scripts allow-same-origin allow-file-access-from-files allow-storage-access-by-user-activation"
          style={{
            width: "100%",
            border: "none",
            height: "100vh",
            // position: "absolute",
            top: 0,
            left: 0,
          }}
        ></iframe>
      </div>
    </>
  </>;
};

export default DemoSand;
