import { downloadBlob, formatTimestamp } from "../lib/utils";

interface DownloadBarProps {
  runId: string;
  rowCount: number;
  modelCount: number;
  durationLabel: string;
  onStartNew: () => void;
  onError: (message: string) => void;
}

export function DownloadBar({ runId, rowCount, modelCount, durationLabel, onStartNew, onError }: DownloadBarProps) {
  const handleDownload = async (type: "csv" | "logs") => {
    try {
      const stamp = formatTimestamp();
      const fallback =
        type === "csv" ? `evalgrid_results_${stamp}.csv` : `evalgrid_run_${stamp}.log`;
      await downloadBlob(`/api/run/${runId}/download/${type}`, fallback);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Download failed");
    }
  };

  return (
    <div className="sticky top-0 z-30 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="text-sm text-zinc-700">
        ✓ Run complete — {rowCount} rows processed
        <span className="ml-2 text-xs text-zinc-500">
          {modelCount} models · {rowCount} rows · {durationLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void handleDownload("csv")}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
        >
          Download CSV
        </button>
        <button
          type="button"
          onClick={() => void handleDownload("logs")}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
        >
          Download Logs
        </button>
        <button type="button" onClick={onStartNew} className="text-sm text-blue-600 underline underline-offset-2">
          Start New Run
        </button>
      </div>
    </div>
  );
}
