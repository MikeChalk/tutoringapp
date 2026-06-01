import NodeClam from "clamscan"

let scanner: NodeClam | null = null

async function getScanner(): Promise<NodeClam | null> {
  if (scanner !== null) return scanner

  try {
    scanner = await new NodeClam().init({
      clamdscan: {
        host: "127.0.0.1",
        port: 3310,
        timeout: 10000,
      },
    })
    console.log("[clamav] Scanner connected")
    return scanner
  } catch {
    console.warn("[clamav] Daemon not available — uploads will not be virus scanned")
    return null
  }
}

export async function scanFile(buffer: Buffer, filename: string): Promise<{ clean: boolean; virus: string | null }> {
  const clam = await getScanner()
  if (!clam) return { clean: true, virus: null }

  try {
    const result = await clam.scanBuffer(buffer)
    // result is an object like { isInfected: boolean, viruses: string[] }
    if (result.isInfected) {
      return { clean: false, virus: result.viruses.join(", ") }
    }
    return { clean: true, virus: null }
  } catch (err) {
    console.error(`[clamav] Scan error for ${filename}:`, err)
    // Don't block uploads on scanner errors — let file through with warning
    return { clean: true, virus: null }
  }
}
