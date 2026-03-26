import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AIWarningBanner } from './AIWarningBanner';
import { FieldSourceBadge } from './FieldSourceBadge';
import { MessageCircleQuestion, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { AISetupResponse, FollowUpQuestion } from '@/lib/ai-setup-types';
import { FIELD_LABELS } from '@/lib/ai-setup-types';

interface ClarifyStepProps {
  response: AISetupResponse;
  answers: Record<string, string>;
  onAnswersChange: (a: Record<string, string>) => void;
  onReExtract: () => void;
  onSkipToReview: () => void;
  loading: boolean;
}

export function ClarifyStep({
  response,
  answers,
  onAnswersChange,
  onReExtract,
  onSkipToReview,
  loading,
}: ClarifyStepProps) {
  const questions = response.follow_up_questions || [];
  const missing = response.missing_required_fields || [];
  const conflicts = response.conflicting_fields || [];
  const assumptions = response.assumptions || [];

  const hasIssues = questions.length > 0 || missing.length > 0 || conflicts.length > 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      {response.summary && (
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-sm text-foreground">{response.summary}</p>
        </div>
      )}

      {/* Warnings */}
      <AIWarningBanner warnings={response.warnings || []} />

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
              Conflicts Found
            </span>
          </div>
          <ul className="text-xs text-destructive space-y-1 pl-6 list-disc">
            {conflicts.map((c, i) => (
              <li key={i}>
                <strong>{FIELD_LABELS[c.field] || c.field}</strong>: {c.issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing fields */}
      {missing.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
              Missing Required Fields
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((f) => (
              <Badge key={f} variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400">
                {FIELD_LABELS[f] || f}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Assumptions */}
      {assumptions.length > 0 && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3 space-y-2">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
              Assumptions Made
            </span>
          </div>
          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-0.5 pl-6 list-disc">
            {assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-up questions */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircleQuestion className="h-4 w-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Please Clarify
            </span>
          </div>
          {questions.map((q) => (
            <div key={q.id} className="rounded-md border border-border bg-card p-3 space-y-2">
              <p className="text-sm text-foreground font-medium">{q.question}</p>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {FIELD_LABELS[q.field] || q.field}
                </Badge>
              </div>
              <Input
                value={answers[q.id] || ''}
                onChange={(e) => onAnswersChange({ ...answers, [q.id]: e.target.value })}
                placeholder="Your answer..."
                className="text-sm h-8"
                disabled={loading}
              />
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {questions.length > 0 && (
          <Button
            onClick={onReExtract}
            disabled={loading}
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wide gap-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {loading ? 'Re-processing...' : 'Update with Answers'}
          </Button>
        )}
        <Button
          variant={questions.length > 0 ? 'outline' : 'default'}
          onClick={onSkipToReview}
          disabled={loading}
          className={`gap-2 uppercase tracking-wide text-xs ${
            questions.length === 0 ? 'bg-accent text-accent-foreground hover:bg-accent/90 font-bold' : ''
          }`}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <ArrowRight className="h-4 w-4" />
          {hasIssues ? 'Continue to Review Anyway' : 'Continue to Review'}
        </Button>
      </div>
    </div>
  );
}
