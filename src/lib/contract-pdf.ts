import PDFDocument from "pdfkit"

interface ContractData {
  tutorName: string
  tutorEmail: string
  contractType: string
  yearLevel: string
  startDate: Date
  endDate: Date
  terms: string
  rates: Record<string, number>
  signed: boolean
  signedAt: Date | null
  signedByName: string | null
  companyName?: string
  companyAddress?: string
  companyEmail?: string
  companyPhone?: string
}

function parseRateEntries(rates: Record<string, number>): { grade: string; online: number | null; inPerson: number | null }[] {
  const byGrade = new Map<string, { online: number | null; inPerson: number | null }>()
  for (const [key, value] of Object.entries(rates)) {
    const parts = key.split("|")
    const grade = parts[0]
    const mode = parts[1]?.toUpperCase()
    if (!byGrade.has(grade)) byGrade.set(grade, { online: null, inPerson: null })
    const entry = byGrade.get(grade)!
    if (mode === "ONLINE") entry.online = value
    else if (mode === "IN_PERSON") entry.inPerson = value
    else { entry.online = value; entry.inPerson = value }
  }
  return Array.from(byGrade.entries()).map(([grade, rates]) => ({
    grade,
    online: rates.online,
    inPerson: rates.inPerson,
  }))
}

const GRADE_ORDER = ["ELEMENTARY", "SEC1_2", "SEC3", "SEC4_5", "CEGEP", "UNI", "STUDY_HALL_TUTOR", "IN_PERSON_MGMT", "ONLINE_MGMT", "SUPERVISION", "MARKETING"]

const PRIVATE_TUTORING_GRADES = ["ELEMENTARY", "SEC1_2", "SEC3", "SEC4_5", "CEGEP", "UNI", "STUDY_HALL_TUTOR"]
const STUDY_HALL_GRADES = ["STUDY_HALL_TUTOR"]
const PROGRAM_SUPERVISOR_GRADES = ["ELEMENTARY", "SEC1_2", "SEC3", "SEC4_5", "CEGEP", "UNI", "STUDY_HALL_TUTOR", "IN_PERSON_MGMT", "ONLINE_MGMT", "SUPERVISION", "MARKETING"]

