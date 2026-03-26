import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { EXAMPLE_PROMPTS } from '@/lib/ai-setup-types';

interface DescribeStepProps {
  prompt: string;
  onPromptChange: (v: string) => void;
  hints: Record<string, string>;
  onHintsChange: (h: Record<string, string>) => void;
  onGenerate: () => void;
  onManual: () => void;
  loading: boolean;
}

export function DescribeStep({
  prompt,
  onPromptChange,
  hints,
  onHintsChange,
  onGenerate,
  onManual,
  loading,
}: DescribeStepProps) {
  const [showHints, setShowHints] = useState(false);

  function updateHint(key: string, value: string) {
    onHintsChange({ ...hints, [key]: value });
  }

  return (
    <div className="space-y-6">
      {/* Main prompt */}
      <div className="space-y-3">
        <Label className="text-sm font-bold uppercase tracking-wider text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Describe Your Tournament
        </Label>
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder='e.g. "Create a girls U15 netball tournament for 16 teams over 2 days, with 4 pools of 4, 3 points for a win, 1 for a draw, goal difference first, and Cup/Plate playoffs."'
          rows={5}
          className="text-sm resize-none"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Describe your tournament in plain English. Include as much detail as you like — the AI will extract the setup for you.
        </p>
      </div>

      {/* Quick-fill chips */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium" style={{ fontFamily: 'var(--font-display)' }}>
          Quick examples
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex.label}
              onClick={() => onPromptChange(ex.prompt)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-foreground hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional structured hints */}
      <div>
        <button
          onClick={() => setShowHints(!showHints)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showHints ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <span className="uppercase tracking-wider font-medium" style={{ fontFamily: 'var(--font-display)' }}>
            Optional structured hints
          </span>
        </button>
        {showHints && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { key: 'sport', label: 'Sport', placeholder: 'e.g. Netball' },
              { key: 'number_of_teams', label: 'Number of Teams', placeholder: 'e.g. 12' },
              { key: 'start_date', label: 'Start Date', placeholder: 'e.g. 2026-06-12' },
              { key: 'end_date', label: 'End Date', placeholder: 'e.g. 2026-06-14' },
              { key: 'court_count', label: 'Courts / Fields', placeholder: 'e.g. 3' },
              { key: 'format_type', label: 'Format', placeholder: 'e.g. Pool + playoffs' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
                <Input
                  value={hints[key] || ''}
                  onChange={(e) => updateHint(key, e.target.value)}
                  placeholder={placeholder}
                  className="text-sm h-8"
                  disabled={loading}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onGenerate}
          disabled={!prompt.trim() || loading}
          className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wide gap-2 flex-1 sm:flex-none"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? 'Generating setup...' : 'Generate Setup'}
        </Button>
        <Button
          variant="outline"
          onClick={onManual}
          disabled={loading}
          className="gap-2 text-xs uppercase tracking-wide"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <FileText className="h-4 w-4" />
          Start Manually
        </Button>
      </div>
    </div>
  );
}
