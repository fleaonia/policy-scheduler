import { useRef, useState } from 'react';
import { parsePolicyImport } from '../lib/importPolicies';
import type { Policy } from '../types';

interface Props {
  onClose: () => void;
  onImport: (policies: Policy[]) => void;
}

const PLACEHOLDER = `[
  {
    "name": "Silent 3rd-Party Patching",
    "category": "third_party",
    "targetGroups": ["All Computers"],
    "schedule": { "type": "weekly", "dayOfWeek": 1, "time": "09:00" },
    "silent": true,
    "deferralHours": 0
  }
]`;

export function ImportModal({ onClose, onImport }: Props) {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    file.text().then(setText);
  }

  function handleImport() {
    const { policies, errors } = parsePolicyImport(text);
    if (policies.length) onImport(policies);

    if (!policies.length && !errors.length) {
      setErrors(['Nothing to import.']);
      return;
    }
    setErrors(errors);
    if (policies.length && !errors.length) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-cream shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">Import policies</h2>
          <button onClick={onClose} className="text-ink-soft hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-auto px-5 py-4">
          <p className="text-xs text-ink-soft">
            Paste a JSON array of policies — either this app's native schema, or an Automox
            policy export (fields like <code>schedule_days</code>, <code>schedule_time</code>,
            <code> deferral_minutes</code> are recognized automatically).
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-sage-400 px-3 py-1.5 text-xs font-medium text-sage-700 hover:bg-sage-50"
            >
              Upload .json file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <span className="text-xs text-ink-soft">or paste below</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={12}
            className="w-full rounded-md border border-line bg-white p-2 font-mono text-xs text-ink outline-none focus:border-sage-400"
          />
          {errors.length > 0 && (
            <ul className="list-inside list-disc text-xs text-collision">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-cream-dim"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="rounded-md bg-sage-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-600"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
