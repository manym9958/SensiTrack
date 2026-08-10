import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  Activity, ArrowLeft, BarChart3, Check, ChevronDown, ChevronUp, CircleHelp,
  ClipboardList, CloudOff, Database, History as HistoryIcon, Info, Leaf,
  BookOpen, Plus, RotateCcw, Save, ShieldCheck, SlidersHorizontal, Sparkles,
  Trash2, X
} from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import NotFound from '@/pages/not-found';

type Entry = {
  id: string; date: string;
  overallPain: number;
  facialPain: number; jawTeethPain: number; earPain: number; headache: number;
  scalpTenderness: number; tinnitus: number; dizziness: number; fatigue: number;
  sleepQuality: number; painType: string; triggers: string[]; customTrigger?: string;
  episodeDuration: string; notes: string; createdAt: string;
};

const symptoms: { key: keyof Entry; label: string; color: string }[] = [
  { key: 'overallPain', label: 'Overall pain', color: '#c56e57' },
  { key: 'facialPain', label: 'Face', color: '#3f8982' },
  { key: 'jawTeethPain', label: 'Jaw & teeth', color: '#df977b' },
  { key: 'earPain', label: 'Ear', color: '#679ac0' },
  { key: 'headache', label: 'Headache', color: '#daa648' },
  { key: 'scalpTenderness', label: 'Scalp', color: '#957ba8' },
  { key: 'tinnitus', label: 'Tinnitus', color: '#bc7588' },
  { key: 'dizziness', label: 'Dizziness', color: '#6e9e83' },
  { key: 'fatigue', label: 'Fatigue', color: '#8793a4' },
];
const triggers = ['Sleep', 'Stress', 'Movement', 'Meals', 'Weather', 'Screen time'];
const painTypes = ['Aching', 'Burning', 'Pressure', 'Throbbing', 'Sharp', 'Tender'];

function isoDay(offset: number) {
  const d = new Date(); d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}
function samples(): Entry[] {
  const rows = [
    [0, 5, 5, 4, 2, 5, 3, 4, 3, 6, 5, 'Pressure', ['Stress', 'Screen time'], 'Most of the afternoon', 'A tender day around my temples. A quieter evening helped.'],
    [1, 4, 4, 3, 2, 3, 2, 3, 2, 7, 4, 'Aching', ['Sleep'], 'A few hours', 'Woke feeling a little worn out.'],
    [3, 2, 2, 2, 1, 2, 1, 1, 2, 8, 3, 'Tender', ['Weather'], 'Short episodes', 'A fairly gentle day.'],
    [5, 4, 3, 3, 4, 1, 4, 2, 2, 3, 6, 'Throbbing', ['Meals', 'Stress'], 'Morning to midday', 'Noticed it after a late breakfast.'],
    [7, 6, 6, 5, 3, 6, 4, 5, 5, 5, 7, 'Pressure', ['Movement', 'Screen time'], 'Most of the day', 'Needed more breaks than usual.'],
    [10, 3, 3, 2, 2, 3, 2, 2, 2, 2, 7, 'Aching', ['Sleep'], 'An hour or two', 'Settled after a nap.'],
    [13, 5, 5, 4, 2, 4, 3, 3, 3, 3, 6, 'Sharp', ['Weather', 'Stress'], 'On and off', 'A changeable day.'],
    [16, 2, 2, 1, 1, 2, 1, 1, 1, 1, 8, 'Tender', [], 'Brief', 'Barely noticeable by evening.'],
  ] as const;
  return rows.map((r, i) => ({
    id: `sample-${i}`, date: isoDay(r[0]), overallPain: r[1], facialPain: r[2], jawTeethPain: r[3],
    earPain: r[4], headache: r[5], scalpTenderness: r[6], tinnitus: r[7],
    dizziness: r[8], fatigue: r[9], sleepQuality: 10 - r[10], painType: r[11],
    triggers: [...r[12]], episodeDuration: r[13], notes: r[14], createdAt: new Date().toISOString()
  }));
}

const blankEntry = (date = isoDay(0)): Entry => ({
  id: '', date, overallPain: 0, facialPain: 0, jawTeethPain: 0, earPain: 0, headache: 0,
  scalpTenderness: 0, tinnitus: 0, dizziness: 0, fatigue: 0, sleepQuality: 0,
  painType: '', triggers: [], customTrigger: '', episodeDuration: '', notes: '', createdAt: ''
});

