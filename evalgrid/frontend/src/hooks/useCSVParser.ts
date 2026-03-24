import type { CSVData } from "../types";

interface ParseCSVResult {
  headers: string[];
  rows: Array<Record<string, string>>;
  error: string | null;
}

function parseCSVLine(line: string): string[] {
  // MVP parser: supports quoted commas and escaped quotes; not a full RFC 4180 implementation.
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCSVContent(content: string): ParseCSVResult {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    return {
      headers: [],
      rows: [],
      error: "Failed to parse CSV file. Please ensure the file is a valid UTF-8 encoded CSV.",
    };
  }

  const lines = normalized.split("\n").filter((line) => line.length > 0);
  if (lines.length < 1) {
    return {
      headers: [],
      rows: [],
      error: "Failed to parse CSV file. Please ensure the file is a valid UTF-8 encoded CSV.",
    };
  }

  const headers = parseCSVLine(lines[0]);
  if (headers.length < 1) {
    return {
      headers: [],
      rows: [],
      error: "Failed to parse CSV file. Please ensure the file is a valid UTF-8 encoded CSV.",
    };
  }

  const rows = lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });

  return { headers, rows, error: null };
}

export function useCSVParser() {
  async function parseFile(file: File): Promise<ParseCSVResult> {
    try {
      const text = await file.text();
      return parseCSVContent(text);
    } catch {
      return {
        headers: [],
        rows: [],
        error: "Failed to parse CSV file. Please ensure the file is a valid UTF-8 encoded CSV.",
      };
    }
  }

  function toCSVData(result: ParseCSVResult): CSVData | null {
    if (result.error) {
      return null;
    }
    return {
      headers: result.headers,
      rows: result.rows,
    };
  }

  return {
    parseFile,
    toCSVData,
  };
}
