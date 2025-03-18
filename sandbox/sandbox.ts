import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();

ffmpeg.load({
  coreURL: chrome.runtime.getURL('vendor/ffmpeg-core.js'),
  wasmURL: chrome.runtime.getURL('vendor/ffmpeg-core.wasm'),
  workerURL: chrome.runtime.getURL('vendor/ffmpeg-core.worker.js')
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "convertHLS") {
    try {
      const { m3u8Url } = message;
      const response = await fetch(m3u8Url);
      const m3u8Data = await response.arrayBuffer();

      await ffmpeg.writeFile('input.m3u8', new Uint8Array(m3u8Data));
      await ffmpeg.exec([
        '-protocol_whitelist', 'file,http,https,tcp,tls',
        '-i', 'input.m3u8',
        '-c', 'copy',
        'output.mp4'
      ]);

      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      sendResponse({ success: true, url, filename: `video_${Date.now()}.mp4` });

    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

export default {}; // Plasmo requires an export in sandbox scripts
