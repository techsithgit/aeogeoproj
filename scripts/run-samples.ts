import { createAnalysisId, generateAnalysis } from "../lib/analysis/engine";

const samples: { source: { type: "topic" | "url"; value: string }; context?: { location?: string; industry?: string }; topicHint?: string; includeDifferentiators?: boolean }[] = [
  { source: { type: "topic", value: "best project management tool for remote teams" }, context: { industry: "software" } },
  { source: { type: "topic", value: "how to pick a data warehouse" }, context: { industry: "analytics" } },
  { source: { type: "topic", value: "coffee shops near me" } },
  { source: { type: "topic", value: "pricing for ai copywriting platforms" } },
  { source: { type: "topic", value: "solar incentives in texas" }, context: { location: "Texas", industry: "energy" } },
];

function run() {
  samples.forEach((sample, index) => {
    const id = createAnalysisId();
    const analysis = generateAnalysis({
      id,
      source: sample.source,
      topicHint: sample.topicHint ?? sample.source.value,
      context: sample.context ?? {},
      includeDifferentiators: sample.includeDifferentiators ?? true,
    });
    // eslint-disable-next-line no-console
    console.log(`\nSample ${index + 1}: ${sample.source.value}`);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(analysis, null, 2));
  });
}

run();
