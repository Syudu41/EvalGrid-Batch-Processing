import { useRef, useState } from "react";
import { useCSVParser } from "../hooks/useCSVParser";
import type { CSVData } from "../types";

interface CSVUploaderProps {
  onCSVLoaded: (data: CSVData | null) => void;
  onNext: () => void;
}

export function CSVUploader({ onCSVLoaded, onNext }: CSVUploaderProps) {
  const [data, setData] = useState<CSVData | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [missingSystemPrompt, setMissingSystemPrompt] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { parseFile, toCSVData } = useCSVParser();

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a .csv file.");
      setData(null);
      onCSVLoaded(null);
      return;
    }

    const parsed = await parseFile(file);
    if (parsed.error) {
      setError(parsed.error);
      setData(null);
      onCSVLoaded(null);
      return;
    }

    const csvData = toCSVData(parsed);
    if (!csvData) {
      setError("Failed to parse CSV file. Please ensure the file is a valid UTF-8 encoded CSV.");
      setData(null);
      onCSVLoaded(null);
      return;
    }

    if (!csvData.headers.includes("user_prompt")) {
      setError(
        `CSV must have a column named 'user_prompt'. Found: ${csvData.headers.join(", ") || "(none)"}.`
      );
      setData(null);
      onCSVLoaded(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    const missingSystem = !csvData.headers.includes("system_prompt");

    setFilename(file.name);
    setError(null);
    setMissingSystemPrompt(missingSystem);
    setData(csvData);
    onCSVLoaded(csvData);
  };

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <label
          htmlFor="csv-upload"
          className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-600 hover:bg-zinc-100"
        >
          Click to upload or drag & drop a CSV file
        </label>
        <input
          id="csv-upload"
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
          }}
        />
      </div>

      {filename && data ? (
        <p className="text-sm text-zinc-600">
          Loaded <span className="font-medium">{filename}</span> ({data.rows.length} rows)
        </p>
      ) : null}

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {missingSystemPrompt && data ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          No 'system_prompt' column detected — system prompt will be left empty for all rows.
        </div>
      ) : null}

      {data ? (
        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                {data.headers.map((header) => (
                  <th key={header} className="border-b border-zinc-200 px-3 py-2 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.slice(0, 5).map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-zinc-100 last:border-b-0">
                  {data.headers.map((header) => (
                    <td key={`${rowIndex}-${header}`} className="px-3 py-2 text-zinc-700">
                      {row[header] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!data}
          onClick={onNext}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          Configure Models →
        </button>
      </div>
    </div>
  );
}
