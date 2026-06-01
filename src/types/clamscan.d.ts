declare module "clamscan" {
  interface ClamScanResult {
    isInfected: boolean
    viruses: string[]
  }

  interface ClamScanOptions {
    clamdscan?: {
      host?: string
      port?: number
      timeout?: number
    }
  }

  class NodeClam {
    init(options: ClamScanOptions): Promise<NodeClam>
    scanBuffer(buffer: Buffer): Promise<ClamScanResult>
  }

  export = NodeClam
}
