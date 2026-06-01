import PDFDocument from "pdfkit"

interface ContractData {
  tutorName: string
  tutorEmail: string
  contractType: string
  yearLevel: string
  startDate: Date
  endDate: Date
  terms: string
  rates: Record<string, { online?: number; inPerson?: number }>
  signed: boolean
  signedAt: Date | null
  signedByName: string | null
  companyName?: string
  companyAddress?: string
  companyEmail?: string
  companyPhone?: string
}

export function generateContractPDF(data: ContractData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: "A4" })
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const company = data.companyName || "J.A.S.S. Tutoring Services"

    // Header
    doc.fontSize(22).font("Helvetica-Bold").text(company, { align: "center" })
    if (data.companyAddress) {
      doc.fontSize(9).font("Helvetica").text(data.companyAddress, { align: "center" })
    }
    const contactLine = [data.companyEmail, data.companyPhone].filter(Boolean).join(" · ")
    if (contactLine) {
      doc.fontSize(9).text(contactLine, { align: "center" })
    }
    doc.moveDown(0.5)
    doc.fontSize(16).font("Helvetica-Bold").text("Tutoring Contract Agreement", { align: "center" })
    doc.moveDown(1)

    // Divider
    doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke("#cccccc")
    doc.moveDown(0.5)

    // Parties
    const typeLabel = data.contractType === "PRIVATE_TUTORING" ? "Private Tutoring" : data.contractType === "STUDY_HALL" ? "Study Hall" : "Program Supervisor"
    const yearLabel = data.yearLevel === "1ST_YEAR" ? "Year 1" : data.yearLevel === "2ND_YEAR" ? "Year 2" : "Year 3+"

    doc.fontSize(11).font("Helvetica-Bold").text("Parties")
    doc.fontSize(10).font("Helvetica")
    doc.text(`Tutor: ${data.tutorName} (${data.tutorEmail})`)
    doc.text(`Contract Type: ${typeLabel} — ${yearLabel}`)
    doc.text(`Term: ${new Date(data.startDate).toLocaleDateString()} to ${new Date(data.endDate).toLocaleDateString()}`)
    doc.moveDown(0.5)

    // Terms
    if (data.terms) {
      doc.fontSize(11).font("Helvetica-Bold").text("Terms & Conditions")
      doc.fontSize(10).font("Helvetica")
      const paragraphs = data.terms.split("\n").filter(Boolean)
      for (const p of paragraphs) {
        doc.text(p, { indent: 10 })
        doc.moveDown(0.2)
      }
      doc.moveDown(0.5)
    }

    // Rates
    const rateEntries = Object.entries(data.rates)
    if (rateEntries.length > 0) {
      doc.fontSize(11).font("Helvetica-Bold").text("Payment Rates")
      doc.fontSize(10).font("Helvetica")

      // Table header
      const tableTop = doc.y + 5
      const col1 = 80
      const col2 = 260
      const col3 = 390
      doc.font("Helvetica-Bold").text("Grade Level", col1, tableTop)
      doc.text("Online Rate", col2, tableTop)
      doc.text("In-Person Rate", col3, tableTop)
      doc.moveTo(70, doc.y + 2).lineTo(520, doc.y + 2).stroke("#cccccc")

      let y = doc.y + 8
      for (const [grade, rates] of rateEntries) {
        if (y > 720) { doc.addPage(); y = 60 }
        const gradeLabel = grade.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
        doc.font("Helvetica").text(gradeLabel, col1, y)
        doc.text(rates.online ? `$${rates.online.toFixed(2)}/hr` : "—", col2, y)
        doc.text(rates.inPerson ? `$${rates.inPerson.toFixed(2)}/hr` : "—", col3, y)
        y += 16
      }
      doc.moveDown(1)
    }

    // Signature
    doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke("#cccccc")
    doc.moveDown(0.8)

    doc.fontSize(10).font("Helvetica")
    doc.text("By signing below, I acknowledge that I have read, understood, and agree to all the terms and conditions outlined in this contract. I understand that this constitutes a legally binding agreement between myself and " + company + ".", { align: "left" })
    doc.moveDown(1)

    if (data.signed && data.signedByName) {
      doc.fontSize(11).font("Helvetica-Bold").text("Signed", { continued: true })
      doc.font("Helvetica").text(` on ${new Date(data.signedAt!).toLocaleDateString()}`)
      doc.moveDown(0.5)
      doc.fontSize(10).text(`Signature: ${data.signedByName}`)

      // Draw signature line with X
      doc.moveTo(80, doc.y + 15).lineTo(280, doc.y + 15).stroke("#999999")
      doc.moveDown(0.2)
      doc.fontSize(8).fillColor("#999999").text(data.signedByName, 80, doc.y, { width: 200, align: "center" })
      doc.fillColor("#000000")
    } else {
      doc.fontSize(10).font("Helvetica").text("Signature: ________________________", { indent: 20 })
      doc.moveDown(0.5)
      doc.text("Date: ________________________", { indent: 20 })
    }

    doc.moveDown(1)
    doc.fontSize(7).fillColor("#999999").text(`Contract ID: ${data.tutorEmail} — Generated ${new Date().toISOString().split("T")[0]}`, { align: "center" })

    doc.end()
  })
}
