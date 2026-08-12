// Minimal type declaration for escpos@2.5.2 (CommonJS, no bundled types).
declare module 'escpos' {
  export class USB {
    constructor(vid?: number | any, pid?: number);
    static findPrinter(): any[];
    open(cb: (err: Error | null, device?: any) => void): void;
    close(cb?: () => void): void;
    write(data: Buffer | string, cb?: (err: Error | null) => void): void;
  }
  export class Network {
    constructor(address: string, port?: number);
    open(cb: (err: Error | null, device?: any) => void): void;
    close(cb?: (err: Error | null, device?: any) => void): void;
    write(data: Buffer | string, cb?: (err: Error | null) => void): void;
  }
  export class Printer {
    constructor(device: any);
    pureText(data: string): this;
    flush(cb?: (err: Error | null) => void): this;
    close(cb?: () => void): this;
    cut(cb?: () => void): this;
    feed(n?: number): this;
  }
}

declare module 'escpos/adapter/usb.js' {
  const USB: any;
  export default USB;
}
declare module 'escpos/adapter/network.js' {
  const Network: any;
  export default Network;
}