function formatGrade(grade: string): string {
  const map: Record<string, string> = {
    ELEMENTARY: "Elementary", SEC1_2: "Secondary 1-2", SEC3: "Secondary 3", SEC4_5: "Secondary 4-5",
    CEGEP: "CEGEP", UNI: "University", STUDY_HALL_TUTOR: "Study Hall Tutor",
    IN_PERSON_MGMT: "In-Person Mgmt", ONLINE_MGMT: "Online Mgmt", SUPERVISION: "Supervision", MARKETING: "Marketing",
  }
  return map[grade] || grade.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

export function generateContractPDF(data: ContractData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true })
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const company = data.companyName || "J.A.S.S. Tutoring Services"
    const typeLabel = data.contractType === "PRIVATE_TUTORING" ? "Private Tutoring"
      : data.contractType === "STUDY_HALL" ? "Study Hall" : "Program Supervisor"
    const yearLabel = data.yearLevel === "1ST_YEAR" ? "Year 1" : data.yearLevel === "2ND_YEAR" ? "Year 2" : "Year 3+"

    // ── Header ──
    doc.rect(0, 0, doc.page.width, 140).fill("#18181b")
    doc.fill("#ffffff").fontSize(24).font("Helvetica-Bold")
    doc.text(company, 50, 35, { width: doc.page.width - 100, align: "left" })
    doc.fontSize(10).font("Helvetica").fill("#a1a1aa")
    const subtitle = [data.companyAddress, data.companyEmail, data.companyPhone].filter(Boolean).join("  |  ")
    if (subtitle) doc.text(subtitle, 50, 65, { width: doc.page.width - 100, align: "left" })
    doc.fill("#ffffff").fontSize(16).font("Helvetica-Bold")
    doc.text("Tutoring Contract", 50, 100, { width: doc.page.width - 100, align: "left" })

    // ── Status badge ──
    if (data.signed) {
      doc.fontSize(9).font("Helvetica-Bold").fill("#22c55e")
      doc.text("SIGNED", doc.page.width - 120, 30, { width: 70, align: "right" })
      doc.fontSize(7).font("Helvetica").fill("#86efac")
      doc.text(new Date(data.signedAt!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), doc.page.width - 120, 42, { width: 70, align: "right" })
    }

    doc.y = 160

    // ── Parties section ──
    doc.fill("#18181b").fontSize(14).font("Helvetica-Bold").text("Parties", 50)
    doc.moveDown(0.3)
    doc.fontSize(10).font("Helvetica").fill("#52525b")
    doc.text("Tutor", 50, doc.y, { continued: true })
    doc.fill("#18181b").text(`  ${data.tutorName}`, { continued: true })
    doc.fill("#71717a").fontSize(9).text(`  (${data.tutorEmail})`)
    doc.fill("#52525b").fontSize(10).text("Contract Type", 50, doc.y, { continued: true })
    doc.fill("#18181b").text(`  ${typeLabel}  ·  ${yearLabel}`)
    doc.fill("#52525b").text("Term", 50, doc.y, { continued: true })
    doc.fill("#18181b").text(`  ${new Date(data.startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}  —  ${new Date(data.endDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`)
    doc.moveDown(1)

    // ── Terms ──
    if (data.terms) {
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke("#e4e4e7")
      doc.moveDown(0.5)
      doc.fill("#18181b").fontSize(14).font("Helvetica-Bold").text("Terms & Conditions", 50)
      doc.moveDown(0.3)
      doc.fontSize(10).font("Helvetica").fill("#3f3f46")
      const paragraphs = data.terms.split("\n").map(s => s.trim()).filter(Boolean)
      for (const p of paragraphs) {
        const h = doc.heightOfString(p, { width: doc.page.width - 120 })
        if (doc.y + h > doc.page.height - 120) doc.addPage()
        doc.text(p, 60, doc.y, { width: doc.page.width - 120, indent: 0 })
        doc.moveDown(0.3)
      }
      doc.moveDown(0.5)
    }

    // ── Rates table ──
    const entries = parseRateEntries(data.rates)
    const typeGrades = data.contractType === "STUDY_HALL" ? STUDY_HALL_GRADES
      : data.contractType === "PROGRAM_SUPERVISOR" ? PROGRAM_SUPERVISOR_GRADES
      : PRIVATE_TUTORING_GRADES
    const filtered = entries.filter(e => typeGrades.includes(e.grade) && (e.online !== null || e.inPerson !== null))
    const sorted = filtered.sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade))
    if (sorted.length > 0) {
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke("#e4e4e7")
      doc.moveDown(0.5)
      doc.fill("#18181b").fontSize(14).font("Helvetica-Bold").text("Payment Rates", 50)
      doc.moveDown(0.5)

      const colX = { grade: 60, online: 230, inPerson: 380 }
      const tableTop = doc.y

      // Header row
      doc.rect(50, tableTop, doc.page.width - 100, 22).fill("#f4f4f5")
      doc.fill("#18181b").fontSize(9).font("Helvetica-Bold")
      doc.text("Grade Level", colX.grade + 4, tableTop + 5)
      if (sorted.some(e => e.online !== null)) doc.text("Online Rate", colX.online + 4, tableTop + 5)
      if (sorted.some(e => e.inPerson !== null)) doc.text("In-Person Rate", colX.inPerson + 4, tableTop + 5)

      let y = tableTop + 24
      for (let i = 0; i < sorted.length; i++) {
        if (y > doc.page.height - 60) { doc.addPage(); y = 60 }
        const e = sorted[i]
        if (i % 2 === 0) { doc.rect(50, y - 2, doc.page.width - 100, 18).fill("#fafafa") }
        doc.fill("#3f3f46").fontSize(9).font("Helvetica")
        doc.text(formatGrade(e.grade), colX.grade + 4, y + 2)
        if (e.online !== null) doc.text(`$${e.online.toFixed(2)}/hr`, colX.online + 4, y + 2)
        if (e.inPerson !== null) doc.text(`$${e.inPerson.toFixed(2)}/hr`, colX.inPerson + 4, y + 2)
        y += 18
      }
      doc.moveDown(1.5)
    }

    // ── Signature ──
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke("#e4e4e7")
    doc.moveDown(0.8)
    doc.fill("#18181b").fontSize(14).font("Helvetica-Bold").text("Acknowledgment", 50)
    doc.moveDown(0.3)
    doc.fontSize(10).font("Helvetica").fill("#52525b")
    doc.text("By signing below, I acknowledge that I have read, understood, and agree to all the terms and conditions outlined in this contract. I understand that this constitutes a legally binding agreement.", 50, doc.y, { width: doc.page.width - 100 })
    doc.moveDown(1.2)

    if (data.signed && data.signedByName) {
      doc.fill("#18181b").fontSize(12).font("Helvetica-Bold")
      doc.text("Signed by:", 50)
      doc.moveDown(0.3)

      // Signature box
      doc.rect(50, doc.y, doc.page.width - 100, 45).stroke("#d4d4d8")
      doc.fontSize(22).font("Helvetica").fill("#3f3f46")
      doc.text(data.signedByName, 70, doc.y + 6, { width: doc.page.width - 140 })
      doc.moveDown(0.2)
      doc.fontSize(8).fill("#a1a1aa")
      doc.text(`Signed on ${new Date(data.signedAt!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 70, doc.y + 32, { width: doc.page.width - 140 })
    } else {
      doc.fill("#a1a1aa").fontSize(10).font("Helvetica")
      doc.text("Signature:  ________________________________", 50)
      doc.moveDown(0.3)
      doc.text("Date:  ________________________________", 50)
    }

    // ── Footer ──
    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      doc.fontSize(7).fill("#d4d4d8")
      doc.text(`J.A.S.S. Tutoring Services  ·  Contract for ${data.tutorName}  ·  Page ${i + 1} of ${pageCount}`, 50, doc.page.height - 30, {
        width: doc.page.width - 100, align: "center",
      })
    }

    doc.end()
  })
}
