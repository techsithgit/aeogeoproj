import { createAnalysisId, generateAnalysis } from "../lib/analysis/engine";

const samples: { topic: string; context?: { location?: string; industry?: string } }[] = [
  { topic: "best project management tool for remote teams", context: { industry: "software" } },
  { topic: "how to pick a data warehouse", context: { industry: "analytics" } },
  { topic: "coffee shops near me" },
  { topic: "pricing for ai copywriting platforms" },
  { topic: "solar incentives in texas", context: { location: "Texas", industry: "energy" } },
];

function run() {
  samples.forEach((sample, index) => {
    const id = createAnalysisId();
    const analysis = generateAnalysis(id, sample.topic, sample.context ?? {});
    // eslint-disable-next-line no-console
    console.log(`\nSample ${index + 1}: ${sample.topic}`);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(analysis, null, 2));
  });
}

run();
