import PDFDocument from "pdfkit";
import { Analysis } from "@/lib/analysis/types";

export function generateAnalysisPdf(analysis: Analysis, includeDifferentiators: boolean): Buffer {
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  doc.on("end", () => {});

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
