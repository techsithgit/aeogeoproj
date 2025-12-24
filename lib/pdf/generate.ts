import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { Analysis } from "@/lib/analysis/types";

export function generateAnalysisPdf(analysis: Analysis, includeDifferentiators: boolean): Buffer {
  const fontsPath = path.join(process.cwd(), "lib", "pdf", "fonts");
  const helveticaPath = path.join(fontsPath, "Helvetica.afm");

  // Point pdfkit to bundled font data to avoid missing AFM in serverless
  const PDFKitAny = PDFDocument as unknown as { PDFFont?: { dataPath?: string } };
  if (PDFKitAny.PDFFont) {
    PDFKitAny.PDFFont.dataPath = fontsPath;
  }

  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  doc.on("end", () => {});

  // Explicitly register Helvetica so pdfkit can find the font data in serverless bundles
  doc.registerFont("Helvetica", fs.readFileSync(helveticaPath));
  doc.font("Helvetica");

  doc.fontSize(18).text("AEO/GEO Analysis", { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Analysis ID: ${analysis.id}`);
  doc.text(`Source: ${analysis.source.type} - ${analysis.source.value}`);
  doc.text(`Created: ${analysis.created_at}`);
  doc.moveDown();

  doc.fontSize(14).text("Key diagnosis");
  analysis.diagnosis.blocking_reasons.slice(0, 5).forEach((r) => {
    doc.fontSize(12).text(`- ${r.title}: ${r.detail}`);
  });
  doc.moveDown();

  doc.fontSize(14).text("Recommended fixes");
  analysis.fixes.recommended_fixes.forEach((f) => {
    doc.fontSize(12).text(`- ${f.description} (${f.why_it_matters})`);
  });
  doc.moveDown();

  if (includeDifferentiators && analysis.differentiators) {
    doc.fontSize(14).text("Differentiators");
    doc.fontSize(12).text(JSON.stringify(analysis.differentiators, null, 2));
    doc.moveDown();
  }

  doc.fontSize(12).text(`AEO Score: ${analysis.scoring.aeo_score}`);

  doc.end();
  return Buffer.concat(chunks);
}
