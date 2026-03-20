import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TournamentSettings, getDefaultSettings } from '@/lib/tournament-settings-types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Trophy, CalendarDays, MapPin, Settings2, Gavel,
  Shield, Palette, ClipboardList, Wrench, X, Plus, Upload, ImageIcon, Trash2
} from 'lucide-react';

interface TournamentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<TournamentSettings>;
  onSave: (data: TournamentSettings) => Promise<void>;
  mode: 'create' | 'edit';
  sport?: string;
  tournamentId?: string;
}

function getPublicUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from('tournament-assets').getPublicUrl(path);
  return data.publicUrl;
}

function ImageUploadField({ 
  label, 
  storagePath, 
  onUploaded,
  onRemoved,
  aspectHint,
}: { 
  label: string; 
  storagePath: string | null; 
  onUploaded: (path: string) => void;
  onRemoved: () => void;
  aspectHint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const previewUrl = getPublicUrl(storagePath);

  async function handleFile(file: File) {
    if (!file) return;
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `branding/${crypto.randomUUID()}.${ext}`;
    try {
      setUploading(true);
      const { error } = await supabase.storage.from('tournament-assets').upload(filePath, file, { upsert: true });
      if (error) throw error;
      onUploaded(filePath);
      toast.success(`${label} uploaded`);
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <FieldGroup label={label} optional>
      {previewUrl && storagePath ? (
        <div className="relative group rounded-md overflow-hidden border border-border bg-muted/30">
          <img src={`${previewUrl}?t=${Date.now()}`} alt={label} className="w-full h-32 object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
              <Upload className="h-3 w-3 mr-1" /> Replace
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={onRemoved}>
              <Trash2 className="h-3 w-3 mr-1" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-28 border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <span className="text-xs animate-pulse">Uploading...</span>
          ) : (
            <>
              <ImageIcon className="h-6 w-6" />
              <span className="text-xs">Click to upload {label.toLowerCase()}</span>
              {aspectHint && <span className="text-[10px] text-muted-foreground/60">{aspectHint}</span>}
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
      />
    </FieldGroup>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
      <Icon className="h-4 w-4 text-accent" />
      <h3 className="text-sm font-bold uppercase tracking-wider text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h3>
    </div>
  );
}

function FieldGroup({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
        {label} {optional && <span className="text-muted-foreground/50">(optional)</span>}
      </Label>
      {children}
    </div>
  );
}

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');
  function add() {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="text-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={!input.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-xs">
              {item}
              <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TournamentFormDialog({ open, onOpenChange, initialData, onSave, mode, sport }: TournamentFormDialogProps) {
  const [data, setData] = useState<TournamentSettings>(getDefaultSettings());
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');

  useEffect(() => {
    if (open) {
      const defaults = getDefaultSettings();
      if (sport) defaults.sport_type = sport;
      setData({ ...defaults, ...initialData });
      setActiveTab('identity');
    }
  }, [open, initialData, sport]);

  function update(patch: Partial<TournamentSettings>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    if (!data.name.trim()) return;
    try {
      setSaving(true);
      await onSave(data);
      onOpenChange(false);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  }

  const tabItems = [
    { value: 'identity', icon: Trophy, label: 'Identity' },
    { value: 'schedule', icon: CalendarDays, label: 'Schedule' },
    { value: 'venue', icon: MapPin, label: 'Venue' },
    { value: 'structure', icon: Settings2, label: 'Structure' },
    { value: 'rules', icon: Gavel, label: 'Rules' },
    { value: 'access', icon: Shield, label: 'Access' },
    { value: 'branding', icon: Palette, label: 'Branding' },
    { value: 'registration', icon: ClipboardList, label: 'Registration' },
    { value: 'operational', icon: Wrench, label: 'Operations' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider text-base" style={{ fontFamily: 'var(--font-display)' }}>
            {mode === 'create' ? 'Create Tournament' : 'Edit Tournament'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
          <div className="overflow-x-auto -mx-2 px-2 flex-shrink-0">
            <TabsList className="inline-flex h-auto p-0 bg-transparent gap-0.5">
              {tabItems.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-1 rounded-sm px-2 py-1.5 text-[10px] uppercase tracking-wide font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  <tab.icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 pr-1">
            {/* 1. Identity */}
            <TabsContent value="identity" className="mt-0 space-y-4">
              <SectionHeader icon={Trophy} title="Basic Tournament Identity" />
              <FieldGroup label="Tournament Name *">
                <Input value={data.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Spring Cup 2026" />
              </FieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="Sport Type">
                  <Select value={data.sport_type} onValueChange={(v) => update({ sport_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select sport" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="netball">Netball</SelectItem>
                      <SelectItem value="hockey">Hockey</SelectItem>
                      <SelectItem value="soccer">Soccer</SelectItem>
                      <SelectItem value="basketball">Basketball</SelectItem>
                      <SelectItem value="rugby">Rugby</SelectItem>
                      <SelectItem value="cricket">Cricket</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <FieldGroup label="Tournament Format">
                  <Select value={data.tournament_format} onValueChange={(v) => update({ tournament_format: v })}>
                    <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round_robin">Round Robin</SelectItem>
                      <SelectItem value="knockout">Knockout</SelectItem>
                      <SelectItem value="pool_playoffs">Pool Stages + Playoffs</SelectItem>
                      <SelectItem value="league">League Style</SelectItem>
                      <SelectItem value="swiss">Swiss System</SelectItem>
                      <SelectItem value="double_elimination">Double Elimination</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="Season / Year" optional>
                  <Input value={data.season} onChange={(e) => update({ season: e.target.value })} placeholder="e.g. 2026" />
                </FieldGroup>
                <FieldGroup label="Status">
                  <Select value={data.status} onValueChange={(v: any) => update({ status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>
              <FieldGroup label="Description / Notes" optional>
                <Textarea value={data.description} onChange={(e) => update({ description: e.target.value })} placeholder="Short description of the tournament..." rows={3} />
              </FieldGroup>
            </TabsContent>

            {/* 2. Schedule */}
            <TabsContent value="schedule" className="mt-0 space-y-4">
              <SectionHeader icon={CalendarDays} title="Date & Time Setup" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="Start Date">
                  <Input type="date" value={data.start_date} onChange={(e) => update({ start_date: e.target.value })} />
                </FieldGroup>
                <FieldGroup label="End Date">
                  <Input type="date" value={data.end_date} onChange={(e) => update({ end_date: e.target.value })} />
                </FieldGroup>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="Daily Start Time">
                  <Input type="time" value={data.daily_start_time} onChange={(e) => update({ daily_start_time: e.target.value })} />
                </FieldGroup>
                <FieldGroup label="Daily End Time">
                  <Input type="time" value={data.daily_end_time} onChange={(e) => update({ daily_end_time: e.target.value })} />
                </FieldGroup>
              </div>
              <FieldGroup label="Timezone" optional>
                <Input value={data.timezone} onChange={(e) => update({ timezone: e.target.value })} placeholder="e.g. Africa/Johannesburg" />
              </FieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FieldGroup label="Match Duration (min)">
                  <Input type="number" value={data.match_duration ?? ''} onChange={(e) => update({ match_duration: e.target.value ? parseInt(e.target.value) : null })} placeholder="e.g. 40" />
                </FieldGroup>
                <FieldGroup label="Break Between Matches (min)">
                  <Input type="number" value={data.break_time ?? ''} onChange={(e) => update({ break_time: e.target.value ? parseInt(e.target.value) : null })} placeholder="e.g. 10" />
                </FieldGroup>
                <FieldGroup label="Halftime Structure" optional>
                  <Input value={data.halftime_structure} onChange={(e) => update({ halftime_structure: e.target.value })} placeholder="e.g. 2x20 min halves" />
                </FieldGroup>
              </div>
            </TabsContent>

            {/* 3. Venue */}
            <TabsContent value="venue" className="mt-0 space-y-4">
              <SectionHeader icon={MapPin} title="Venue Information" />
              <FieldGroup label="Venue Name">
                <Input value={data.venue_name} onChange={(e) => update({ venue_name: e.target.value })} placeholder="e.g. Parktown Sports Complex" />
              </FieldGroup>
              <FieldGroup label="Venue Address" optional>
                <Input value={data.venue_address} onChange={(e) => update({ venue_address: e.target.value })} placeholder="Full address" />
              </FieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="Number of Courts / Fields">
                  <Input type="number" value={data.num_courts ?? ''} onChange={(e) => update({ num_courts: e.target.value ? parseInt(e.target.value) : null })} placeholder="e.g. 4" />
                </FieldGroup>
                <FieldGroup label="Indoor / Outdoor">
                  <Select value={data.indoor_outdoor} onValueChange={(v) => update({ indoor_outdoor: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indoor">Indoor</SelectItem>
                      <SelectItem value="outdoor">Outdoor</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>
              <FieldGroup label="Court / Field Names" optional>
                <TagInput value={data.court_names} onChange={(v) => update({ court_names: v })} placeholder="e.g. Court 1, A Court" />
              </FieldGroup>
              <FieldGroup label="Venue Notes" optional>
                <Textarea value={data.venue_notes} onChange={(e) => update({ venue_notes: e.target.value })} placeholder="Parking, warm-up zones, clubhouse details..." rows={3} />
              </FieldGroup>
            </TabsContent>

            {/* 4. Competition Structure */}
            <TabsContent value="structure" className="mt-0 space-y-4">
              <SectionHeader icon={Settings2} title="Competition Structure Rules" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FieldGroup label="Number of Pools">
                  <Input type="number" value={data.num_pools ?? ''} onChange={(e) => update({ num_pools: e.target.value ? parseInt(e.target.value) : null })} />
                </FieldGroup>
                <FieldGroup label="Max Teams">
                  <Input type="number" value={data.max_teams ?? ''} onChange={(e) => update({ max_teams: e.target.value ? parseInt(e.target.value) : null })} />
                </FieldGroup>
                <FieldGroup label="Teams Per Pool">
                  <Input type="number" value={data.teams_per_pool ?? ''} onChange={(e) => update({ teams_per_pool: e.target.value ? parseInt(e.target.value) : null })} />
                </FieldGroup>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FieldGroup label="Points for Win">
                  <Input type="number" value={data.points_for_win} onChange={(e) => update({ points_for_win: parseInt(e.target.value) || 0 })} />
                </FieldGroup>
                <FieldGroup label="Points for Draw">
                  <Input type="number" value={data.points_for_draw} onChange={(e) => update({ points_for_draw: parseInt(e.target.value) || 0 })} />
                </FieldGroup>
                <FieldGroup label="Points for Loss">
                  <Input type="number" value={data.points_for_loss} onChange={(e) => update({ points_for_loss: parseInt(e.target.value) || 0 })} />
                </FieldGroup>
              </div>
              <FieldGroup label="Tiebreak Rules (in order)" optional>
                <TagInput value={data.tiebreak_rules} onChange={(v) => update({ tiebreak_rules: v })} placeholder="e.g. Goal difference, Goals scored, Head-to-head" />
              </FieldGroup>
              <FieldGroup label="Playoff Qualification" optional>
                <Textarea value={data.playoff_qualification} onChange={(e) => update({ playoff_qualification: e.target.value })} placeholder="e.g. Top 2 in each pool advance to semi-finals" rows={2} />
              </FieldGroup>
              <FieldGroup label="Placement Rules" optional>
                <Textarea value={data.placement_rules} onChange={(e) => update({ placement_rules: e.target.value })} placeholder="e.g. Bottom teams play 5th/6th playoff" rows={2} />
              </FieldGroup>
            </TabsContent>

            {/* 5. Match Rules */}
            <TabsContent value="rules" className="mt-0 space-y-4">
              <SectionHeader icon={Gavel} title="Match Rules" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="Regulation Match Length (min)">
                  <Input type="number" value={data.regulation_length ?? ''} onChange={(e) => update({ regulation_length: e.target.value ? parseInt(e.target.value) : null })} placeholder="e.g. 40" />
                </FieldGroup>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Extra Time Allowed</Label>
                    <Switch checked={data.extra_time_allowed} onCheckedChange={(v) => update({ extra_time_allowed: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Draws in Pool Stage</Label>
                    <Switch checked={data.draws_allowed_pools} onCheckedChange={(v) => update({ draws_allowed_pools: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Draws in Playoffs</Label>
                    <Switch checked={data.draws_allowed_playoffs} onCheckedChange={(v) => update({ draws_allowed_playoffs: v })} />
                  </div>
                </div>
              </div>
              <FieldGroup label="Penalty / Sudden Death Rules" optional>
                <Textarea value={data.penalty_rules} onChange={(e) => update({ penalty_rules: e.target.value })} placeholder="Describe penalty shootout or sudden death rules..." rows={2} />
              </FieldGroup>
              <FieldGroup label="Sport-Specific Scoring Rules" optional>
                <Textarea value={data.scoring_rules} onChange={(e) => update({ scoring_rules: e.target.value })} rows={2} />
              </FieldGroup>
              <FieldGroup label="Forfeit / Walkover Rule" optional>
                <Input value={data.forfeit_rule} onChange={(e) => update({ forfeit_rule: e.target.value })} placeholder="e.g. 3-0 win awarded" />
              </FieldGroup>
              <FieldGroup label="Late Arrival Rule" optional>
                <Input value={data.late_arrival_rule} onChange={(e) => update({ late_arrival_rule: e.target.value })} placeholder="e.g. 10 min grace period" />
              </FieldGroup>
              <FieldGroup label="Forfeit Score Treatment" optional>
                <Input value={data.forfeit_score_treatment} onChange={(e) => update({ forfeit_score_treatment: e.target.value })} placeholder="e.g. 3-0 or based on average" />
              </FieldGroup>
            </TabsContent>

            {/* 6. Access */}
            <TabsContent value="access" className="mt-0 space-y-4">
              <SectionHeader icon={Shield} title="Access & Admin Settings" />
              <div className="flex items-center justify-between p-3 rounded bg-muted/50">
                <div>
                  <Label className="text-sm font-medium text-foreground">Public Tournament</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Visible to everyone without an invite code</p>
                </div>
                <Switch checked={data.is_public} onCheckedChange={(v) => update({ is_public: v })} />
              </div>
              {!data.is_public && (
                <FieldGroup label="Invite / Access Code">
                  <Input value={data.invite_code} onChange={(e) => update({ invite_code: e.target.value })} placeholder="Enter a code viewers will need" />
                </FieldGroup>
              )}
            </TabsContent>

            {/* 7. Branding */}
            <TabsContent value="branding" className="mt-0 space-y-4">
              <SectionHeader icon={Palette} title="Branding & Display" />
              <FieldGroup label="Manager / Organiser Name">
                <Input value={data.manager_name} onChange={(e) => update({ manager_name: e.target.value })} placeholder="Tournament Manager" />
              </FieldGroup>
              <FieldGroup label="Theme Colour" optional>
                <div className="flex items-center gap-3">
                  <Input type="color" value={data.theme_color || '#D4AF37'} onChange={(e) => update({ theme_color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
                  <Input value={data.theme_color} onChange={(e) => update({ theme_color: e.target.value })} placeholder="#D4AF37" className="flex-1" />
                </div>
              </FieldGroup>
              <FieldGroup label="Host School / Organisation" optional>
                <Input value={data.host_org} onChange={(e) => update({ host_org: e.target.value })} />
              </FieldGroup>
              <FieldGroup label="Sponsor Names" optional>
                <TagInput value={data.sponsor_names} onChange={(v) => update({ sponsor_names: v })} placeholder="Add sponsor name" />
              </FieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="Contact Person" optional>
                  <Input value={data.contact_person} onChange={(e) => update({ contact_person: e.target.value })} />
                </FieldGroup>
                <FieldGroup label="Contact Details" optional>
                  <Input value={data.contact_details} onChange={(e) => update({ contact_details: e.target.value })} placeholder="Phone or email" />
                </FieldGroup>
              </div>
            </TabsContent>

            {/* 8. Registration */}
            <TabsContent value="registration" className="mt-0 space-y-4">
              <SectionHeader icon={ClipboardList} title="Registration Settings" />
              <div className="flex items-center justify-between p-3 rounded bg-muted/50">
                <div>
                  <Label className="text-sm font-medium text-foreground">Registration Open</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Allow teams to register</p>
                </div>
                <Switch checked={data.registration_open} onCheckedChange={(v) => update({ registration_open: v })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="Registration Deadline" optional>
                  <Input type="date" value={data.registration_deadline} onChange={(e) => update({ registration_deadline: e.target.value })} />
                </FieldGroup>
                <FieldGroup label="Entry Fee" optional>
                  <Input value={data.entry_fee} onChange={(e) => update({ entry_fee: e.target.value })} placeholder="e.g. R500 per team" />
                </FieldGroup>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FieldGroup label="Max Teams" optional>
                  <Input type="number" value={data.max_teams_registration ?? ''} onChange={(e) => update({ max_teams_registration: e.target.value ? parseInt(e.target.value) : null })} />
                </FieldGroup>
                <FieldGroup label="Age Group / Division" optional>
                  <Input value={data.age_group} onChange={(e) => update({ age_group: e.target.value })} placeholder="e.g. U18, Senior" />
                </FieldGroup>
                <FieldGroup label="Gender Category" optional>
                  <Select value={data.gender_category} onValueChange={(v) => update({ gender_category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mixed">Mixed</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>
              <FieldGroup label="School / Club / Open Category" optional>
                <Select value={data.school_club_category} onValueChange={(v) => update({ school_club_category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="club">Club</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
            </TabsContent>

            {/* 9. Operational */}
            <TabsContent value="operational" className="mt-0 space-y-4">
              <SectionHeader icon={Wrench} title="Operational Settings" />
              <FieldGroup label="Medical / Emergency Contact" optional>
                <Input value={data.medical_contact} onChange={(e) => update({ medical_contact: e.target.value })} placeholder="Name and phone number" />
              </FieldGroup>
              <FieldGroup label="Rules Document" optional>
                <Textarea value={data.rules_doc} onChange={(e) => update({ rules_doc: e.target.value })} placeholder="Paste rules or link to document..." rows={3} />
              </FieldGroup>
              <FieldGroup label="Code of Conduct" optional>
                <Textarea value={data.code_of_conduct} onChange={(e) => update({ code_of_conduct: e.target.value })} placeholder="Behavioral expectations for players and spectators..." rows={3} />
              </FieldGroup>
              <FieldGroup label="Weather / Contingency Notes" optional>
                <Textarea value={data.weather_notes} onChange={(e) => update({ weather_notes: e.target.value })} placeholder="Rain policy, extreme heat protocols..." rows={2} />
              </FieldGroup>
              <FieldGroup label="Announcements" optional>
                <Textarea value={data.announcements} onChange={(e) => update({ announcements: e.target.value })} placeholder="Public announcements for participants..." rows={3} />
              </FieldGroup>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border flex-shrink-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            * Only tournament name is required
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving || !data.name.trim()}
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wide"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {saving ? 'Saving...' : mode === 'create' ? 'Create Tournament' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
