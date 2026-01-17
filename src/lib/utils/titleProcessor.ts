/**
 * Title Processor for titles.txt
 * Handles parsing, extraction, and matching of chapter titles
 */

export interface TitleMapping {
  chapterNumber: number;
  title: string;
  originalLine: string;
}

/**
 * Parse titles.txt content and create a Map<chapterNumber, cleanTitle>
 * Format: "Chapter X: Title goes here"
 */
export function parseTitlesFile(content: string): Map<number, string> {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const titlesMap = new Map<number, string>();

  for (const line of lines) {
    const chapterNumber = extractChapterNumber(line);
    if (chapterNumber !== null) {
      const cleanTitle = stripChapterPrefix(line);
      titlesMap.set(chapterNumber, cleanTitle);
    }
  }

  return titlesMap;
}

/**
 * Extract chapter number from line like "Chapter 5: Title"
 * Returns null if no number found
 */
export function extractChapterNumber(line: string): number | null {
  // Match patterns like:
  // "Chapter 5: Title"
  // "Chapter 5 - Title"
  // "Chapter 5 Title"
  // "Ch 5: Title"
  // "Ch. 5: Title"
  const match = line.match(/^(?:chapter|ch\.?)\s*(\d+)/i);

  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * Strip "Chapter X:" prefix and return clean title
 * "Chapter 5: The Great Adventure" → "The Great Adventure"
 */
export function stripChapterPrefix(line: string): string {
  // Remove "Chapter X:" or "Ch. X:" prefix
  const cleaned = line
    .replace(/^(?:chapter|ch\.?)\s*\d+\s*[:\-–—]?\s*/i, "")
    .trim();

  return cleaned || line; // Fallback to original if nothing left
}

/**
 * Match uploaded chapters with titles from titles.txt
 * Returns array of { chapterNumber, title }
 */
export function matchChaptersWithTitles(
  chapterCount: number,
  titlesMap: Map<number, string>
): Array<{ number: number; title: string; matched: boolean }> {
  const result = [];

  for (let i = 1; i <= chapterCount; i++) {
    const matchedTitle = titlesMap.get(i);

    result.push({
      number: i,
      title: matchedTitle || `Chapter ${i}`, // Fallback
      matched: !!matchedTitle,
    });
  }

  return result;
}

/**
 * Validate titles file
 */
export function validateTitlesFile(
  titlesMap: Map<number, string>,
  expectedCount: number
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check if titles file is empty
  if (titlesMap.size === 0) {
    warnings.push("No valid chapter titles found in titles.txt");
  }

  // Check if some chapters won't have titles
  if (titlesMap.size < expectedCount) {
    const missing = expectedCount - titlesMap.size;
    warnings.push(
      `Only ${titlesMap.size} titles found for ${expectedCount} chapters. ${missing} chapters will use default naming.`
    );
  }

  // Check if there are extra titles (not critical)
  if (titlesMap.size > expectedCount) {
    const extra = titlesMap.size - expectedCount;
    warnings.push(
      `titles.txt contains ${extra} extra titles that won't be used.`
    );
  }

  return {
    valid: titlesMap.size > 0,
    warnings,
  };
}

/**
 * Parse titles for preview/editing
 * Returns array with all info for UI
 */
export function parseTitlesForPreview(content: string): TitleMapping[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines
    .map((line) => {
      const chapterNumber = extractChapterNumber(line);
      if (chapterNumber === null) return null;

      return {
        chapterNumber,
        title: stripChapterPrefix(line),
        originalLine: line,
      };
    })
    .filter((item): item is TitleMapping => item !== null)
    .sort((a, b) => a.chapterNumber - b.chapterNumber);
}
