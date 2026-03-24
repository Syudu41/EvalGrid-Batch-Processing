interface APIKeyInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function APIKeyInput({ value, onChange }: APIKeyInputProps) {
  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <label className="block text-sm font-medium text-zinc-800" htmlFor="hf-api-key">
        HuggingFace API Key
      </label>
      <input
        id="hf-api-key"
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
      />
      <p className="text-xs text-zinc-500">Your key is used only to call HuggingFace and is never stored.</p>
    </div>
  );
}
