import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowLeft, Loader2, WifiOff } from 'lucide-react';
import { DescribeStep } from './DescribeStep';
import { ClarifyStep } from './ClarifyStep';
import { ReviewStep } from './ReviewStep';
import { callAISetup, mapAIConfigToTournament } from '@/lib/ai-setup-api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { AISetupResponse, AISetupStep } from '@/lib/ai-setup-types';

interface AISetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sport?: string;
  onTournamentCreated: () => void;
  onSwitchToManual: () => void;
}

const STEP_TITLES: Record<AISetupStep, string> = {
  describe: 'Step 1 — Describe Tournament',
  clarify: 'Step 2 — Clarify Details',
  review: 'Step 3 — Review Setup',
  confirm: 'Step 4 — Confirmed',
};

const LOADING_MESSAGES = [
  'Reading your tournament setup...',
  'Structuring rules and format...',
  'Checking for missing details...',
];

export default function AISetupDialog({
  open,
  onOpenChange,
  sport,
  onTournamentCreated,
  onSwitchToManual,
}: AISetupDialogProps) {
  const [step, setStep] = useState<AISetupStep>('describe');
  const [prompt, setPrompt] = useState('');
  const [hints, setHints] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [response, setResponse] = useState<AISetupResponse | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [manualEdits, setManualEdits] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  function resetState() {
    setStep('describe');
    setPrompt('');
    setHints({});
    setResponse(null);
    setFollowUpAnswers({});
    setManualEdits({});
    setError(null);
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetState();
    onOpenChange(open);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setLoadingMsgIndex(0);

    // Cycle through loading messages
    const interval = setInterval(() => {
      setLoadingMsgIndex((prev) => Math.min(prev + 1, LOADING_MESSAGES.length - 1));
    }, 1500);

    try {
      const effectiveHints = { ...hints };
      if (sport && !effectiveHints.sport) effectiveHints.sport = sport;

      const result = await callAISetup({
        user_prompt: prompt,
        structured_hints: effectiveHints,
      });

      setResponse(result);

      // Determine next step
      const hasQuestions = (result.follow_up_questions?.length || 0) > 0;
      const hasMissing = (result.missing_required_fields?.length || 0) > 0;
      const hasConflicts = (result.conflicting_fields?.length || 0) > 0;

      if (hasQuestions || hasMissing || hasConflicts) {
        setStep('clarify');
      } else {
        setStep('review');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI service unavailable';
      setError(msg);
      toast.error(msg);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  async function handleReExtract() {
    if (!response) return;
    setLoading(true);
    setError(null);

    try {
      const effectiveHints = { ...hints };
      if (sport && !effectiveHints.sport) effectiveHints.sport = sport;

      const result = await callAISetup({
        user_prompt: prompt,
        structured_hints: effectiveHints,
        follow_up_answers: followUpAnswers,
      });

      setResponse(result);

      const hasQuestions = (result.follow_up_questions?.length || 0) > 0;
      const hasMissing = (result.missing_required_fields?.length || 0) > 0;

      if (!hasQuestions && !hasMissing) {
        setStep('review');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI service unavailable';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!response) return;
    setSaving(true);

    try {
      // Merge AI config with manual edits
      const config = { ...(response.normalized_config || {}), ...manualEdits };
      const fields = response.fields || {};
      const tournamentData = mapAIConfigToTournament(config, fields);

      const id = crypto.randomUUID();

      const { error: insertError } = await supabase.from('tournaments').insert({
        id,
        ...tournamentData,
      });

      if (insertError) throw insertError;

      toast.success('Tournament created successfully!');
      handleOpenChange(false);
      onTournamentCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save tournament';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    if (!response) return;
    setSaving(true);

    try {
      const config = { ...(response.normalized_config || {}), ...manualEdits };
      const fields = response.fields || {};
      const tournamentData = mapAIConfigToTournament(config, fields);

      const id = crypto.randomUUID();

      const { error: insertError } = await supabase.from('tournaments').insert({
        id,
        ...tournamentData,
        status: 'draft',
      });

      if (insertError) throw insertError;

      toast.success('Tournament saved as draft');
      handleOpenChange(false);
      onTournamentCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save draft';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleManual() {
    handleOpenChange(false);
    onSwitchToManual();
  }

  function goBack() {
    if (step === 'clarify') setStep('describe');
    else if (step === 'review') {
      const hasQuestions = (response?.follow_up_questions?.length || 0) > 0;
      setStep(hasQuestions ? 'clarify' : 'describe');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {step !== 'describe' && (
              <button onClick={goBack} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <DialogTitle
                className="uppercase tracking-wider text-base"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                AI Tournament Setup
              </DialogTitle>
            </div>
          </div>
          {/* Step indicator */}
          <div className="flex gap-1 mt-2">
            {(['describe', 'clarify', 'review', 'confirm'] as AISetupStep[]).map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= ['describe', 'clarify', 'review', 'confirm'].indexOf(step)
                    ? 'bg-accent'
                    : 'bg-border'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: 'var(--font-display)' }}>
            {STEP_TITLES[step]}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-2 pr-1">
          {/* Loading overlay */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <Sparkles className="h-10 w-10 text-accent animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">
                {LOADING_MESSAGES[loadingMsgIndex]}
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">We couldn't complete the AI setup right now</span>
              </div>
              <p className="text-xs text-muted-foreground">{error}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleGenerate} className="text-xs">
                  Try Again
                </Button>
                <Button size="sm" variant="outline" onClick={handleManual} className="text-xs">
                  Continue Manually
                </Button>
              </div>
            </div>
          )}

          {/* Steps */}
          {!loading && !error && step === 'describe' && (
            <DescribeStep
              prompt={prompt}
              onPromptChange={setPrompt}
              hints={hints}
              onHintsChange={setHints}
              onGenerate={handleGenerate}
              onManual={handleManual}
              loading={loading}
            />
          )}

          {!loading && response && step === 'clarify' && (
            <ClarifyStep
              response={response}
              answers={followUpAnswers}
              onAnswersChange={setFollowUpAnswers}
              onReExtract={handleReExtract}
              onSkipToReview={() => setStep('review')}
              loading={loading}
            />
          )}

          {!loading && response && step === 'review' && (
            <ReviewStep
              response={response}
              manualEdits={manualEdits}
              onManualEditsChange={setManualEdits}
              onSaveDraft={handleSaveDraft}
              onConfirm={handleConfirm}
              saving={saving}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