function formatDate(date: string, long = false) {
  return new Intl.DateTimeFormat('en-US', { weekday: long ? 'long' : 'short', month: 'short', day: 'numeric', year: long ? 'numeric' : undefined }).format(new Date(`${date}T12:00:00`));
}
function scaleValue(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.min(10, Math.max(0, Math.round(number))) : 0;
}
function average(entry: Entry) {
  return Math.round((symptoms.reduce((sum, s) => sum + scaleValue(entry[s.key]), 0) / symptoms.length) * 10) / 10;
}
function severityLabel(n: number) { const value = scaleValue(n); return value === 0 ? 'None' : value <= 3 ? 'Mild / barely there' : value <= 6 ? 'Moderate' : 'Restricted daily activities'; }

function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('quietly-entries');
    if (stored) {
      try {
        const saved = JSON.parse(stored) as Partial<Entry>[];
        setEntries(saved.map(entry => ({
          ...blankEntry(entry.date || isoDay(0)),
          ...entry,
          overallPain: scaleValue(entry.overallPain),
          facialPain: scaleValue(entry.facialPain),
          jawTeethPain: scaleValue(entry.jawTeethPain),
          earPain: scaleValue(entry.earPain),
          headache: scaleValue(entry.headache),
          scalpTenderness: scaleValue(entry.scalpTenderness),
          tinnitus: scaleValue(entry.tinnitus),
          dizziness: scaleValue(entry.dizziness),
          fatigue: scaleValue(entry.fatigue),
          sleepQuality: scaleValue(entry.sleepQuality),
        })) as Entry[]);
      } catch {
        setEntries(samples());
      }
    } else {
      setEntries(samples());
    }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem('quietly-entries', JSON.stringify(entries)); }, [entries, ready]);
  return { entries, setEntries, ready };
}

