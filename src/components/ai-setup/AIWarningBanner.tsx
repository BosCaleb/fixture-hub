import { AlertTriangle } from 'lucide-react';

export function AIWarningBanner({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
          Warnings
        </span>
      </div>
      <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5 pl-6 list-disc">
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
