import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FieldSourceBadge } from './FieldSourceBadge';
import { AIWarningBanner } from './AIWarningBanner';
import { Save, FileText, Pencil, Check } from 'lucide-react';
import type { AISetupResponse, FieldSource, ExtractedField } from '@/lib/ai-setup-types';
import { FIELD_LABELS, FIELD_GROUPS } from '@/lib/ai-setup-types';

interface ReviewStepProps {
  response: AISetupResponse;
  manualEdits: Record<string, unknown>;
  onManualEditsChange: (edits: Record<string, unknown>) => void;
  onSaveDraft: () => void;
  onConfirm: () => void;
  saving: boolean;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '—';
  return String(val);
}

function EditableField({
  fieldKey,
  field,
  editValue,
  onEdit,
}: {
  fieldKey: string;
  field: ExtractedField | undefined;
  editValue: unknown | undefined;
  onEdit: (key: string, value: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  const label = FIELD_LABELS[fieldKey] || fieldKey;
  const currentValue = editValue !== undefined ? editValue : field?.value;
  const source: FieldSource = editValue !== undefined ? 'user' : (field?.source as FieldSource) || 'default';

  if (!field && editValue === undefined) return null;

  function handleSave(newVal: string) {
    // Try to preserve type
    if (newVal === '' || newVal === '—') {
      onEdit(fieldKey, null);
    } else if (newVal === 'true' || newVal === 'false') {
      onEdit(fieldKey, newVal === 'true');
    } else if (!isNaN(Number(newVal)) && newVal.trim() !== '') {
      onEdit(fieldKey, Number(newVal));
    } else {
      onEdit(fieldKey, newVal);
    }
    setEditing(false);
  }

  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium" style={{ fontFamily: 'var(--font-display)' }}>
            {label}
          </span>
          <FieldSourceBadge source={source} />
        </div>
        {editing ? (
          <div className="flex items-center gap-2 mt-1">
            <Input
              defaultValue={formatValue(currentValue) === '—' ? '' : formatValue(currentValue)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave((e.target as HTMLInputElement).value);
                if (e.key === 'Escape') setEditing(false);
              }}
              autoFocus
              className="text-sm h-7 flex-1"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                const input = (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement);
                if (input) handleSave(input.value);
              }}
              className="h-7 w-7 p-0"
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-foreground mt-0.5">{formatValue(currentValue)}</p>
        )}
      </div>
      {!editing && (
        <button
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:text-foreground transition-colors mt-1 flex-shrink-0"
          aria-label={`Edit ${label}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function ReviewStep({
  response,
  manualEdits,
  onManualEditsChange,
  onSaveDraft,
  onConfirm,
  saving,
}: ReviewStepProps) {
  const fields = response.fields || {};

  function handleEdit(key: string, value: unknown) {
    onManualEditsChange({ ...manualEdits, [key]: value });
  }

  // Merge fields with manual edits for review
  const allFieldKeys = new Set([...Object.keys(fields), ...Object.keys(manualEdits)]);

  return (
    <div className="space-y-6">
      {/* Summary */}
      {response.summary && (
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-sm text-foreground">{response.summary}</p>
        </div>
      )}

      <AIWarningBanner warnings={response.warnings || []} />

      {/* Assumptions */}
      {response.assumptions?.length > 0 && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Assumptions
          </p>
          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-0.5 pl-4 list-disc">
            {response.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Grouped fields */}
      {FIELD_GROUPS.map((group) => {
        const groupFields = group.fields.filter(
          (f) => fields[f] || manualEdits[f] !== undefined
        );
        if (groupFields.length === 0) return null;

        return (
          <div key={group.title} className="rounded-md border border-border bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                {group.title}
              </h3>
            </div>
            <div className="px-4">
              {groupFields.map((fieldKey) => (
                <EditableField
                  key={fieldKey}
                  fieldKey={fieldKey}
                  field={fields[fieldKey]}
                  editValue={manualEdits[fieldKey]}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Ungrouped fields */}
      {(() => {
        const grouped = new Set(FIELD_GROUPS.flatMap((g) => g.fields));
        const ungrouped = [...allFieldKeys].filter((k) => !grouped.has(k) && (fields[k] || manualEdits[k] !== undefined));
        if (ungrouped.length === 0) return null;
        return (
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                Other Fields
              </h3>
            </div>
            <div className="px-4">
              {ungrouped.map((fieldKey) => (
                <EditableField
                  key={fieldKey}
                  fieldKey={fieldKey}
                  field={fields[fieldKey]}
                  editValue={manualEdits[fieldKey]}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={onConfirm}
          disabled={saving}
          className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wide gap-2 flex-1 sm:flex-none"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <Check className="h-4 w-4" />
          {saving ? 'Creating Tournament...' : 'Confirm & Create Tournament'}
        </Button>
        <Button
          variant="outline"
          onClick={onSaveDraft}
          disabled={saving}
          className="gap-2 text-xs uppercase tracking-wide"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <Save className="h-4 w-4" />
          Save as Draft
        </Button>
      </div>
    </div>
  );
}