function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const nav = [{ href: '/', label: 'Today', icon: Sparkles }, { href: '/history', label: 'History', icon: HistoryIcon }, { href: '/trends', label: 'Trends', icon: BarChart3 }, { href: '/how-to-use', label: 'How to use', icon: BookOpen }];
  return <div className="noise min-h-[100dvh]">
    <header className="sticky top-0 z-40 border-b border-[#d9d4c9]/80 bg-[#faf8f2]/90 backdrop-blur-md">
      <div className="mx-auto flex h-[70px] max-w-[1180px] items-center justify-between px-5 md:px-8">
        <Link href="/" data-testid="link-logo" className="flex items-center gap-3 no-underline">
          <div className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#367d77] text-[#f8f3e8] shadow-sm"><Leaf size={20} strokeWidth={1.8} /></div>
          <div><div className="serif text-[22px] font-semibold leading-none tracking-[-.03em] text-[#284b4c]">quietly</div><div className="mono mt-1 text-[8px] uppercase tracking-[.19em] text-[#7c8b87]">a little space to notice</div></div>
        </Link>
        <nav className="hidden items-center gap-1 rounded-full bg-[#f1ede4] p-1 md:flex" aria-label="Main navigation">
          {nav.map(item => <Link key={item.href} href={item.href} data-testid={`link-nav-${item.label.toLowerCase()}`} className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold no-underline transition ${location === item.href ? 'bg-[#faf8f2] text-[#286d68] shadow-sm' : 'text-[#71807d] hover:text-[#286d68]'}`}><item.icon size={15} strokeWidth={1.8} />{item.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2 text-[#71807d]"><ShieldCheck size={17} /><span className="hidden text-[11px] font-medium sm:inline">Private on this device</span></div>
      </div>
    </header>
    <main className="mx-auto max-w-[1180px] px-5 pb-28 pt-8 md:px-8 md:pb-16 md:pt-12">{children}</main>
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-[#d9d4c9]/80 bg-[#faf8f2]/95 px-3 py-2 backdrop-blur-md md:hidden" aria-label="Mobile navigation">
      {nav.map(item => <Link key={item.href} href={item.href} data-testid={`link-mobile-${item.label.toLowerCase()}`} className={`flex min-w-[72px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold no-underline ${location === item.href ? 'text-[#286d68]' : 'text-[#88918d]'}`}><item.icon size={19} strokeWidth={1.8} />{item.label}</Link>)}
    </nav>
  </div>;
}

function Button({ children, onClick, variant = 'primary', type = 'button', testId, disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary'|'soft'|'ghost'|'danger'; type?: 'button'|'submit'; testId: string; disabled?: boolean }) {
  const styles = { primary: 'bg-[#367d77] text-[#faf8f2] hover:bg-[#286d68] shadow-[0_5px_14px_rgba(54,125,119,.2)]', soft: 'bg-[#e4efeb] text-[#286d68] hover:bg-[#d8e8e3]', ghost: 'text-[#637773] hover:bg-[#eee9df]', danger: 'bg-[#f6e4df] text-[#a75449] hover:bg-[#f1d8d1]' };
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}>{children}</button>;
}

function PageIntro({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mono mb-2 text-[10px] font-medium uppercase tracking-[.2em] text-[#8b9b94]">{eyebrow}</div><h1 className="serif m-0 text-[clamp(34px,5vw,49px)] font-semibold leading-[.98] tracking-[-.045em] text-[#284b4c]">{title}</h1><p className="mt-3 max-w-[510px] text-[14px] leading-6 text-[#73827e]">{detail}</p></div>{action}</div>;
}

function Score({ value, color = '#367d77' }: { value: number; color?: string }) {
  const safeValue = scaleValue(value);
  return <div className="flex items-center gap-2"><div className="h-2 w-[74px] overflow-hidden rounded-full bg-[#e9e5db]"><div className="h-full rounded-full transition-all" style={{ width: `${safeValue * 10}%`, background: color }} /></div><span className="mono w-5 text-right text-[11px] text-[#657572]">{safeValue}</span></div>;
}

function Today({ entries, setEntries }: { entries: Entry[]; setEntries: React.Dispatch<React.SetStateAction<Entry[]>> }) {
  const today = entries.find(e => e.date === isoDay(0));
  const [editing, setEditing] = useState(!!today);
  const [showForm, setShowForm] = useState(!today);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<Entry>(today || blankEntry());
  useEffect(() => { if (today && !editing) setDraft(today); }, [today, editing]);
  const set = (key: keyof Entry, value: Entry[keyof Entry]) => setDraft(d => ({ ...d, [key]: value }));
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const entry = { ...draft, id: draft.id || `entry-${Date.now()}`, createdAt: draft.createdAt || new Date().toISOString() };
    setEntries(prev => [entry, ...prev.filter(e => e.date !== entry.date)].sort((a, b) => b.date.localeCompare(a.date)));
    setDraft(entry); setEditing(true); setShowForm(false); setSaved(true); setTimeout(() => setSaved(false), 2200);
  };
  const avg = today ? average(today) : null;
  return <div className="page-in">
     <PageIntro eyebrow={formatDate(isoDay(0), true)} title="How is today holding you?" detail="Record today’s symptoms, sleep, and anything that may have been around them." action={<div className="flex items-center gap-2 text-[11px] text-[#82918c]"><CloudOff size={16} />Saved only on this device</div>} />
    <div className="grid gap-5 lg:grid-cols-[1.12fr_.88fr]">
      <section className="rounded-[26px] bg-[#dbece6] p-6 sm:p-8">
        <div className="flex items-start justify-between"><div><div className="mono text-[10px] uppercase tracking-[.18em] text-[#5d8780]">A gentle check-in</div><h2 className="serif mt-2 text-[30px] font-semibold tracking-[-.03em] text-[#2c5554]">{today ? 'You made a note today.' : 'Your day is still unwritten.'}</h2></div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f4dfd5] text-[#bb725c]"><Leaf size={20} /></div></div>
         <p className="mt-3 max-w-[440px] text-[14px] leading-6 text-[#5e7771]">{today ? `Your recorded symptom average was ${avg}/10.` : 'No entry has been saved for today.'}</p>
        <div className="mt-7 flex flex-wrap gap-3">{today && <Button variant="soft" onClick={() => { setDraft(today); setShowForm(true); }} testId="button-edit-today"><SlidersHorizontal size={16} />Edit today</Button>}<Button variant={today ? 'ghost' : 'primary'} onClick={() => { setDraft(blankEntry()); setShowForm(true); }} testId="button-open-entry"><Plus size={17} />{today ? 'Add a note' : 'Start today’s entry'}</Button></div>
      </section>
      <section className="rounded-[26px] border border-[#e0dbd0] bg-[#fffdf8] p-6 card-shadow sm:p-8">
        <div className="flex items-center justify-between"><h2 className="serif text-[23px] font-semibold text-[#335453]">Your recent rhythm</h2><Activity size={19} className="text-[#6e9c95]" /></div>
         <p className="mt-2 text-[13px] leading-5 text-[#7a8985]">Latest saved entries, newest first.</p>
        <div className="mt-6 space-y-3">{entries.slice(0, 3).map((e, i) => <div key={e.id} data-testid={`row-recent-${e.id}`} className="flex items-center justify-between border-b border-[#eee9df] pb-3 last:border-0 last:pb-0"><div className="flex items-center gap-3"><div className={`h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-[#df977b]' : 'bg-[#a6c9bf]'}`} /><span className="text-[13px] text-[#526762]">{i === 0 ? 'Today' : formatDate(e.date)}</span></div><Score value={Math.round(average(e))} /></div>)}</div>
        {entries.length === 0 && <p className="mt-5 text-sm text-[#7a8985]">Your rhythm will appear here as you add days.</p>}
      </section>
    </div>
    {showForm && <form onSubmit={save} className="mt-6 rounded-[26px] border border-[#e0dbd0] bg-[#fffdf8] p-6 card-shadow sm:p-8">
       <div className="mb-7 flex items-start justify-between gap-4"><div><div className="mono text-[10px] uppercase tracking-[.18em] text-[#8b9b94]">Daily entry</div><h2 className="serif mt-2 text-[28px] font-semibold text-[#335453]">Today’s details</h2></div><button type="button" onClick={() => setShowForm(false)} data-testid="button-close-entry" className="rounded-full p-2 text-[#8a9792] hover:bg-[#f1ede4]"><X size={18} /></button></div>
      <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
         <div><h3 className="mb-4 text-[12px] font-bold uppercase tracking-[.12em] text-[#71827d]">Symptoms & energy</h3><div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">{symptoms.map(s => { const value = scaleValue(draft[s.key]); return <label key={s.key} className="block" data-testid={`field-${s.key}`}><div className="mb-2 flex justify-between gap-3 text-[13px] font-medium text-[#4c625e]"><span>{s.label}</span><span className="mono text-right text-[11px] text-[#83918d]">{value}/10 · {severityLabel(value)}</span></div><input aria-label={`${s.label} severity`} type="range" min="0" max="10" value={value} onChange={e => set(s.key, Number(e.target.value))} style={{ '--fill': `${value * 10}%` } as React.CSSProperties} className="slider w-full" data-testid={`input-${s.key}`} /><div className="mt-1 flex justify-between text-[9px] text-[#9ba5a0]"><span>0 · none</span><span>10 · strong</span></div></label>; })}</div><label className="mt-7 block"><div className="mb-2 flex justify-between text-[13px] font-medium text-[#4c625e]"><span>Sleep quality</span><span className="mono text-[11px] text-[#83918d]">{scaleValue(draft.sleepQuality)}/10</span></div><input aria-label="Sleep quality" type="range" min="0" max="10" value={scaleValue(draft.sleepQuality)} onChange={e => set('sleepQuality', Number(e.target.value))} style={{ '--fill': `${scaleValue(draft.sleepQuality) * 10}%` } as React.CSSProperties} className="slider w-full" data-testid="input-sleep-quality" /><div className="mt-1 flex justify-between text-[9px] text-[#9ba5a0]"><span>0 · not restful</span><span>10 · restful</span></div></label></div>
        <div className="space-y-7"><FieldLabel title="Pain quality"><div className="flex flex-wrap gap-2">{painTypes.map(type => <button type="button" key={type} onClick={() => set('painType', type)} data-testid={`button-pain-type-${type.toLowerCase()}`} className={`rounded-full border px-3 py-2 text-[12px] transition ${draft.painType === type ? 'border-[#79a99f] bg-[#e1efea] font-semibold text-[#286d68]' : 'border-[#e1ddd3] text-[#71817d] hover:border-[#a7c4bb]'}`}>{type}</button>)}</div></FieldLabel>
          <FieldLabel title="Anything that seemed to be around it?"><div className="flex flex-wrap gap-2">{triggers.map(trigger => { const active = draft.triggers.includes(trigger); return <button type="button" key={trigger} onClick={() => set('triggers', active ? draft.triggers.filter(t => t !== trigger) : [...draft.triggers, trigger])} data-testid={`button-trigger-${trigger.toLowerCase().replace(' ', '-')}`} className={`rounded-full border px-3 py-2 text-[12px] transition ${active ? 'border-[#df977b] bg-[#f8e5dc] font-semibold text-[#a65f4f]' : 'border-[#e1ddd3] text-[#71817d]'}`}>{active && <Check size={13} className="mr-1 inline" />}{trigger}</button>; })}</div><input value={draft.customTrigger || ''} onChange={e => set('customTrigger', e.target.value)} placeholder="Add your own, if you’d like" data-testid="input-custom-trigger" className="mt-3 w-full rounded-xl border border-[#e1ddd3] bg-[#faf8f2] px-3 py-2.5 text-[13px] text-[#526762] placeholder:text-[#a2aca6]" /></FieldLabel>
          <FieldLabel title="How long did it last?"><select value={draft.episodeDuration} onChange={e => set('episodeDuration', e.target.value)} data-testid="select-duration" className="w-full rounded-xl border border-[#e1ddd3] bg-[#faf8f2] px-3 py-3 text-[13px] text-[#526762]"><option value="">Choose a description</option><option>Brief</option><option>Short episodes</option><option>A few hours</option><option>Most of the day</option><option>On and off</option></select></FieldLabel>
          <FieldLabel title="A few words for future you"><textarea value={draft.notes} onChange={e => set('notes', e.target.value)} rows={4} placeholder="What would you like to remember?" data-testid="textarea-notes" className="w-full resize-none rounded-xl border border-[#e1ddd3] bg-[#faf8f2] px-3 py-3 text-[13px] leading-5 text-[#526762] placeholder:text-[#a2aca6]" /></FieldLabel>
        </div>
      </div>
      <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-[#eee9df] pt-5 sm:flex-row sm:items-center"><p className="flex items-start gap-2 text-[11px] leading-4 text-[#8b9792]"><Info size={15} className="mt-0.5 shrink-0 text-[#6d9f96]" />This is personal reflection, not a diagnostic or treatment tool.</p><div className="flex gap-2"><Button variant="ghost" onClick={() => setShowForm(false)} testId="button-cancel-entry">Cancel</Button><Button type="submit" testId="button-save-entry"><Save size={16} />Save this day</Button></div></div>
    </form>}
    {saved && <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#2f716b] px-4 py-3 text-[13px] font-semibold text-[#faf8f2] shadow-xl md:bottom-8"><Check size={16} />Saved quietly</div>}
  </div>;
}

function FieldLabel({ title, children }: { title: string; children: React.ReactNode }) { return <div><div className="mb-3 text-[12px] font-bold uppercase tracking-[.1em] text-[#71827d]">{title}</div>{children}</div>; }

function HowToUse() {
  const guideSymptoms = [
    ['Overall pain', 'Your overall pain level for the day, considering all pain areas together.'],
    ['Face', 'Any type of pain felt across the entire facial area.'],
    ['Jaw & teeth', 'Pain, soreness, pressure, or sensitivity in your jaw or teeth.'],
    ['Ear', 'Pain, pressure, fullness, or discomfort in or around your ears.'],
    ['Headache', 'Pain or pressure in your head, separate from facial or jaw pain.'],
    ['Scalp tenderness', 'Soreness or pain when touching, brushing, or resting on your scalp.'],
    ['Tinnitus', 'Ringing, buzzing, humming, or another sound in your ears that is not coming from outside.'],
    ['Dizziness', 'Feeling lightheaded, unsteady, spinning, or off-balance.'],
    ['Fatigue', 'A lack of energy or unusual tiredness.'],
    ['Sleep quality', 'How restful or refreshed your sleep felt. Use 0 for not restful and 10 for very restful.'],
  ];
  return <div className="page-in">
    <PageIntro eyebrow="A quick guide" title="How to use" detail="Use this journal to record what you notice each day and review your own notes over time." action={<div className="flex items-center gap-2 text-[11px] text-[#82918c]"><BookOpen size={16} />Simple instructions</div>} />
    <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
      <section className="rounded-[26px] bg-[#dbece6] p-6 sm:p-8">
        <div className="mono text-[10px] uppercase tracking-[.18em] text-[#5d8780]">Start here</div>
        <h2 className="serif mt-2 text-[29px] font-semibold tracking-[-.03em] text-[#2c5554]">One day at a time</h2>
        <ol className="mt-6 space-y-5 text-[13px] leading-5 text-[#5e7771]">
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#367d77] text-[11px] font-bold text-white">1</span><span>Open <strong>Today</strong> and move each slider to the number that best matches your day. New entries begin at 0.</span></li>
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#367d77] text-[11px] font-bold text-white">2</span><span>Select a pain quality, note any possible triggers, and add duration or notes if useful.</span></li>
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#367d77] text-[11px] font-bold text-white">3</span><span>Save the day. Use <strong>History</strong> to read earlier entries and <strong>Trends</strong> to compare selected values.</span></li>
        </ol>
        <div className="mt-7 flex items-start gap-2 border-t border-[#bcd9d0] pt-5 text-[11px] leading-4 text-[#5f7b74]"><ShieldCheck size={15} className="mt-0.5 shrink-0" />Entries are saved only in this browser. This tool records personal observations; it does not diagnose or recommend treatment.</div>
      </section>
      <section className="rounded-[26px] border border-[#e0dbd0] bg-[#fffdf8] p-6 card-shadow sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><h2 className="serif text-[25px] font-semibold text-[#335453]">What the values ask you to notice</h2><p className="mt-1 text-[12px] leading-5 text-[#85918d]">For pain symptoms, choose the number that best reflects the day.</p></div><CircleHelp size={18} className="mt-1 shrink-0 text-[#99a6a0]" /></div>
        <div className="mt-5 space-y-3">{guideSymptoms.map(([label, description]) => <div key={label} className="rounded-2xl bg-[#f7f4ed] px-4 py-3"><div className="text-[13px] font-semibold text-[#4c625e]">{label}</div><p className="mt-1 text-[12px] leading-5 text-[#71817d]">{description}</p></div>)}</div>
      </section>
    </div>
    <section className="mt-5 rounded-[26px] border border-[#e0dbd0] bg-[#fffdf8] p-6 card-shadow sm:p-8">
      <h2 className="serif text-[25px] font-semibold text-[#335453]">Pain scale</h2>
      <p className="mt-1 text-[12px] leading-5 text-[#85918d]">Use the same simple guide each day so your entries are easier to compare.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#d6e5df] bg-[#e8f2ee] p-4"><div className="mono text-[18px] font-semibold text-[#367d77]">0</div><div className="mt-1 text-[13px] font-semibold text-[#4c625e]">None</div><p className="mt-1 text-[12px] leading-5 text-[#71817d]">No pain felt.</p></div>
        <div className="rounded-2xl border border-[#d6e5df] bg-[#f4f7f0] p-4"><div className="mono text-[18px] font-semibold text-[#679a78]">1–3</div><div className="mt-1 text-[13px] font-semibold text-[#4c625e]">Mild / barely there</div><p className="mt-1 text-[12px] leading-5 text-[#71817d]">Present, but easy to put out of mind.</p></div>
        <div className="rounded-2xl border border-[#ecd5c9] bg-[#f8e5dc] p-4"><div className="mono text-[18px] font-semibold text-[#b56651]">4–6</div><div className="mt-1 text-[13px] font-semibold text-[#4c625e]">Moderate</div><p className="mt-1 text-[12px] leading-5 text-[#71817d]">Was on my mind sometimes.</p></div>
        <div className="rounded-2xl border border-[#e8c4ba] bg-[#f6ddd6] p-4 sm:col-span-3"><div className="mono text-[18px] font-semibold text-[#a75449]">7–10</div><div className="mt-1 text-[13px] font-semibold text-[#4c625e]">Restricted my daily activities</div><p className="mt-1 text-[12px] leading-5 text-[#71817d]">The pain made usual activities harder or stopped me from doing some of them.</p></div>
      </div>
    </section>
  </div>;
}

function HistoryPage({ entries, setEntries }: { entries: Entry[]; setEntries: React.Dispatch<React.SetStateAction<Entry[]>> }) {
  const [open, setOpen] = useState<string | null>(entries[0]?.id || null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  return <div className="page-in"><PageIntro eyebrow="Your notebook" title="History" detail="A chronological, private record of saved entries, newest first." action={<Button variant="soft" onClick={() => { window.location.href = '/'; }} testId="button-add-history"><Plus size={16} />Add an entry</Button>} />
    <div className="mb-6 flex items-center gap-2 rounded-2xl border border-[#d6e5df] bg-[#e8f2ee] px-4 py-3 text-[12px] text-[#5a7972]"><ShieldCheck size={17} className="text-[#43877d]" /><span>Only you can see this notebook. Entries stay in this browser until you choose to remove them.</span></div>
    {sorted.length ? <div className="space-y-3">{sorted.map((entry, index) => { const isOpen = open === entry.id; return <article key={entry.id} className={`overflow-hidden rounded-[22px] border bg-[#fffdf8] transition ${isOpen ? 'border-[#b8d3c9] card-shadow' : 'border-[#e3ded4]'}`}><button onClick={() => setOpen(isOpen ? null : entry.id)} data-testid={`button-expand-entry-${entry.id}`} className="flex w-full items-center gap-4 px-5 py-5 text-left sm:px-7"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${index === 0 ? 'bg-[#f7dfd4] text-[#b56e58]' : 'bg-[#e4efeb] text-[#43877d]'}`}><span className="serif text-[19px] font-semibold">{new Date(`${entry.date}T12:00:00`).getDate()}</span></div><div className="min-w-0 flex-1"><div className="text-[15px] font-semibold text-[#3c5a57]">{formatDate(entry.date, true)}</div><div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[#899590]"><span>{entry.painType || 'No pain quality selected'}</span><span className="h-1 w-1 rounded-full bg-[#c4cbc5]" /><span>Average {average(entry)}/10</span></div></div>{isOpen ? <ChevronUp size={18} className="text-[#78918b]" /> : <ChevronDown size={18} className="text-[#9aa6a1]" />}</button>{isOpen && <div className="border-t border-[#eee9df] px-5 pb-6 pt-5 sm:px-7"><div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">{symptoms.map(s => <div key={s.key} className="flex items-center justify-between text-[12px] text-[#687b76]"><span>{s.label}</span><Score value={Number(entry[s.key])} color={s.color} /></div>)}</div><div className="mt-6 grid gap-5 border-t border-[#eee9df] pt-5 sm:grid-cols-2"><div><div className="mono text-[9px] uppercase tracking-[.16em] text-[#97a29d]">Around it</div><p className="mt-2 text-[13px] text-[#63746f]">{[...entry.triggers, entry.customTrigger].filter(Boolean).join(', ') || 'Nothing added'}</p></div><div><div className="mono text-[9px] uppercase tracking-[.16em] text-[#97a29d]">A few words</div><p className="mt-2 whitespace-pre-wrap text-[13px] leading-5 text-[#63746f]">{entry.notes || 'No note added'}</p></div></div><div className="mt-5 flex justify-end"><Button variant="danger" onClick={() => setDeleteId(entry.id)} testId={`button-delete-entry-${entry.id}`}><Trash2 size={15} />Delete entry</Button></div></div>}</article>; })}</div> : <EmptyHistory onReset={() => setEntries(samples())} />}
    {deleteId && <div className="fixed inset-0 z-50 grid place-items-center bg-[#284b4c]/25 p-5 backdrop-blur-sm"><div role="dialog" aria-modal="true" className="w-full max-w-[390px] rounded-[24px] bg-[#fffdf8] p-7 shadow-2xl"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f6e4df] text-[#a75449]"><Trash2 size={19} /></div><h2 className="serif mt-5 text-[26px] font-semibold text-[#345553]">Remove this day?</h2><p className="mt-2 text-[13px] leading-5 text-[#788681]">This entry will be removed from this browser. There’s no way to undo it.</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleteId(null)} testId="button-cancel-delete">Keep it</Button><Button variant="danger" onClick={() => { setEntries(prev => prev.filter(e => e.id !== deleteId)); setDeleteId(null); }} testId="button-confirm-delete">Remove entry</Button></div></div></div>}
  </div>;
}

function EmptyHistory({ onReset }: { onReset: () => void }) { return <div className="rounded-[26px] border border-dashed border-[#cbd9d2] bg-[#f0f5ef] px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#dcece5] text-[#4e8b82]"><ClipboardList size={25} /></div><h2 className="serif mt-5 text-[26px] font-semibold text-[#345553]">A blank page can be a kind one.</h2><p className="mx-auto mt-2 max-w-[380px] text-[13px] leading-5 text-[#7b8c86]">Once you save an entry, it will settle here in date order. You can start with just one small detail.</p><div className="mt-6 flex justify-center gap-2"><Button onClick={() => { window.location.href = '/'; }} testId="button-start-empty">Start an entry</Button><Button variant="ghost" onClick={onReset} testId="button-reset-sample-empty"><RotateCcw size={15} />Load sample days</Button></div></div>; }

function TrendChart({ entries, selected }: { entries: Entry[]; selected: typeof symptoms[number][] }) {
  const width = 760, height = 280, pad = { l: 38, r: 18, t: 18, b: 34 };
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const points = (key: keyof Entry) => sorted.map((e, i) => `${pad.l + (i / Math.max(sorted.length - 1, 1)) * (width - pad.l - pad.r)},${pad.t + (10 - scaleValue(e[key])) / 10 * (height - pad.t - pad.b)}`).join(' ');
  return <div className="overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[640px] w-full" role="img" aria-label="Symptom severity lines over time"><g>{[0, 2, 4, 6, 8, 10].map(v => { const y = pad.t + (10-v)/10*(height-pad.t-pad.b); return <g key={v}><line x1={pad.l} x2={width-pad.r} y1={y} y2={y} className="chart-grid" /><text x="3" y={y+4} fontSize="10" fill="#9aa6a1" className="mono">{v}</text></g>; })}</g><text x={pad.l} y={height-7} fontSize="10" fill="#9aa6a1">{sorted[0] ? formatDate(sorted[0].date) : ''}</text><text x={width-pad.r-45} y={height-7} fontSize="10" fill="#9aa6a1">{sorted.at(-1) ? formatDate(sorted.at(-1)!.date) : ''}</text>{selected.map(s => <g key={s.key}><polyline fill="none" stroke={s.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points(s.key)} />{sorted.map((e, i) => { const [x,y] = points(s.key).split(' ')[i].split(','); return <circle key={e.id} cx={x} cy={y} r="4" fill="#fffdf8" stroke={s.color} strokeWidth="2" />; })}</g>)}</svg></div>;
}

function Trends({ entries }: { entries: Entry[] }) {
  const [range, setRange] = useState(30);
  const [chosen, setChosen] = useState<string[]>(['overallPain', 'facialPain', 'headache']);
  const visible = entries.filter(e => (new Date().getTime() - new Date(`${e.date}T12:00:00`).getTime()) / 86400000 <= range);
  const selected = symptoms.filter(s => chosen.includes(s.key as string));
  const toggle = (key: string) => setChosen(prev => prev.includes(key) ? prev.filter(k => k !== key) : prev.length < 4 ? [...prev, key] : prev);
  return <div className="page-in"><PageIntro eyebrow="Make space for patterns" title="Trends" detail="A simple view of what you recorded over time. The shape is yours to notice; it does not explain why." action={<div className="flex items-center gap-2 rounded-full bg-[#e7f0ed] px-3 py-2 text-[11px] font-semibold text-[#4b8179]"><BarChart3 size={15} />{visible.length} days in view</div>} />
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e0dbd0] bg-[#fffdf8] p-3 pl-4 card-shadow"><div className="flex items-center gap-2 text-[12px] font-semibold text-[#60746f]"><SlidersHorizontal size={16} className="text-[#6d9f96]" />Date range</div><div className="flex rounded-xl bg-[#f1ede4] p-1">{[7, 30, 90].map(n => <button key={n} onClick={() => setRange(n)} data-testid={`button-range-${n}`} className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold ${range === n ? 'bg-[#fffdf8] text-[#286d68] shadow-sm' : 'text-[#82908b]'}`}>{n} days</button>)}</div></div>
    <section className="rounded-[26px] border border-[#e0dbd0] bg-[#fffdf8] p-5 card-shadow sm:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h2 className="serif text-[25px] font-semibold text-[#335453]">Severity over time</h2><p className="mt-1 text-[12px] text-[#85918d]">0 is none · 10 is strong</p></div><div className="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end">{selected.map(s => <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-[#697b76]"><i className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>)}</div></div>{visible.length > 1 && selected.length ? <div className="mt-5"><TrendChart entries={visible} selected={selected} /></div> : <div className="grid min-h-[250px] place-items-center text-center"><div><Activity size={25} className="mx-auto text-[#9bbdb4]" /><p className="mt-3 text-[14px] font-semibold text-[#58716c]">{selected.length ? 'Not enough days in this range yet.' : 'Choose a symptom below to begin.'}</p><p className="mt-1 text-[12px] text-[#8b9792]">A couple of saved days will give the chart its first shape.</p></div></div>}</section>
    <section className="mt-5 rounded-[26px] border border-[#e0dbd0] bg-[#fffdf8] p-5 sm:p-7"><div className="flex items-center justify-between"><div><h2 className="serif text-[24px] font-semibold text-[#335453]">What would you like to see?</h2><p className="mt-1 text-[12px] text-[#85918d]">Show up to four lines at once.</p></div><CircleHelp size={18} className="text-[#99a6a0]" /></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{symptoms.map(s => { const active = chosen.includes(s.key as string); return <button key={s.key} onClick={() => toggle(s.key as string)} data-testid={`button-series-${s.key}`} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-[12px] font-semibold transition ${active ? 'border-[#b9d2c9] bg-[#e8f2ee] text-[#3f756d]' : 'border-[#e7e1d7] text-[#85918d] hover:bg-[#f7f3eb]'}`}><span className="grid h-5 w-5 place-items-center rounded-full border" style={{ borderColor: s.color, background: active ? s.color : 'transparent' }}>{active && <Check size={12} color="#fff" />}</span>{s.label}</button>; })}</div></section>
    <p className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] text-[#8b9792]"><Info size={14} />Trends are only a reflection of what you recorded — they don’t diagnose or predict anything.</p>
  </div>;
}

function AppContent() {
  const { entries, setEntries, ready } = useEntries();
  if (!ready) return <div className="min-h-[100dvh] bg-[#faf8f2] p-8"><div className="mx-auto mt-20 max-w-[1180px] animate-pulse"><div className="h-4 w-24 rounded bg-[#e4e8df]" /><div className="mt-8 h-14 w-64 rounded bg-[#e4e8df]" /><div className="mt-8 h-52 rounded-[26px] bg-[#e4e8df]" /></div></div>;
  return <Shell><Switch><Route path="/" component={() => <Today entries={entries} setEntries={setEntries} />} /><Route path="/history" component={() => <HistoryPage entries={entries} setEntries={setEntries} />} /><Route path="/trends" component={() => <Trends entries={entries} />} /><Route path="/how-to-use" component={HowToUse} /><Route component={NotFound} /></Switch></Shell>;
}

const queryClient = new QueryClient();
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><AppContent /><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;