declare module 'escpos' {
  class Printer {
    constructor(device: any);
    font(fontName: string): this;
    align(alignment: 'lt' | 'ct' | 'rt'): this;
    style(style: 'normal' | 'b' | 'u' | 'i' | 'u2' | 'bi' | 'bu' | 'biu'): this;
    size(width: number, height: number): this;
    text(content: string): this;
    barcode(content: string, type: string, options?: {
      width?: number;
      height?: number;
      position?: 'OFF' | 'ABOVE' | 'BELOW' | 'BOTH';
      includeParity?: boolean;
      textPosition?: 'BELOW' | 'ABOVE' | 'BOTH' | 'OFF';
    }): this;
    raw(data: Buffer): this;
    cut(): this;
    close(): this;
  }

  // Allow these to be assigned later
  let USB: any;
  let Network: any;

  export { Printer, USB, Network };
}

declare module 'escpos-usb' {
  const USB: any;
  export = USB;
}

declare module 'escpos-network' {
  const Network: any;
  export = Network;
} 