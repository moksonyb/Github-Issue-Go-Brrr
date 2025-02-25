/**
 * Custom QR code implementation for Epson printers
 * Based on ESC/POS documentation: https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/tmm30.html
 */

/**
 * QR Code error correction levels
 */
export enum QRErrorCorrectionLevel {
  L = 0, // 7% recovery capacity
  M = 1, // 15% recovery capacity
  Q = 2, // 25% recovery capacity
  H = 3  // 30% recovery capacity
}

/**
 * QR Code model
 */
export enum QRModel {
  Model1 = 1,
  Model2 = 2,
  Micro = 3
}

/**
 * Generate ESC/POS commands for printing QR codes on Epson printers
 */
export class EpsonQRCode {
  /**
   * Generate ESC/POS commands for printing a QR code
   * 
   * @param data The data to encode in the QR code
   * @param options QR code options
   * @returns Buffer containing ESC/POS commands
   */
  public static generate(
    data: string,
    options: {
      model?: QRModel;
      size?: number;
      errorCorrectionLevel?: QRErrorCorrectionLevel;
    } = {}
  ): Buffer {
    // Default options
    const model = options.model || QRModel.Model2;
    const size = options.size || 3; // 1-16
    const errorCorrectionLevel = options.errorCorrectionLevel || QRErrorCorrectionLevel.M;
    
    // Validate options
    if (size < 1 || size > 16) {
      throw new Error('QR code size must be between 1 and 16');
    }
    
    // Create buffers for each command
    const buffers: Buffer[] = [];
    
    // Function 165: Select QR code model
    buffers.push(Buffer.from([
      0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, model, 0x00
    ]));
    
    // Function 167: Set QR code size
    buffers.push(Buffer.from([
      0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size
    ]));
    
    // Function 169: Set QR code error correction level
    buffers.push(Buffer.from([
      0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, errorCorrectionLevel
    ]));
    
    // Function 180: Store QR code data
    const dataBuffer = Buffer.from(data);
    const pL = dataBuffer.length + 3;
    const pL1 = pL % 256;
    const pL2 = Math.floor(pL / 256);
    
    const storeHeader = Buffer.from([
      0x1D, 0x28, 0x6B, pL1, pL2, 0x31, 0x50, 0x30
    ]);
    
    buffers.push(Buffer.concat([storeHeader, dataBuffer]));
    
    // Function 181: Print QR code
    buffers.push(Buffer.from([
      0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30
    ]));
    
    // Combine all buffers
    return Buffer.concat(buffers);
  }
} 