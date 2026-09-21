/**
 * High-Performance Weighing Scale Serial Communication Driver
 * Uses the Web Serial API (fully supported natively in Google Chrome, MS Edge, and Electron).
 * 
 * Works with any weighing indicator (e.g., Yaohua XK3190, Mettler Toledo, CAS, Avery, Keli)
 * connected via USB or an RS232-to-USB converter chip (CH340, FTDI, PL2303, CP210x).
 * 
 * programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com
 */

export interface ScaleConnectionOptions {
  baudRate?: number; // Standard: 9600, 4800, 2400, 19200
  dataBits?: 8 | 7;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
}

export class ScaleSerialDriver {
  private port: any | null = null;
  private reader: any | null = null;
  private keepReading = false;
  private buffer = '';

  // Standard indicator settings: Baud rate 9600, 8 data bits, no parity, 1 stop bit
  private defaultOptions: ScaleConnectionOptions = {
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
  };

  /**
   * Checks if the Web Serial API is supported in the current environment
   */
  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Prompts the user to select a USB serial port and establishes a continuous streaming connection
   * @param onWeightReceived Callback function triggered whenever a valid weight reading is parsed
   * @param onConnectionStatus Callback to report connection state changes
   * @param options Custom baud rate/parity options
   */
  public async connect(
    onWeightReceived: (weight: number, rawData: string) => void,
    onConnectionStatus: (connected: boolean, message?: string) => void,
    options?: ScaleConnectionOptions
  ): Promise<void> {
    if (!ScaleSerialDriver.isSupported()) {
      throw new Error('متصفحك أو بيئة التشغيل لا تدعم الاتصال المباشر بالمنافذ (Web Serial API). يرجى التحديث أو تشغيل النظام عبر متصفح Chrome أو Edge أو Electron.');
    }

    try {
      // 1. Request port from user
      // This triggers a native system popup showing available COM ports
      this.port = await (navigator as any).serial.requestPort();
      
      const config = { ...this.defaultOptions, ...options };
      
      // 2. Open the serial port
      await this.port.open({
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        stopBits: config.stopBits,
        parity: config.parity,
        bufferSize: 255 // Small buffer for low latency real-time readings
      });

      this.keepReading = true;
      onConnectionStatus(true, 'تم الاتصال بالميزان بنجاح عبر منفذ الـ USB');

      // 3. Start the non-blocking reader loop
      this.readLoop(onWeightReceived, onConnectionStatus);

    } catch (error: any) {
      this.port = null;
      const isCancellation = 
        error.name === 'NotFoundError' || 
        error.name === 'AbortError' || 
        (error.message && (error.message.includes('No port selected') || error.message.includes('user cancelled') || error.message.includes('canceled')));

      if (isCancellation) {
        onConnectionStatus(false, 'لم يتم اختيار منفذ');
        const cancelErr = new Error('USER_CANCELLED_PORT_SELECTION');
        cancelErr.name = 'NotFoundError';
        throw cancelErr;
      }

      onConnectionStatus(false, error.message || 'فشل الاتصال بالميزان');
      throw error;
    }
  }

  /**
   * Disconnects from the serial port gracefully
   */
  public async disconnect(): Promise<void> {
    this.keepReading = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) {
        // Ignore cancel errors
      }
      this.reader = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {
        // Ignore close errors
      }
      this.port = null;
    }
  }

  /**
   * Non-blocking continuous async read stream loop
   */
  private async readLoop(
    onWeightReceived: (weight: number, rawData: string) => void,
    onConnectionStatus: (connected: boolean, message?: string) => void
  ): Promise<void> {
    const textDecoder = new TextDecoder();

    while (this.port && this.port.readable && this.keepReading) {
      try {
        this.reader = this.port.readable.getReader();

        while (this.keepReading) {
          const { value, done } = await this.reader.read();
          if (done) {
            break;
          }
          
          if (value) {
            // Decode the binary Uint8Array chunk to ASCII string
            const chunkText = textDecoder.decode(value);
            this.buffer += chunkText;

            // Split buffer by carriage return or line feeds to get discrete frames
            const frames = this.buffer.split(/[\r\n]+/);
            
            // Keep the last incomplete slice in the buffer
            this.buffer = frames.pop() || '';

            for (const frame of frames) {
              const cleanedFrame = frame.trim();
              if (cleanedFrame.length > 0) {
                const parsedWeight = this.parseWeightFromFrame(cleanedFrame);
                if (parsedWeight !== null) {
                  onWeightReceived(parsedWeight, cleanedFrame);
                }
              }
            }
          }
        }
      } catch (error: any) {
        console.error('Serial Read Error:', error);
        // Retry connection loop if disconnected unexpectedly
        if (this.keepReading) {
          onConnectionStatus(false, 'انقطع الاتصال بالميزان تلقائياً، جاري محاولة الاستعادة...');
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } finally {
        if (this.reader) {
          this.reader.releaseLock();
        }
      }
    }
  }

  /**
   * Universal Industrial Weighing Scale ASCII Parser
   * Handles various standard scale output formats:
   * - Mettler Toledo: `ST,GS,+001250kg\r\n` or `US,GS, 01250.0 lb\r\n`
   * - Yaohua (Continuous): `ww001250\r\n` or `wn001250\r\n`
   * - Generic indicators: `+ 1250.45 kg` or `001250`
   */
  private parseWeightFromFrame(frame: string): number | null {
    try {
      // 1. Check if the frame contains letters or special format sequences
      // Remove units and standard prefixes
      let sanitized = frame
        .replace(/kg|g|lb|t/gi, '') // Remove standard weight unit suffixes
        .replace(/ST|US|GS|NT|OL|WN|WW|GR/gi, '') // Remove state labels (Stable, Unstable, Gross, Net, Overload)
        .replace(/[,;:=]/g, ' ') // Replace delimiters with spaces
        .trim();

      // 2. Extract the numeric parts (including potential minus or decimal signs)
      // Standard scale frames often pack numbers with leading zeros (e.g. +001250 or -00045.2)
      const match = sanitized.match(/(-|\+)?\s*\d+(\.\d+)?/);
      if (match) {
        const rawNumStr = match[0].replace(/\s+/g, ''); // Clear whitespace
        const parsedWeight = parseFloat(rawNumStr);
        if (!isNaN(parsedWeight)) {
          return parsedWeight;
        }
      }
    } catch (e) {
      console.warn('Failed to parse scale frame:', frame, e);
    }
    return null;
  }
}
