import { truncateText } from "../lib/utils";
import type { RunResultsResponse } from "../types";

interface ResultsTableProps {
  results: RunResultsResponse;
}

export function ResultsTable({ results }: ResultsTableProps) {
  return (
    <div className="overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm" style={{ maxHeight: "70vh" }}>
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-zinc-50 text-zinc-700">
          <tr>
            <th className="sticky left-0 z-20 border-b border-r border-zinc-200 bg-zinc-50 px-3 py-2">#</th>
            {results.columns.map((column) => (
              <th key={column} className="border-b border-zinc-200 px-3 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-zinc-100 last:border-b-0">
              <td className="sticky left-0 z-10 border-r border-zinc-200 bg-white px-3 py-2 text-zinc-500">{rowIndex + 1}</td>
              {results.columns.map((column) => {
                const raw = String(row[column] ?? "");
                const isError = raw.startsWith("[ERROR:");
                return (
                  <td
                    key={`${rowIndex}-${column}`}
                    className={`max-w-[420px] px-3 py-2 align-top ${isError ? "text-red-600" : "text-zinc-700"}`}
                    title={raw}
                  >
                    {truncateText(raw, 120)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
