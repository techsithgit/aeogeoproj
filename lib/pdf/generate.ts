import PDFDocument from "pdfkit";
import path from "path";
import { Analysis } from "@/lib/analysis/types";

export async function generateAnalysisPdf(analysis: Analysis, includeDifferentiators: boolean): Promise<Buffer> {
  const fontsPath = path.join(process.cwd(), "lib", "pdf", "fonts");
  const helveticaPath = path.join(fontsPath, "Helvetica.afm");

  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];

  doc.on("data", (c) => chunks.push(c as Buffer));

  // Register explicit Helvetica path to avoid missing data in packaged runtimes
  doc.registerFont("Helvetica", helveticaPath);
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
    const diff = analysis.differentiators;
    doc.fontSize(14).text("Differentiators");

    if (diff.answer_fragility) {
      doc.fontSize(12).text(
        `Answer fragility: ${diff.answer_fragility.status} (score ${diff.answer_fragility.fragility_score})`
      );
      if (diff.answer_fragility.drivers?.length) {
        diff.answer_fragility.drivers.slice(0, 3).forEach((d) => {
          doc.text(`- ${d.driver_type}: ${d.explanation}`);
        });
      }
      doc.moveDown();
    }

    if (diff.citation_profile) {
      doc.fontSize(12).text(
        `Citation type: ${diff.citation_profile.current_type} (${diff.citation_profile.confidence_level} confidence)`
      );
      if (diff.citation_profile.requirements_to_upgrade?.length) {
        const first = diff.citation_profile.requirements_to_upgrade[0];
        doc.text(`Upgrade path: ${first.target_type} (missing: ${first.missing_signals.join(", ")})`);
      }
      doc.moveDown();
    }

    if (diff.first_party_signals) {
      doc.fontSize(12).text(`First-party signals: ${diff.first_party_signals.presence}`);
      if (diff.first_party_signals.detected_types?.length) {
        doc.text(`Detected: ${diff.first_party_signals.detected_types.join(", ")}`);
      }
      if (diff.first_party_signals.gaps?.length) {
        doc.text(`Gaps: ${diff.first_party_signals.gaps.join(", ")}`);
      }
      doc.moveDown();
    }

    if (diff.geo_sensitivity) {
      doc.fontSize(12).text(
        `Geo sensitivity: ${diff.geo_sensitivity.level} — ${diff.geo_sensitivity.explanation}`
      );
      doc.text(`Implications: ${diff.geo_sensitivity.implications}`);
      doc.moveDown();
    }

    if (diff.fix_priority?.ordered_fixes?.length) {
      doc.fontSize(12).text("Fix priority:");
      diff.fix_priority.ordered_fixes.slice(0, 5).forEach((f) => {
        doc.text(`- ${f.priority.toUpperCase()}: fix ${f.fix_id} (${f.rationale})`);
      });
      doc.moveDown();
    }
  }

  doc.fontSize(12).text(`AEO Score: ${analysis.scoring.aeo_score}`);

  doc.end();

  return new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));
  });
}
