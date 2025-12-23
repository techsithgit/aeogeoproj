import { AnalysisExtraction } from "../analysis/types";

type FetchResult = {
  status: number | null;
  body: string;
  finalUrl: string;
};

const BLOCKED_HOST_PATTERNS = [/^localhost$/i, /^127\./, /^10\./, /^192\.168\./, /^169\.254\./, /^\[?::1\]?$/];

function sanitizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (BLOCKED_HOST_PATTERNS.some((pat) => pat.test(url.hostname))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchHtml(targetUrl: string, timeoutMs = 8000): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(targetUrl, { signal: controller.signal, redirect: "follow" });
    const body = await response.text();
    return { status: response.status, body, finalUrl: response.url };
  } finally {
    clearTimeout(timeout);
  }
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractBetween(html: string, regex: RegExp): string | undefined {
  const match = regex.exec(html);
  if (!match || !match[1]) return undefined;
  return decodeHtmlEntities(match[1].trim());
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const regex = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (text) headings.push(text);
    if (headings.length >= 20) break;
  }
  return headings;
}

function extractMainText(html: string): string {
  const withoutTags = stripTags(html);
  const text = withoutTags.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return decodeHtmlEntities(text);
}

function computeExtractionStatus(
  mainText: string,
  headings: string[],
  warnings: string[],
  htmlLength: number,
  httpStatus?: number | null
): "success" | "partial" | "failed" {
  if (httpStatus && httpStatus >= 400) {
    warnings.push(`HTTP status ${httpStatus} indicates failure.`);
    return "failed";
  }
  const length = mainText.trim().length;
  if (!mainText || length < 120) return "failed";

  let status: "success" | "partial" = "success";
  if (length < 300) {
    warnings.push("Extracted content is very short.");
    status = "partial";
  }
  if (headings.length === 0) {
    warnings.push("No H1–H3 headings were extracted.");
    status = "partial";
  }
  if (htmlLength > 20000 && length < 500) {
    warnings.push("Page may be JS-rendered or gated; visible text is limited.");
    status = "partial";
  }
  return status;
}

export async function extractFromUrl(rawUrl: string): Promise<AnalysisExtraction> {
  const sanitized = sanitizeUrl(rawUrl);
  if (!sanitized) {
    return {
      status: "failed",
      fetched_url: rawUrl,
      content: {},
      warnings: ["URL is invalid or blocked for security reasons."],
    };
  }

  try {
    const fetchResult = await fetchHtml(sanitized);
    const warnings: string[] = [];
    if (!fetchResult.body || fetchResult.body.trim().length === 0) {
      return {
        status: "failed",
        fetched_url: fetchResult.finalUrl || sanitized,
        http_status: fetchResult.status ?? undefined,
        content: {},
        warnings: ["Fetched content was empty."],
      };
    }

    const title = extractBetween(fetchResult.body, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const description = extractBetween(fetchResult.body, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const headings = extractHeadings(fetchResult.body);
    const main_text = extractMainText(fetchResult.body);
    const htmlLength = fetchResult.body.length;

    const paywallCues = ["subscribe", "sign in to read", "paywall", "log in to continue"];
    const lowerText = main_text.toLowerCase();
    if (paywallCues.some((cue) => lowerText.includes(cue))) {
      warnings.push("Page may be paywalled or gated.");
    }
    if (!title) warnings.push("No <title> tag was extracted.");
    if (!description) warnings.push("No meta description was extracted.");

    const status = computeExtractionStatus(main_text, headings, warnings, htmlLength, fetchResult.status);

    return {
      status,
      fetched_url: fetchResult.finalUrl || sanitized,
      http_status: fetchResult.status ?? undefined,
      content: {
        title,
        description,
        headings,
        main_text,
      },
      warnings: warnings.length ? warnings : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    return {
      status: "failed",
      fetched_url: sanitized,
      content: {},
      warnings: [`Fetch failed: ${message}`],
    };
  }
}
