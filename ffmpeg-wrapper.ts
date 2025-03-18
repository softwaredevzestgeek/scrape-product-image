class FFmpegWrapper {
    private ffmpeg: any;
    private coreURL: string;
    private wasmURL: string;
    private workerURL: string;
  
    constructor(coreURL: string, wasmURL: string, workerURL: string) {
      this.coreURL = coreURL;
      this.wasmURL = wasmURL;
      this.workerURL = workerURL;
    }
  
    async load() {
      // Dynamically load the FFmpeg core script
      const { createFFmpeg } = await import(this.coreURL);
      this.ffmpeg = createFFmpeg({
        corePath: this.coreURL,
        wasmPath: this.wasmURL,
        workerPath: this.workerURL,
      });
  
      await this.ffmpeg.load();
      console.log('FFmpeg loaded successfully.');
    }
  
    async run(command: string[]) {
      if (!this.ffmpeg) {
        throw new Error('FFmpeg is not loaded.');
      }
      await this.ffmpeg.run(...command);
    }
  
    async writeFile(filename: string, data: Uint8Array) {
      if (!this.ffmpeg) {
        throw new Error('FFmpeg is not loaded.');
      }
      this.ffmpeg.FS('writeFile', filename, data);
    }
  
    async readFile(filename: string): Promise<Uint8Array> {
      if (!this.ffmpeg) {
        throw new Error('FFmpeg is not loaded.');
      }
      return this.ffmpeg.FS('readFile', filename);
    }
  }
  
  export default FFmpegWrapper;