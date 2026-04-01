import type { RichTranscriptContext } from "../types/index.js";

/**
 * Splits an array into sub-arrays of at most `maxSize` elements.
 * Preserves element order.
 * @throws {RangeError} if maxSize <= 0
 */
export function splitIntoChunks<T>(arr: T[], maxSize: number): T[][] {
  if (maxSize <= 0) {
    throw new RangeError(`maxSize must be greater than 0, got ${maxSize}`);
  }

  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += maxSize) {
    chunks.push(arr.slice(i, i + maxSize));
  }
  return chunks;
}

/**
 * Merges multiple RichTranscriptContext objects into a single deduplicated result.
 * Deduplicates:
 *   - verbatimQuotes by timestamp_start + text
 *   - dataPoints by timestamp_start + value
 *   - concreteExamples by timestamp_start + description
 * When called with an empty array, returns an empty RichTranscriptContext with current extractedAt.
 */
export function mergeRichContextResults(
  results: RichTranscriptContext[]
): RichTranscriptContext {
  if (results.length === 0) {
    return {
      verbatimQuotes: [],
      dataPoints: [],
      concreteExamples: [],
      extractedAt: new Date().toISOString(),
    };
  }

  const seenQuotes = new Set<string>();
  const seenDataPoints = new Set<string>();
  const seenExamples = new Set<string>();

  const merged: RichTranscriptContext = {
    verbatimQuotes: [],
    dataPoints: [],
    concreteExamples: [],
    extractedAt: new Date().toISOString(),
  };

  for (const result of results) {
    for (const quote of result.verbatimQuotes) {
      const key = `${quote.timestamp_start}|${quote.text}`;
      if (!seenQuotes.has(key)) {
        seenQuotes.add(key);
        merged.verbatimQuotes.push(quote);
      }
    }

    for (const dp of result.dataPoints) {
      const key = `${dp.timestamp_start}|${dp.value}`;
      if (!seenDataPoints.has(key)) {
        seenDataPoints.add(key);
        merged.dataPoints.push(dp);
      }
    }

    for (const example of result.concreteExamples) {
      const key = `${example.timestamp_start}|${example.description}`;
      if (!seenExamples.has(key)) {
        seenExamples.add(key);
        merged.concreteExamples.push(example);
      }
    }
  }

  return merged;
}
