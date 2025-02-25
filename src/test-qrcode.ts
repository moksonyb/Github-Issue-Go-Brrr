import dotenv from 'dotenv';
import escpos = require('escpos');
import { EpsonQRCode, QRModel, QRErrorCorrectionLevel } from './epson-qrcode';

// Load environment variables
dotenv.config();

// These require statements are needed because of how escpos is structured
// eslint-disable-next-line @typescript-eslint/no-var-requires
const USB = require('escpos-usb');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Network = require('escpos-network');

// Register the adapters
escpos.USB = USB;
escpos.Network = Network;

/**
 * Test function to print a QR code
 */
async function testQRCode(): Promise<void> {
  console.log('Starting QR code test...');
  
  try {
    // Get printer device based on configuration
    const device = getPrinterDevice();
    const printer = new escpos.Printer(device);
    
    console.log('Connecting to printer...');
    
    // Open connection to printer
    device.open(function(err: Error) {
      if (err) {
        console.error('Error opening printer device:', err);
        return;
      }
      
      console.log('Printer connected. Printing test QR code...');
      
      // Test URL
      const testUrl = 'https://github.com/issues/test';
      
      // Print a test header and QR code
      printer
        .font('a')
        .align('ct')
        .style('b')
        .size(1, 1)
        .text('QR Code Test')
        .text('------------------------')
        .style('normal')
        .size(0, 0)
        .text('Testing QR code implementation')
        .text('\n')
        .text(`URL: ${testUrl}`)
        .text('\n')
        // Test with different sizes
        .text('Size 3 (Small):')
        .raw(EpsonQRCode.generate(testUrl, {
          model: QRModel.Model2,
          size: 3,
          errorCorrectionLevel: QRErrorCorrectionLevel.M
        }))
        .text('\n')
        .text('Size 6 (Medium):')
        .raw(EpsonQRCode.generate(testUrl, {
          model: QRModel.Model2,
          size: 6,
          errorCorrectionLevel: QRErrorCorrectionLevel.M
        }))
        .text('\n')
        .text('Size 10 (Large):')
        .raw(EpsonQRCode.generate(testUrl, {
          model: QRModel.Model2,
          size: 10,
          errorCorrectionLevel: QRErrorCorrectionLevel.M
        }))
        .text('\n')
        // Test with different error correction levels
        .text('Error Correction Level L (7%):')
        .raw(EpsonQRCode.generate(testUrl, {
          model: QRModel.Model2,
          size: 6,
          errorCorrectionLevel: QRErrorCorrectionLevel.L
        }))
        .text('\n')
        .text('Error Correction Level H (30%):')
        .raw(EpsonQRCode.generate(testUrl, {
          model: QRModel.Model2,
          size: 6,
          errorCorrectionLevel: QRErrorCorrectionLevel.H
        }))
        .text('\n')
        .align('lt')
        .text(`Test completed: ${new Date().toLocaleString()}`)
        .cut()
        .close();
      
      console.log('Test QR code printed successfully!');
    });
  } catch (error) {
    console.error('Error in QR code test:', error);
  }
}

/**
 * Get printer device based on environment configuration
 */
function getPrinterDevice(): any {
  const printerType = process.env.PRINTER_TYPE === 'network' ? 'network' : 'usb';
  
  if (printerType === 'usb') {
    const vendorId = parseInt(process.env.PRINTER_VENDOR_ID || '0', 16);
    const productId = parseInt(process.env.PRINTER_PRODUCT_ID || '0', 16);
    console.log(`Using USB printer (Vendor ID: ${vendorId.toString(16)}, Product ID: ${productId.toString(16)})`);
    return new escpos.USB(vendorId, productId);
  } else {
    const host = process.env.PRINTER_IP || '127.0.0.1';
    const port = parseInt(process.env.PRINTER_PORT || '9100', 10);
    console.log(`Using Network printer (IP: ${host}, Port: ${port})`);
    return new escpos.Network(host, port);
  }
}

// Run the test
testQRCode().catch(console.error); 