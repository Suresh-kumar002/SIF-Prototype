import { useState, useMemo, useEffect } from "react";

type Tab = "home" | "analyzer" | "overview" | "alerts" | "worker" | "desk" | "blueprint";
type PPEKey = "helmet" | "gloves" | "harness" | "shoes";
type VoiceMatch = {
  transcript: string;
  hazard: string;
  match: string;
  action: string;
  risk: number;
};

// ─── palette helpers ──────────────────────────────────────────────────────────
const C = {
  base:    "#EAF2F3",
  panel:   "#F8FBFB",
  panel2:  "#FCFEFE",
  border:  "#D8E4E7",
  border2: "#C5D5D9",
  orange:  "#D66B2A",
  red:     "#D6433B",
  blue:    "#178B9B",
  green:   "#229A6D",
  amber:   "#D79A12",
  text:    "#18343B",
  dim:     "#5B737B",
  muted:   "#789198",
  deep:    "#AFC2C6",
};

function riskColor(score: number) {
  if (score >= 80) return C.red;
  if (score >= 60) return C.orange;
  if (score >= 35) return C.amber;
  return C.green;
}
function riskLabel(score: number) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MODERATE";
  return "LOW";
}
function riskTier(score: number) {
  if (score >= 80) return "CRITICAL · EVACUATE";
  if (score >= 60) return "HIGH · URGENT";
  if (score >= 35) return "MODERATE · REVIEW";
  return "LOW · MONITOR";
}
function priorityColor(p: string) {
  if (p === "critical") return C.red;
  if (p === "high") return C.orange;
  return C.blue;
}

// ─── data ─────────────────────────────────────────────────────────────────────
const SITES = [
  { name: "Digboi Field",  district: "Tinsukia",   wells: 124, score: 87 },
  { name: "Naharkatiya",   district: "Dibrugarh",  wells: 89,  score: 72 },
  { name: "Moran Block",   district: "Sivasagar",  wells: 67,  score: 94 },
  { name: "Hugrijan",      district: "Golaghat",   wells: 43,  score: 41 },
  { name: "Rudrasagar",    district: "Cachar",     wells: 58,  score: 63 },
  { name: "Geleki",        district: "Sivasagar",  wells: 31,  score: 29 },
  { name: "Barekuri",      district: "Tinsukia",   wells: 52,  score: 78 },
  { name: "Jorajan",       district: "Dibrugarh",  wells: 37,  score: 55 },
  { name: "Tengakhat",     district: "Dibrugarh",  wells: 76,  score: 91 },
];

const ALERTS = [
  {
    id: 1, priority: "critical", site: "Moran Block",
    title: "Repeated height-work without harness — 3rd occurrence in 14 days",
    time: "08:42", date: "09 Sep 2026",
    pattern: "3 incidents involving work at >60 ft without fall-arrest gear. Crew rotation unchanged. Supervisor on same shift all 3 times.",
    tag: "PATTERN · HEIGHT",
  },
  {
    id: 2, priority: "critical", site: "Tengakhat",
    title: "Fatal-risk exposure cluster — drill-floor crew, 5 near-misses",
    time: "07:15", date: "09 Sep 2026",
    pattern: "5 near-miss events logged by same 8-person crew across 22 days. Statistical likelihood multiplier: 4.2×. SIF threshold breached.",
    tag: "CLUSTER · EXPOSURE",
  },
  {
    id: 3, priority: "high", site: "Digboi Field",
    title: "PPE non-compliance spike — wellhead maintenance crew OFC-7",
    time: "06:31", date: "09 Sep 2026",
    pattern: "Helmet and harness gaps in 6 of 9 maintenance reports this week. Contractor crew, no toolbox talk recorded last 4 days.",
    tag: "PPE · CONTRACTOR",
  },
  {
    id: 4, priority: "high", site: "Barekuri",
    title: "Confined-space entry without atmospheric test — 2 events",
    time: "17:44", date: "08 Sep 2026",
    pattern: "Atmospheric testing skipped before entry in separator vaults B and E. H₂S risk unquantified. Permit-to-work gaps identified.",
    tag: "PROCEDURE · GAS",
  },
  {
    id: 5, priority: "medium", site: "Naharkatiya",
    title: "Shift-overlap incident density above baseline (3.1×)",
    time: "14:09", date: "08 Sep 2026",
    pattern: "Incident rate during 06:00–07:30 handover window is 3.1× higher than rest-of-shift average over past 30 days.",
    tag: "TEMPORAL · SHIFT",
  },
  {
    id: 6, priority: "medium", site: "Rudrasagar",
    title: "Pressure-test anomaly trending toward MAOP — well pad C",
    time: "09:22", date: "07 Sep 2026",
    pattern: "Two pressure deviation events within tolerance but both trend toward MAOP boundary. Rate of change accelerating over 72 h.",
    tag: "EQUIPMENT · PRESSURE",
  },
];

const VOICE_SCENARIOS = [
  {
    transcript: "Platform hil raha hai aur casing line ke paas pressure badh raha hai. H2S smell bhi aa rahi hai.",
    hazard: "Pressure deviation + H₂S exposure",
    match: "2 pressure anomalies logged at WH-14 in the last 72 hours",
    action: "Move upwind, stop non-essential work, isolate the line and request gas testing.",
    risk: 94,
  },
  {
    transcript: "Harness ka lanyard jam ho gaya hai, main elevated platform par hoon aur neeche crew kaam kar raha hai.",
    hazard: "Fall-arrest equipment failure",
    match: "3 harness-related near misses for Crew OFC-7 this month",
    action: "Stop the climb, keep the exclusion zone clear and replace the lanyard before work resumes.",
    risk: 86,
  },
];

// ─── atoms ────────────────────────────────────────────────────────────────────

function Mono({ children, color, size = 11 }: { children: React.ReactNode; color?: string; size?: number }) {
  return (
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: size, color: color ?? C.dim }}>
      {children}
    </span>
  );
}

function Heading({ children, size = 11, color, gap }: { children: React.ReactNode; size?: number; color?: string; gap?: boolean }) {
  return (
    <div
      style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: color ?? C.text,
        marginBottom: gap ? 12 : undefined,
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, marginBottom: 5 }}>
      {children}
    </div>
  );
}

function SectionHead({ label, accent = C.blue }: { label: string; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div style={{ width: 14, height: 1, background: accent }} />
      <Mono size={9} color={accent}>{label}</Mono>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "0 0 14px" }} />;
}

// ─── Semicircular Gauge ───────────────────────────────────────────────────────

function Gauge({ score }: { score: number }) {
  const s = Math.max(0, Math.min(100, score));
  const W = 260, H = 155;
  const cx = W / 2, cy = 132;
  const R = 104, trackW = 16;

  // Map score 0→180° (left), 100→0° (right), in SVG coords (y grows down)
  // Arc goes from left (π) to right (0), counterclockwise in visual terms
  // We use standard SVG: angle 0 = right, π = left
  // score=0 → angle 180°, score=100 → angle 0°
  const scoreToAngle = (v: number) => Math.PI - (v / 100) * Math.PI; // radians

  function arcPoint(angle: number, r = R) {
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  }

  function arcPath(a1: number, a2: number, r = R): string {
    const p1 = arcPoint(a1, r);
    const p2 = arcPoint(a2, r);
    const sweep = a1 > a2 ? 1 : 0; // clockwise in screen coords
    return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 0 ${sweep} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  // color zones: score 0-35 green, 35-60 amber, 60-80 orange, 80-100 red
  const zones = [
    { from: 0,  to: 35, color: C.green },
    { from: 35, to: 60, color: C.amber },
    { from: 60, to: 80, color: C.orange },
    { from: 80, to: 100, color: C.red },
  ];

  const needleAngle = scoreToAngle(s);
  const needleTip = arcPoint(needleAngle, R - 22);
  const needleBase1 = arcPoint(needleAngle + Math.PI / 2, 6);
  const needleBase2 = arcPoint(needleAngle - Math.PI / 2, 6);

  const col = riskColor(s);
  const tier = riskTier(s);

  // tick marks at 0,25,50,75,100
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        {/* Subtle background glow */}
        <defs>
          <radialGradient id="glowGrad" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor={col} stopOpacity="0.08" />
            <stop offset="100%" stopColor={col} stopOpacity="0" />
          </radialGradient>
          <filter id="blur2">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        <ellipse cx={cx} cy={cy} rx={R + 30} ry={30} fill={`url(#glowGrad)`} />

        {/* Track */}
        <path
          d={arcPath(Math.PI, 0)}
          fill="none" stroke="#1A2535" strokeWidth={trackW} strokeLinecap="butt"
        />

        {/* Color zone arcs (dim) */}
        {zones.map((z, i) => (
          <path
            key={i}
            d={arcPath(scoreToAngle(z.from), scoreToAngle(z.to))}
            fill="none" stroke={z.color} strokeWidth={trackW} strokeLinecap="butt" opacity={0.18}
          />
        ))}

        {/* Active fill */}
        {s > 0 && (
          <path
            d={arcPath(Math.PI, needleAngle)}
            fill="none" stroke={col} strokeWidth={trackW} strokeLinecap="butt"
            style={{ filter: `drop-shadow(0 0 4px ${col}80)` }}
          />
        )}

        {/* Tick marks */}
        {ticks.map((v) => {
          const a = scoreToAngle(v);
          const inner = arcPoint(a, R - trackW / 2 - 4);
          const outer = arcPoint(a, R + trackW / 2 + 3);
          return (
            <g key={v}>
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={C.deep} strokeWidth={1.5} />
            </g>
          );
        })}

        {/* Tick labels */}
        {ticks.map((v) => {
          const a = scoreToAngle(v);
          const p = arcPoint(a, R + trackW / 2 + 14);
          return (
            <text key={v} x={p.x} y={p.y + 3} textAnchor="middle"
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, fill: C.muted }}>
              {v}
            </text>
          );
        })}

        {/* Needle */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill={col}
          style={{ filter: `drop-shadow(0 0 3px ${col})`, transition: "all 0.6s cubic-bezier(0.34,1.1,0.64,1)" }}
        />
        <circle cx={cx} cy={cy} r={7} fill="#0D131A" stroke={col} strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={3} fill={col} />

        {/* Score text */}
        <text x={cx} y={cy - 32} textAnchor="middle"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 42, fontWeight: 600, fill: col,
            transition: "fill 0.4s",
            filter: `drop-shadow(0 0 8px ${col}60)`,
          }}>
          {s}
        </text>
        <text x={cx} y={cy - 16} textAnchor="middle"
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fill: C.muted, letterSpacing: "0.1em" }}>
          SIF RISK SCORE
        </text>
      </svg>

      {/* Tier badge */}
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 13, fontWeight: 700, letterSpacing: "0.2em",
        color: col, border: `1px solid ${col}`, padding: "4px 18px",
        background: `${col}12`, marginTop: 6,
        transition: "all 0.4s",
        textShadow: `0 0 12px ${col}80`,
      }}>
        {tier}
      </div>
    </div>
  );
}

// ─── Breakdown bar ────────────────────────────────────────────────────────────

function Bar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const col = riskColor(v);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Mono size={9} color={C.muted}>
        <span style={{ display: "inline-block", width: 74, letterSpacing: "0.1em" }}>{label.toUpperCase()}</span>
      </Mono>
      <div style={{ flex: 1, height: 5, background: "#D9E5E7", position: "relative" }}>
        <div className="bar-fill" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${v}%`, background: col }} />
      </div>
      <Mono size={10} color={col}>
        <span style={{ display: "inline-block", width: 26, textAlign: "right" }}>{v}</span>
      </Mono>
    </div>
  );
}

// ─── PPE chip ─────────────────────────────────────────────────────────────────

function PPEChip({ label, active, onToggle }: { label: string; active: boolean; onToggle(): void }) {
  return (
    <button onClick={onToggle} style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
      padding: "5px 10px",
      border: `1px solid ${active ? C.orange : C.border2}`,
      background: active ? `${C.orange}18` : "transparent",
      color: active ? C.orange : C.muted,
      cursor: "pointer",
      transition: "all 0.15s",
    }}>
      {active ? "✕ " : "+ "}{label}
    </button>
  );
}

// ─── Select wrapper ───────────────────────────────────────────────────────────

function Select({ value, onChange, options }: {
  value: string;
  onChange(v: string): void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        width: "100%", padding: "7px 28px 7px 10px",
            background: "#F7FAFA", border: `1px solid ${C.border2}`,
        color: C.dim, fontSize: 12,
        fontFamily: "'Inter', sans-serif",
      }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 8, pointerEvents: "none" }}>▼</span>
    </div>
  );
}

// ─── Slider ───────────────────────────────────────────────────────────────────

function Slider({ label, value, min, max, unit, onChange }: {
  label: string; value: number; min: number; max: number; unit?: string; onChange(v: number): void;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <Label>{label}</Label>
        <Mono size={10} color={C.orange}>{value}{unit ?? ""}</Mono>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <Mono size={8}>{min}{unit ?? ""}</Mono>
        <Mono size={8}>{max}{unit ?? ""}</Mono>
      </div>
    </div>
  );
}

// ─── Screen 1: Incident Analyzer ─────────────────────────────────────────────

function IncidentAnalyzer() {
  const [report, setReport] = useState(
    "Worker fell from scaffold platform at wellhead WH-14 during casing change-out. Estimated height 35 ft. No harness worn. Four crew members present. Similar incident at WH-11 reported 3 weeks prior — same crew, same shift supervisor."
  );
  const [injuryType, setInjuryType] = useState("serious");
  const [environment, setEnvironment] = useState("offshore_platform");
  const [height, setHeight] = useState(35);
  const [ppe, setPpe] = useState<Record<PPEKey, boolean>>({ helmet: false, gloves: false, harness: true, shoes: false });
  const [simIncidents, setSimIncidents] = useState(2);
  const [exposed, setExposed] = useState(4);

  const score = useMemo(() => {
    const injScore: Record<string, number> = { fatal: 34, serious: 24, moderate: 11, minor: 4, near_miss: 7 };
    let s = injScore[injuryType] ?? 10;
    s += Math.round((height / 120) * 18);
    s += Object.values(ppe).filter(Boolean).length * 4;
    s += Math.round((simIncidents / 10) * 14);
    s += Math.round((exposed / 600) * 7);
    const envBonus: Record<string, number> = { offshore_platform: 3, onshore_drilling: 2, pipeline: 1, refinery: 1, storage: 0 };
    s += envBonus[environment] ?? 0;
    return Math.min(99, s);
  }, [injuryType, environment, height, ppe, simIncidents, exposed]);

  const injBar = useMemo(() => {
    const m: Record<string, number> = { fatal: 100, serious: 71, moderate: 32, minor: 12, near_miss: 21 };
    return m[injuryType] ?? 0;
  }, [injuryType]);
  const htBar = Math.round((height / 120) * 100);
  const ppeBar = Math.round((Object.values(ppe).filter(Boolean).length / 4) * 100);
  const patBar = Math.round((simIncidents / 10) * 100);
  const expBar = Math.round((exposed / 600) * 100);
  const envBar = { offshore_platform: 80, onshore_drilling: 64, pipeline: 46, refinery: 42, storage: 28 }[environment] ?? 50;

  const deadline = score >= 80 ? "WITHIN 2 HOURS" : score >= 60 ? "WITHIN 8 HOURS" : "WITHIN 24 HOURS";
  const action = score >= 80
    ? "IMMEDIATE STOP-WORK — evacuate all personnel from affected zone. Incident Commander notification mandatory. Regulatory body notification within 1 hour. Cordon site."
    : score >= 60
    ? "Suspend non-essential operations at affected location. Safety officer site visit required. Conduct emergency JSA for at-risk crew. Review permit-to-work."
    : "Issue formal safety advisory to crew supervisors. Schedule toolbox talk within 24 hours. Review PPE compliance register. Log for pattern tracking.";

  const accentDeadline = score >= 80 ? C.red : score >= 60 ? C.orange : C.amber;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ─ Left panel: inputs ─ */}
      <div style={{
        width: 320, flexShrink: 0, overflowY: "auto",
        background: C.panel, borderRight: `1px solid ${C.border}`,
        padding: 16, display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div className="workflow-note">
          <div className="workflow-note__eyebrow">WORKFLOW 01 / 03</div>
          <div className="workflow-note__title">Capture the event</div>
          <div className="workflow-note__copy">Turn a field report into a traceable intervention before the next shift begins.</div>
        </div>
        <SectionHead label="Incident Report Input" />

        <div>
          <Label>Incident description</Label>
          <textarea
            rows={6} value={report}
            onChange={(e) => setReport(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <Divider />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <Label>Injury type</Label>
            <Select value={injuryType} onChange={setInjuryType} options={[
              { value: "fatal",     label: "Fatal" },
              { value: "serious",   label: "Serious Injury" },
              { value: "moderate",  label: "Moderate" },
              { value: "minor",     label: "Minor" },
              { value: "near_miss", label: "Near-Miss" },
            ]} />
          </div>
          <div>
            <Label>Environment</Label>
            <Select value={environment} onChange={setEnvironment} options={[
              { value: "offshore_platform", label: "Offshore Platform" },
              { value: "onshore_drilling",  label: "Onshore Drilling" },
              { value: "pipeline",          label: "Pipeline" },
              { value: "refinery",          label: "Refinery" },
              { value: "storage",           label: "Storage Terminal" },
            ]} />
          </div>
        </div>

        <Slider label="Working height" value={height} min={0} max={120} unit=" ft" onChange={setHeight} />

        <div>
          <Label>Missing PPE — select all that apply</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(["helmet", "gloves", "harness", "shoes"] as PPEKey[]).map((k) => (
              <PPEChip key={k} label={k} active={ppe[k]} onToggle={() => setPpe((p) => ({ ...p, [k]: !p[k] }))} />
            ))}
          </div>
        </div>

        <Slider label="Similar incidents — past 6 months" value={simIncidents} min={0} max={10} onChange={setSimIncidents} />
        <Slider label="Workers exposed" value={exposed} min={1} max={600} onChange={setExposed} />
      </div>

      {/* ─ Right panel: gauge + breakdown + alert ─ */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

        <div className="site-banner">
          <div className="site-banner__image" aria-hidden="true" />
          <div className="site-banner__copy">
            <Mono size={9} color={C.orange}>FIELD CONTEXT · WH-14</Mono>
            <div className="site-banner__title">Casing change-out / scaffold access</div>
            <Mono size={9} color="#B6C1C8">Digboi Field · Shift B · 4 personnel exposed</Mono>
          </div>
          <div className="site-banner__stamp">
            <span className="site-banner__dot" /> LIVE FEED
          </div>
        </div>

        {/* Gauge card */}
        <div style={{ background: C.panel2, border: `1px solid ${C.border2}`, padding: "20px 16px 16px" }}>
          <SectionHead label="SIF Risk Assessment" accent={C.orange} />
          <Gauge score={score} />
        </div>

        {/* Breakdown */}
        <div style={{ background: C.panel2, border: `1px solid ${C.border2}`, padding: 16 }}>
          <SectionHead label="Factor Breakdown" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Bar label="Injury"      value={injBar} />
            <Bar label="Height"      value={htBar} />
            <Bar label="PPE Gap"     value={ppeBar} />
            <Bar label="Pattern"     value={patBar} />
            <Bar label="Exposure"    value={expBar} />
            <Bar label="Environment" value={envBar} />
          </div>
        </div>

        {/* Alert card */}
        <div style={{
          background: C.panel2,
          border: `1px solid ${C.border2}`,
          borderLeft: `4px solid ${accentDeadline}`,
          padding: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <SectionHead label="Recommended Action" accent={accentDeadline} />
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.14em",
              color: accentDeadline, border: `1px solid ${accentDeadline}50`,
              background: `${accentDeadline}14`, padding: "3px 10px",
            }}>
              {deadline}
            </div>
          </div>
          <p style={{ color: "#3F5D65", fontSize: 12, lineHeight: 1.7 }}>{action}</p>
        </div>
      </div>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPI({ label, value, unit, trend, dir, accent }: {
  label: string; value: string; unit?: string;
  trend: string; dir: "up" | "down" | "flat"; accent: string;
}) {
  const trendColor = dir === "up" ? C.red : dir === "down" ? C.green : C.blue;
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  return (
    <div style={{
      background: C.panel2, border: `1px solid ${C.border2}`,
      borderTop: `2px solid ${accent}`, padding: 14,
      display: "flex", flexDirection: "column", gap: 8, minHeight: 105,
    }}>
      <Mono size={9} color={C.muted}>{label.toUpperCase()}</Mono>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 34, fontWeight: 600, color: accent, lineHeight: 1 }}>
          {value}
        </span>
        {unit && <Mono size={11} color={C.dim}>{unit}</Mono>}
      </div>
      <Mono size={9} color={trendColor}>{arrow} {trend}</Mono>
    </div>
  );
}

function FieldEvidence() {
  const evidence = [
    { image: "/images/image-1788956790380.png", label: "FIELD CREW", title: "Shift B · WH-14", meta: "4 personnel visible" },
    { image: "/images/image-1788956874062.png", label: "PPE REFERENCE", title: "Required kit · height work", meta: "6 equipment classes" },
    { image: "/images/image-1788956562609.png", label: "ASSET HISTORY", title: "Digboi · historical field", meta: "Source context image" },
  ];
  return (
    <div className="evidence-strip">
      <SectionHead label="Field evidence library" accent={C.blue} />
      <div className="evidence-strip__grid">
        {evidence.map((item) => (
          <div className="evidence-card" key={item.title}>
            <img src={item.image} alt={item.title} />
            <div className="evidence-card__copy"><Mono size={8} color={C.blue}>{item.label}</Mono><strong>{item.title}</strong><span>{item.meta}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SafetyProgram() {
  return (
    <div className="safety-program">
      <div className="safety-program__head">
        <div><SectionHead label="Safety programme · Assam benchmark" accent={C.green} /><div className="safety-program__title">From briefing to field action</div></div>
        <Mono size={9} color={C.green}>800 WORKERS · 10 GROUPS</Mono>
      </div>
      <div className="program-grid">
        <div className="program-card program-card--briefing"><Mono size={8} color={C.orange}>07:00 · DAILY / 15 MIN</Mono><strong>Toolbox Talk</strong><span>Square formation · task hazards · PPE · buddy system · hydration breaks</span><div className="program-progress"><i style={{ width: "92%" }} /></div><Mono size={8} color={C.green}>92% ATTENDANCE TODAY</Mono></div>
        <div className="program-card"><Mono size={8} color={C.blue}>ZONE STATUS</Mono><strong>Visual risk language</strong><div className="zone-list"><span><i className="zone-dot zone-dot--red" />Red · restricted</span><span><i className="zone-dot zone-dot--yellow" />Yellow · caution</span><span><i className="zone-dot zone-dot--green" />Green · normal rules</span></div></div>
        <div className="program-card"><Mono size={8} color={C.blue}>TRAINING RECORD</Mono><strong>Competency cycle</strong><span>5-day induction · 6-month refresher · role-specific checks</span><div className="program-stat"><b>85%</b><small>current certifications</small></div></div>
      </div>
      <div className="programme-footer"><span>LANGUAGES: <b>HINDI</b> <b>ASSAMESE</b> <b>ENGLISH</b></span><span>CHANNELS: <b>VOICE</b> <b>RADIO</b> <b>SMS / WHATSAPP</b> <b>QR GUIDES</b></span><span className="programme-result">INCIDENTS <b>15 → 3</b> IN 6 MONTHS</span></div>
    </div>
  );
}

// ─── Screen 2: Network Overview ───────────────────────────────────────────────

function NetworkOverview() {
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <SectionHead label="Network KPIs — Live Feed" accent={C.orange} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <KPI label="Reports Scanned Today" value="247" trend="+18 vs yesterday" dir="up" accent={C.blue} />
          <KPI label="Active High-Risk Alerts" value="11"  trend="+3 since midnight" dir="up" accent={C.red} />
          <KPI label="Avg Detection Time"     value="4.2" unit="min" trend="−1.1 min vs last week" dir="down" accent={C.green} />
          <KPI label="Model Accuracy"         value="94.7" unit="%" trend="Stable ±0.3%" dir="flat" accent={C.orange} />
        </div>
      </div>

      <FieldEvidence />
      <SafetyProgram />

      {/* Heatmap */}
      <div>
        <SectionHead label="Oilfield Site Risk Heatmap — NE India" accent={C.orange} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {SITES.map((site) => {
            const col = riskColor(site.score);
            const lbl = riskLabel(site.score);
            return (
              <div
                key={site.name}
                className="heatmap-cell"
                style={{
                  background: `${col}12`, border: `1px solid ${col}38`,
                  borderLeft: `3px solid ${col}`, padding: "10px 12px", cursor: "default",
                }}
              >
                <Heading size={13}>{site.name}</Heading>
                <Mono size={9} color={C.muted}>{site.district} · {site.wells} wells</Mono>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 10 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 600, color: col }}>
                    {site.score}
                  </span>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.12em",
                    color: col, border: `1px solid ${col}50`, background: `${col}18`, padding: "2px 6px",
                  }}>
                    {lbl}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
          <Mono size={9} color={C.muted}>LEGEND:</Mono>
          {[["Low", C.green], ["Moderate", C.amber], ["High", C.orange], ["Critical", C.red]].map(([l, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, background: c as string }} />
              <Mono size={9} color={c as string}>{l as string}</Mono>
            </div>
          ))}
        </div>
      </div>

      {/* Recent detections table */}
      <div>
        <SectionHead label="Recent Detections" />
        <div style={{ border: `1px solid ${C.border2}`, background: C.panel2 }}>
          {[
            { t: "09:12", site: "Tengakhat",   lvl: "critical", msg: "Exposure cluster exceeded — 5 events / 22 days" },
            { t: "08:42", site: "Moran Block",  lvl: "critical", msg: "Height-work pattern — 3rd incident, no harness" },
            { t: "07:31", site: "Digboi Field", lvl: "high",     msg: "PPE non-compliance >66% — contractor crew OFC-7" },
            { t: "06:55", site: "Barekuri",     lvl: "high",     msg: "Confined-space entry without atmospheric test" },
          ].map((row, i) => (
            <div
              key={i}
              className="alert-row"
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 14px",
                borderBottom: i < 3 ? `1px solid ${C.border}` : undefined,
              }}
            >
              <Mono size={10}>{row.t}</Mono>
              <div style={{ width: 6, height: 6, background: priorityColor(row.lvl), flexShrink: 0 }} />
              <Mono size={10} color={C.blue}><span style={{ display: "inline-block", width: 88 }}>{row.site}</span></Mono>
              <span style={{ color: C.dim, fontSize: 11, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{row.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Screen 3: Pattern Alerts Feed ───────────────────────────────────────────

function AlertsFeed() {
  const [filter, setFilter] = useState<"all" | "critical" | "high" | "medium">("all");
  const visible = ALERTS.filter((a) => filter === "all" || a.priority === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* filter bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
        borderBottom: `1px solid ${C.border}`, background: C.panel, flexShrink: 0,
      }}>
        <Mono size={9} color={C.muted}>FILTER:</Mono>
        {(["all", "critical", "high", "medium"] as const).map((f) => {
          const on = filter === f;
          const fc = f === "critical" ? C.red : f === "high" ? C.orange : f === "medium" ? C.blue : C.dim;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
                padding: "4px 12px", cursor: "pointer",
                border: `1px solid ${on ? fc : C.border2}`,
                background: on ? `${fc}18` : "transparent",
                color: on ? fc : C.muted,
                transition: "all 0.15s",
              }}
            >
              {f}
            </button>
          );
        })}
        <Mono size={9} color={C.muted} ><span style={{ marginLeft: "auto" }}>{visible.length} alert{visible.length !== 1 ? "s" : ""}</span></Mono>
      </div>

      {/* list */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.map((alert) => {
          const col = priorityColor(alert.priority);
          return (
            <div
              key={alert.id}
              className="alert-row"
              style={{
                background: C.panel2, border: `1px solid ${C.border2}`,
                borderLeft: `4px solid ${col}`, padding: 14,
              }}
            >
              {/* row 1 */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                <div>
                  <Mono size={9} color={col}>{alert.site}</Mono>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                    color: C.text, marginTop: 2, lineHeight: 1.2,
                  }}>
                    {alert.title}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.14em", padding: "2px 8px",
                    color: col, border: `1px solid ${col}50`, background: `${col}18`,
                  }}>
                    {alert.priority.toUpperCase()}
                  </div>
                  <Mono size={9}>{alert.time} · {alert.date}</Mono>
                </div>
              </div>

              {/* pattern description */}
              <p style={{ color: C.dim, fontSize: 11, lineHeight: 1.65, marginBottom: 10 }}>{alert.pattern}</p>

              {/* footer */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.14em",
                  color: C.blue, border: `1px solid ${C.blue}30`, background: `${C.blue}10`, padding: "2px 8px",
                }}>
                  {alert.tag}
                </div>
                <button style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.1em",
                  color: col, border: `1px solid ${col}40`, background: `${col}0C`,
                  padding: "3px 12px", cursor: "pointer", transition: "all 0.15s",
                }}>
                  INVESTIGATE →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Live clock ───────────────────────────────────────────────────────────────

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ textAlign: "right" }}>
      <Mono size={13} color={C.blue}>{now.toTimeString().slice(0, 8)}</Mono>
      <div style={{ height: 2 }} />
      <Mono size={9}>{now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</Mono>
    </div>
  );
}

function VoiceSignalPanel({ onAlert }: { onAlert(match: VoiceMatch): void }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [match, setMatch] = useState<VoiceMatch | null>(null);
  const [scenario, setScenario] = useState(0);

  const analyzeVoice = (spoken: string) => {
    const source = VOICE_SCENARIOS[scenario % VOICE_SCENARIOS.length];
    const result = { ...source, transcript: spoken || source.transcript };
    setTranscript(result.transcript);
    setMatch(result);
    const savedSignals = JSON.parse(localStorage.getItem("sif-voice-signals") ?? "[]");
    localStorage.setItem("sif-voice-signals", JSON.stringify([{ ...result, id: `voice-${Date.now()}`, recordedAt: new Date().toISOString() }, ...savedSignals].slice(0, 50)));
    onAlert(result);
  };

  const startVoiceCapture = () => {
    setRecording(true);
    const SpeechRecognition = (window as Window & { SpeechRecognition?: new () => { lang: string; interimResults: boolean; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void; start: () => void } }).SpeechRecognition;
    if (!SpeechRecognition) {
      window.setTimeout(() => { setRecording(false); analyzeVoice(VOICE_SCENARIOS[scenario % VOICE_SCENARIOS.length].transcript); }, 850);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.onresult = (event) => analyzeVoice(event.results[0][0].transcript);
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => { setRecording(false); analyzeVoice(VOICE_SCENARIOS[scenario % VOICE_SCENARIOS.length].transcript); };
    recognition.start();
  };

  return (
    <div className="voice-panel">
      <div className="voice-panel__head">
        <div>
          <SectionHead label="Field Voice Signal" accent={C.orange} />
          <div className="voice-panel__title">Worker reports something unusual</div>
          <div className="voice-panel__copy">A voice note is checked against incident history before the crew continues work.</div>
        </div>
        <button className={`voice-record ${recording ? "is-recording" : ""}`} onClick={startVoiceCapture}>
          <span className="voice-record__dot" /> {recording ? "LISTENING" : "HOLD TO REPORT"}
        </button>
      </div>
      {transcript ? (
        <div className="voice-transcript"><Mono size={9} color={C.muted}>TRANSCRIPT · 00:01</Mono><div>“{transcript}”</div></div>
      ) : <div className="voice-empty">Say “AURA” and describe what feels unsafe. The field record will be matched before work continues.</div>}
      {match && (
        <div className="voice-match">
          <div className="voice-match__score"><strong>{match.risk}</strong><Mono size={8} color={C.red}>RISK</Mono></div>
          <div className="voice-match__body"><Mono size={9} color={C.red}>MATCH FOUND · {match.hazard}</Mono><div className="voice-match__record">{match.match}</div><div className="voice-match__action">WORKER ACTION: {match.action}</div></div>
        </div>
      )}
      <button className="voice-next" onClick={() => { setScenario((value) => value + 1); setTranscript(""); setMatch(null); }}>LOAD NEXT FIELD SIGNAL</button>
    </div>
  );
}

function WorkerDevice({ onAlert }: { onAlert(match: VoiceMatch): void }) {
  return (
    <div className="worker-view">
      <div className="worker-view__intro"><Mono size={9} color={C.orange}>FIELD DEVICE · WRIST UNIT A-014</Mono><div className="worker-view__title">AURA is listening for the crew.</div><div className="worker-view__copy">A hands-free safety companion for workers on the mount. Say the wake word, report what feels wrong, and keep both hands on the job.</div></div>
      <div className="wearable-stage"><div className="watch-device"><div className="watch-device__crown" /><div className="watch-device__screen"><div className="watch-device__status"><span /> AURA READY</div><div className="watch-device__time">10:42</div><div className="watch-device__hint">Say “AURA” to report</div><div className="watch-device__mic">◉</div></div><div className="watch-device__strap" /></div><div className="wearable-notes"><div className="wearable-note"><span>01</span><div><strong>Wake word</strong><p>“AURA, something is wrong.”</p></div></div><div className="wearable-note"><span>02</span><div><strong>Hands-free report</strong><p>Hindi, English or site shorthand.</p></div></div><div className="wearable-note"><span>03</span><div><strong>Private response</strong><p>Voice guidance returns through the unit.</p></div></div></div></div>
      <VoiceSignalPanel onAlert={onAlert} />
    </div>
  );
}

function OperationsDesk({ voiceAlert }: { voiceAlert: VoiceMatch | null }) {
  const queue = [{ site: "Tengakhat", msg: "Rotating equipment proximity", owner: "Arun Mehta", risk: 91, age: "00:42" }, { site: "Digboi Field", msg: "Voice signal · H₂S + pressure", owner: "Priya Sen", risk: 94, age: "01:16" }, { site: "Moran Block", msg: "Harness failure reported", owner: "Field crew", risk: 86, age: "04:08" }];
  return (
    <div className="desk-view"><div className="desk-heading"><div><Mono size={9} color={C.orange}>OPERATIONS DESK · EASTERN ASSET GROUP</Mono><div className="desk-heading__title">Safety intelligence room</div></div><div className="desk-login"><span /> SIGNED IN · SURESH / SAFETY OFFICER</div></div>
      <div className="role-strip"><div className="role-strip__label">ESCALATION OWNERS</div><div className="role active"><b>SU</b><span>Suresh<small>Safety officer</small></span></div><div className="role"><b>DI</b><span>Divya<small>Site supervisor</small></span></div><div className="role"><b>DA</b><span>Darshna<small>Field relay</small></span></div><div className="role"><b>SA</b><span>Saniya<small>Worker relay</small></span></div></div>
      <div className="desk-grid"><div className="desk-queue"><SectionHead label="Live intervention queue" accent={C.red} />{queue.map((item) => <div className="desk-alert" key={item.site}><div className="desk-alert__risk">{item.risk}<small>RISK</small></div><div className="desk-alert__body"><Mono size={9} color={C.red}>{item.site} · {item.age} AGO</Mono><strong>{item.msg}</strong><span>Owner: {item.owner}</span></div><button>OPEN</button></div>)}</div><div className="desk-records"><SectionHead label="Record match" /><div className="record-card"><Mono size={9} color={C.blue}>MATCHED FROM 30-DAY HISTORY</Mono><div className="record-card__title">WH-14 · pressure boundary</div><div className="record-card__row"><span>Prior signals</span><b>2 anomalies</b></div><div className="record-card__row"><span>Last inspection</span><b>06 Sep · 16:20</b></div><div className="record-card__row"><span>Open action</span><b className="warn">Gas test pending</b></div><div className="record-card__quote">“Same crew, same shift. Treat as a developing event.”</div></div><button className="dispatch-button">DISPATCH SITE CHECK <span>→</span></button></div></div>
      {voiceAlert && <div className="desk-foot-alert"><span className="live-monitor__pulse" /><div><Mono size={9} color={C.red}>RELAY CONFIRMED</Mono><div>Worker voice signal routed to Safety Officer and Site Supervisor.</div></div><strong>2 recipients acknowledged</strong></div>}
    </div>
  );
}

// ─── Screen 0: Executive Report ─────────────────────────────────────────────

function ExecutiveReport({ onOpenAnalyzer }: { onOpenAnalyzer(): void }) {
  const [height, setHeight] = useState(30);
  const [ppe, setPpe] = useState(45);
  const [patterns, setPatterns] = useState(3);
  const [openLayer, setOpenLayer] = useState(1);
  const [caseOpen, setCaseOpen] = useState<number | null>(null);
  const [compareOn, setCompareOn] = useState(false);
  const [auraStage, setAuraStage] = useState(0);
  const [challengeOpen, setChallengeOpen] = useState<number | null>(null);
  const [role, setRole] = useState("Admin");
  const [mockup, setMockup] = useState("login");
  const score = Math.min(100, Math.round(height * 0.42 + ppe * 0.34 + patterns * 2.8));
  const scoreCol = riskColor(score);
  const layers = [
    ["01", "Data ingestion", "Mobile, web, SMS, call-centre and paper reports enter one validated safety stream."],
    ["02", "NLP processing", "Hindi, Assamese and English narratives become structured hazards, people, assets and locations."],
    ["03", "Risk assessment", "75+ factors and historical matches produce an explainable SIF score, not just a label."],
    ["04", "Intelligent alerting", "The right owner receives a prioritised alert with a deadline and recommended action."],
    ["05", "Continuous learning", "Confirmed outcomes feed the next model cycle and strengthen institutional memory."],
  ];
  const auraStages = [
    ["REPORT", "Worker says: Platform hil raha hai aur casing line ke paas pressure badh raha hai. H2S smell bhi aa rahi hai."],
    ["ANALYSE", "Hinglish voice ko hazard, site, urgency aur location ke structured signals mein convert kiya gaya."],
    ["MATCH", "WH-14 par pichle 72 ghante mein 2 pressure anomalies aur 1 open gas-testing action mila."],
    ["RISK", "Pressure deviation + H2S history ne explainable risk score 94/100 diya."],
    ["ACT + LEARN", "Worker ko upwind move instruction, supervisor ko dispatch aur safety records ko learning signal mila."],
  ];
  const challenges = [
    ["Noisy site environment", "Noise-cancelling mic + industrial-noise-trained ASR"],
    ["Remote site, no network", "Offline-first edge detection; connectivity aate hi auto-sync"],
    ["Alert fatigue", "Confidence thresholds + Safety Officer feedback loop"],
    ["Worker trust and privacy", "Wake-word recording, clear consent and non-disciplinary policy"],
    ["Hazardous-zone hardware", "ATEX / IECEx intrinsically-safe wearable design"],
    ["Adoption resistance", "Pilot champions, training and visible success stories"],
  ];
  const rbac = role === "Admin" ? ["All sites and records", "User and role management", "Risk thresholds and alerts", "Corrective action approval"] : role === "Supervisor" ? ["Own site data", "Submit and edit reports", "Assign corrective actions", "View risk alerts"] : ["Own reports", "Voice/text submission", "View site alerts", "No delete or user management"];

  return (
    <div className="report-view">
      <nav className="report-nav">{[["report-problem", "01"], ["report-compare", "02"], ["report-calculator", "03"], ["report-architecture", "04"], ["report-aura", "05"], ["report-risks", "06"], ["report-business", "07"]].map(([id, label]) => <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}>{label}</button>)}</nav>
      <section className="report-hero">
        <div className="report-hero__copy">
          <Mono size={9} color={C.orange}>OIL INDIA LIMITED · SAFETY INTELLIGENCE REPORT</Mono>
          <div className="report-hero__title">Har report ke peeche ek risk chhupa hota hai. <span>Ab AI usse pehle dhoondh legi.</span></div>
          <p>AI/NLP-powered engine jo monthly safety reports ko real-time analyse karke Serious Injury & Fatality ke precursors ko incident se pehle pakadta hai.</p>
          <button className="report-hero__cta" onClick={onOpenAnalyzer}>TRY THE LIVE RISK ANALYZER <span>→</span></button>
        </div>
        <div className="report-hero__stats">
          <div><strong>70–80%</strong><span>expected serious incident reduction</span></div>
          <div><strong>&lt;30 min</strong><span>alert response time</span></div>
          <div><strong>₹8–13 Cr</strong><span>projected annual net savings</span></div>
        </div>
      </section>

      <section className="report-section report-shift">
        <div><SectionHead label="01 · Paradigm shift" accent={C.orange} /><h2>Reactive se predictive safety tak</h2><p>Manual review isolated incidents ko dekhta hai. SIF Intelligence patterns, exposure aur context ko ek saath read karta hai.</p></div>
        <div className="shift-grid"><div><Mono size={9} color={C.red}>PURANA · REACTIVE</Mono><b>Incident ke baad analysis</b><span>2–14 din ka lag, inconsistent scoring, 9-to-5 blind spot.</span></div><div><Mono size={9} color={C.green}>NAYA · PREDICTIVE</Mono><b>Incident se pehle intervention</b><span>Real-time processing, cross-report patterns, 24/7 escalation.</span></div></div>
      </section>

      <section className="report-section" id="report-problem">
        <SectionHead label="01 · Problem" accent={C.red} /><h2>Needle in the haystack</h2><p>40,000 employees, 100+ sites aur hazaaron reports. Isolated near-miss ko manually dekhne par dangerous pattern invisible reh sakta hai.</p>
        <div className="report-problem-grid">{[["CASE 01", "Worker slipped on stairs, caught himself.", "40-ft stairs, broken guardrail aur 6 mahine mein 3 similar incidents."], ["CASE 02", "Harness properly secured nahi tha.", "50-ft height par same month mein 8 missing-harness reports: systematic pattern."]].map((item, index) => <button key={item[0]} className={`report-case ${caseOpen === index ? "is-open" : ""}`} onClick={() => setCaseOpen(caseOpen === index ? null : index)}><Mono size={9} color={caseOpen === index ? C.red : C.muted}>{caseOpen === index ? "JO MISS HUA" : item[0]}</Mono><strong>{caseOpen === index ? item[2] : item[1]}</strong><span>{caseOpen === index ? "CRITICAL PATTERN · COULD HAVE BEEN FATAL" : "Tap to reveal the hidden risk →"}</span></button>)}</div>
      </section>

      <section className="report-section" id="report-compare">
        <SectionHead label="02 · Paradigm shift" accent={C.orange} /><h2>Purana system reactive tha. Naya system predictive hai.</h2>
        <button className={`report-toggle ${compareOn ? "is-on" : ""}`} onClick={() => setCompareOn(!compareOn)}><span>PURANA</span><i /><span>NAYA AI</span></button>
        <div className="report-compare-grid"><div className={compareOn ? "is-dim" : ""}><Mono size={9} color={C.red}>REACTIVE</Mono><strong>Manual, delayed, isolated</strong><span>2–14 din ka lag. Analyst-to-analyst scoring alag. Night/weekend blind spot.</span></div><div className={!compareOn ? "is-dim" : ""}><Mono size={9} color={C.green}>PREDICTIVE</Mono><strong>Automated, real-time, connected</strong><span>Seconds mein processing. Cross-report patterns. 24/7 escalation aur institutional memory.</span></div></div>
      </section>

      <section className="report-section" id="report-calculator">
        <div className="report-section__head"><div><SectionHead label="02 · Live demo" accent={C.orange} /><h2>SIF risk score ko khud test karo</h2><p>Three signals move karo. Simplified engine batata hai ki exposure kab critical threshold cross karta hai.</p></div><div className="report-score" style={{ color: scoreCol }}><strong>{score}</strong><span>{score < 35 ? "LOW" : score < 65 ? "REVIEW" : "CRITICAL"}</span></div></div>
        <div className="report-sliders">
          <Slider label="Height involved" value={height} min={0} max={100} unit=" ft" onChange={setHeight} />
          <Slider label="PPE non-compliance" value={ppe} min={0} max={100} unit="%" onChange={setPpe} />
          <Slider label="Similar incidents · last 6 months" value={patterns} min={0} max={10} onChange={setPatterns} />
        </div>
        <div className="report-scorebar"><i style={{ width: `${score}%`, background: scoreCol }} /></div>
        <div className="report-action" style={{ borderLeftColor: scoreCol }}><Mono size={9} color={scoreCol}>RECOMMENDED NEXT STEP</Mono><span>{score >= 65 ? "Immediate escalation to Site Manager + Safety Officer. Area secure karo." : "Supervisor review within 24 hours. Pattern monitor karo."}</span></div>
      </section>

      <section className="report-section" id="report-architecture">
        <SectionHead label="03 · Architecture" accent={C.blue} /><h2>Engine 5 layers mein kaam karta hai</h2>
        <div className="report-layers">{layers.map((layer, index) => <button key={layer[0]} className={`report-layer ${openLayer === index ? "is-open" : ""}`} onClick={() => setOpenLayer(index)}><span className="report-layer__num">{layer[0]}</span><span className="report-layer__title">{layer[1]}</span><span className="report-layer__chev">{openLayer === index ? "−" : "+"}</span>{openLayer === index && <span className="report-layer__body">{layer[2]}</span>}</button>)}</div>
      </section>

      <section className="report-section">
        <SectionHead label="04 · Data flow" accent={C.blue} /><h2>Incident se alert tak, 45 minutes ke andar</h2>
        <div className="report-pipeline">{[["01", "Report", "Worker voice / text"], ["02", "Parse", "Hindi · Assamese · English"], ["03", "Match", "History + context"], ["04", "Score", "75+ risk factors"], ["05", "Alert", "Right owner notified"]].map((step, index) => <div className="report-pipeline__step" key={step[0]}><span>{step[0]}</span><strong>{step[1]}</strong><small>{step[2]}</small>{index < 4 && <i>→</i>}</div>)}</div>
      </section>

      <section className="report-section report-aura" id="report-aura">
        <div><SectionHead label="05 · Worker feature" accent={C.orange} /><h2>AURA: worker ki aawaaz hi pehli warning hai</h2><p>Worker ko app kholne ya type karne ki zaroorat nahi. Wake word ke baad Hindi, Assamese ya English mein report kare, aur system us signal ko action mein convert kare.</p><button className="report-secondary" onClick={() => onOpenAnalyzer()}>OPEN INCIDENT ANALYZER <span>→</span></button></div>
        <div className="report-aura__card"><div className="report-aura__mic">◉</div><Mono size={9} color={C.orange}>AURA READY · WH-14</Mono><strong>{auraStages[auraStage][1]}</strong><div className="report-aura__result"><b>{auraStage >= 3 ? "94" : "—"}</b><span>{auraStages[auraStage][0]}<br />REPORT → ANALYSE → WARN → ACT → LEARN</span></div><div className="report-aura__steps">{auraStages.map((stage, index) => <button key={stage[0]} className={auraStage === index ? "is-active" : ""} onClick={() => setAuraStage(index)}>{index + 1}</button>)}</div></div>
      </section>

      <section className="report-section" id="report-risks">
        <SectionHead label="06 · Rollout risks" accent={C.red} /><h2>Field mein kya atak sakta hai?</h2>
        <div className="report-challenges">{challenges.map((item, index) => <button key={item[0]} className={challengeOpen === index ? "is-open" : ""} onClick={() => setChallengeOpen(challengeOpen === index ? null : index)}><Mono size={9} color={challengeOpen === index ? C.green : C.red}>{challengeOpen === index ? "SOLUTION" : item[0]}</Mono><strong>{challengeOpen === index ? item[1] : "Tap to see mitigation"}</strong></button>)}</div>
        <div className="report-challenge-progress"><i style={{ width: `${challengeOpen === null ? 0 : 16.6}%` }} /></div>
      </section>

      <section className="report-section report-access">
        <SectionHead label="07 · App architecture" accent={C.blue} /><h2>Role-based access, built into the workflow</h2><div className="report-roles">{["Admin", "Supervisor", "Worker"].map((item) => <button key={item} className={role === item ? "is-active" : ""} onClick={() => setRole(item)}>{item}</button>)}</div><div className="report-permissions">{rbac.map((item) => <div key={item}><b>✓</b><span>{item}</span></div>)}</div>
      </section>

      <section className="report-section report-mockups">
        <SectionHead label="08 · UI preview" accent={C.blue} /><h2>Login, admin dashboard aur worker app</h2><div className="report-mock-tabs">{[["login", "LOGIN"], ["admin", "ADMIN WEB"], ["worker", "WORKER MOBILE"]].map((item) => <button key={item[0]} className={mockup === item[0] ? "is-active" : ""} onClick={() => setMockup(item[0])}>{item[1]}</button>)}</div><div className="report-mockup"><strong>{mockup === "login" ? "SIF INTELLIGENCE · RBAC VERIFIED LOGIN" : mockup === "admin" ? "ADMIN DASHBOARD · 3 CRITICAL ALERTS · 12 OPEN ACTIONS" : "NAMASTE, RAMESH · WH-14 · TAP TO REPORT AURA"}</strong><span>{mockup === "login" ? "Worker · Supervisor · Admin" : mockup === "admin" ? "Reports · Risk Alerts · Corrective Actions · Audit Trail" : "Recent reports · site alerts · view + submit only"}</span></div>
      </section>

      <section className="report-section" id="report-business">
        <SectionHead label="07 · Business case" accent={C.green} /><h2>Numbers jo Board ko convince karte hain</h2>
        <div className="report-roi">{[["₹10.5 Cr", "average annual net savings"], ["1.5–2.5 mo", "projected payback"], ["400%", "5-year ROI"], ["85%", "manual analysis time reduction"], ["3 lives", "annually saved, projected"]].map((item) => <div key={item[0]}><strong>{item[0]}</strong><span>{item[1]}</span></div>)}</div>
      </section>

      <section className="report-section report-close"><div><SectionHead label="08 · Recommendation" accent={C.green} /><h2>Go forward: <span>YES</span></h2><p>Pilot-first rollout, ₹1.5–2 Crore budget, aur 12–18 months mein 100+ sites tak deployment. Yeh tool nahi, safety culture ka shift hai.</p></div><div className="report-rollout"><Mono size={9} color={C.green}>ROADMAP</Mono><strong>Pilot → 3 rollout waves → full deployment</strong><span>Q1 foundation · Q2 model training · Q3 200-user pilot · Q4 enterprise integration</span><button className="report-secondary" onClick={onOpenAnalyzer}>START PILOT DEMO <span>→</span></button></div></section>
    </div>
  );
}

function DashboardHome({ onSelect }: { onSelect(tab: Tab): void }) {
  const [programView, setProgramView] = useState<"briefing" | "training" | "culture" | "outcomes" | "roadmap">("briefing");
  const modules: { tab: Tab; icon: string; title: string; copy: string; status: string; accent: string }[] = [
    { tab: "analyzer", icon: "◎", title: "Incident Analyzer", copy: "Turn a field report into an explainable SIF score and immediate action.", status: "LIVE · 1 DRAFT", accent: C.orange },
    { tab: "alerts", icon: "!", title: "Pattern Alerts", copy: "Repeated near-misses, PPE gaps and exposure clusters needing intervention.", status: "11 ACTIVE", accent: C.red },
    { tab: "worker", icon: "◌", title: "AURA Worker Device", copy: "Voice-first reporting for workers on remote and high-risk sites.", status: "READY · WH-14", accent: C.amber },
    { tab: "desk", icon: "▦", title: "Operations Desk", copy: "Route critical signals to the right owner and dispatch site checks.", status: "3 IN QUEUE", accent: C.blue },
    { tab: "overview", icon: "◈", title: "Network Overview", copy: "Site heatmap, detection speed, field evidence and programme health.", status: "100+ SITES", accent: C.green },
    { tab: "blueprint", icon: "⌘", title: "Architecture & RBAC", copy: "Five-layer engine, role permissions and audit-ready access control.", status: "DESIGN READY", accent: C.blue },
  ];
  return (
    <div className="home-view">
      <div className="home-hero"><div><Mono size={9} color={C.orange}>SIF INTELLIGENCE · OIL INDIA LIMITED</Mono><h1>Safety operations dashboard</h1><p>Detect risk before it becomes fatal. Choose a workflow to move from field signal to accountable action.</p></div><div className="home-live"><span /> SYSTEM ONLINE<strong>11 ACTIVE ALERTS</strong><small>Last scan · 2 min ago</small></div></div>
      <div className="home-kpis"><KPI label="Reports scanned today" value="247" trend="+18 vs yesterday" dir="up" accent={C.blue} /><KPI label="Critical patterns" value="3" trend="2 need action now" dir="up" accent={C.red} /><KPI label="Avg detection time" value="4.2" unit="min" trend="−1.1 min vs last week" dir="down" accent={C.green} /><KPI label="Model accuracy" value="94.7" unit="%" trend="Stable ±0.3%" dir="flat" accent={C.orange} /></div>
      <div className="home-section-head"><div><SectionHead label="Choose a workflow" accent={C.orange} /><h2>What do you need to do?</h2></div><Mono size={9} color={C.muted}>LIVE OPERATIONS · 10 SEP 2026</Mono></div>
      <div className="home-modules">{modules.map((module) => <button className="home-module" key={module.tab} onClick={() => onSelect(module.tab)} style={{ borderTopColor: module.accent }}><div className="home-module__top"><span style={{ color: module.accent }}>{module.icon}</span><Mono size={9} color={module.accent}>{module.status}</Mono></div><strong>{module.title}</strong><p>{module.copy}</p><span className="home-module__open">OPEN MODULE <b>→</b></span></button>)}</div>
      <div className="field-program">
        <div className="field-program__head"><div><SectionHead label="Field safety programme" accent={C.green} /><h2>Executive intent → field action</h2></div><Mono size={9} color={C.green}>ASSAM BENCHMARK · 800 WORKERS · 10 GROUPS</Mono></div>
        <div className="program-tabs">{[["briefing", "Toolbox Talk"], ["training", "Training + zones"], ["culture", "Culture + drills"], ["outcomes", "Measured outcomes"], ["roadmap", "12-month roadmap"]].map((item) => <button key={item[0]} className={programView === item[0] ? "is-active" : ""} onClick={() => setProgramView(item[0] as typeof programView)}>{item[1]}</button>)}</div>
        {programView === "briefing" && <div className="program-panel"><div className="program-big"><Mono size={9} color={C.orange}>07:00 AM · DAILY · 15 MINUTES</Mono><strong>Toolbox Talk</strong><span>Square formation · task hazards · mandatory PPE · buddy system · rest and hydration breaks.</span><div className="program-progress"><i style={{ width: "92%" }} /></div><Mono size={9} color={C.green}>92% ATTENDANCE TODAY</Mono></div><div className="program-checklist"><b>Today's briefing checklist</b><span>✓ Height work: full-body harness</span><span>✓ Helmet + safety shoes verified</span><span>✓ Buddy assigned for every crew</span><span>✓ Questions acknowledged by workers</span></div><div className="program-zone-list"><Mono size={9} color={C.blue}>ZONE LANGUAGE</Mono><span><i className="zone-dot zone-dot--red" />Red · full PPE + supervisor permission</span><span><i className="zone-dot zone-dot--yellow" />Yellow · helmet + overhead awareness</span><span><i className="zone-dot zone-dot--green" />Green · normal safety rules</span></div></div>}
        {programView === "training" && <div className="program-panel"><div className="training-track">{[["DAY 1", "Orientation", "Site tour + emergency procedure"], ["DAY 2–3", "Safety training", "Hazards · PPE · first aid · competency exam"], ["DAY 4–5", "Job specific", "Hands-on role training + final check"], ["6 MONTHS", "Refresher", "Keep knowledge and certification current"]].map((item) => <div key={item[0]}><Mono size={9} color={C.orange}>{item[0]}</Mono><strong>{item[1]}</strong><span>{item[2]}</span></div>)}</div><div className="program-apps"><Mono size={9} color={C.blue}>OILSAFETYAPP · SIX CORE FEATURES</Mono><span>Daily safety tips</span><span>Training videos + QR task guides</span><span>Direct incident reporting + SOS</span><span>Quizzes, gamification and leaderboard</span></div></div>}
        {programView === "culture" && <div className="program-panel"><div className="culture-board"><Mono size={9} color={C.orange}>TEAM SAFETY SCOREBOARD · SEPTEMBER</Mono>{[["Casing Crew A", "+850", "1st · ₹10,000"], ["Drill Floor B", "+790", "2nd · ₹7,000"], ["Maintenance C", "+640", "3rd · ₹5,000"]].map((item, index) => <div key={item[0]}><b>{index + 1}</b><span>{item[0]}</span><strong>{item[1]}</strong><small>{item[2]}</small></div>)}</div><div className="culture-points"><Mono size={9} color={C.green}>POINTS + RECOGNITION</Mono><span>+100 · zero incidents</span><span>+50 · proper PPE usage</span><span>+40 · reporting an incident</span><span>+25 · safety suggestion</span><em>Below 850 → mandatory review</em></div><div className="drill-card"><Mono size={9} color={C.red}>NEXT MOCK DRILL · 45 MINUTES</Mono><strong>30-ft fall scenario</strong><span>01 Siren → 02 Evacuate → 03 First Aid → 04 Rescue + ambulance KPI → 05 Debrief</span></div></div>}
        {programView === "outcomes" && <div className="program-panel"><div className="outcome-grid">{[["15 → 3", "incident rate", "80% reduction"], ["40% → 85%", "worker awareness", "112% increase"], ["50% → 92%", "compliance rate", "84% increase"], ["₹50L → ₹15L", "medical claims", "70% reduction"]].map((item) => <div key={item[1]}><strong>{item[0]}</strong><span>{item[1]}</span><small>{item[2]}</small></div>)}</div><div className="program-note"><Mono size={9} color={C.green}>CASE STUDY · ASSAM DRILLING SITE</Mono><span>Radio + WhatsApp + SMS, CCTV in high-risk zones and peer-to-peer monitoring connected the 800-person workforce.</span></div></div>}
        {programView === "roadmap" && <div className="program-panel"><div className="roadmap-track">{[["01", "Foundation", "Month 1", "Policy, committee, training material"], ["02", "Awareness", "Months 2–3", "Induction, signage, digital groups"], ["03", "Implementation", "Months 4–6", "Daily TBT, weekly audits, analysis"], ["04", "Optimization", "Months 7–12", "App/QR, drills, feedback loops"]].map((item) => <div key={item[0]}><b>{item[0]}</b><Mono size={9} color={C.orange}>{item[2]}</Mono><strong>{item[1]}</strong><span>{item[3]}</span></div>)}</div></div>}
      </div>
      <div className="home-footer"><Mono size={9} color={C.green}>● PILOT MODE</Mono><span>Voice, text and historical safety records are connected in this prototype.</span><button onClick={() => onSelect("analyzer")}>START WITH A REPORT →</button></div>
    </div>
  );
}

function BlueprintView() {
  const [role, setRole] = useState("Admin");
  const permissions = role === "Admin" ? ["All sites and records", "User and role management", "Risk thresholds and alerts", "Corrective action approval"] : role === "Supervisor" ? ["Own site data", "Submit and edit reports", "Assign corrective actions", "View risk alerts"] : ["Own reports", "Voice/text submission", "View site alerts", "No delete or user management"];
  return <div className="blueprint-view"><Mono size={9} color={C.blue}>SYSTEM DESIGN · ACCESS CONTROL</Mono><h1>Architecture & role permissions</h1><p>How the precursor engine, intake channels and field users connect before a critical alert reaches the operations desk.</p><div className="blueprint-flow"><div>FIELD INPUTS<strong>Voice · Web · SMS · Paper</strong></div><i>↓</i><div className="blueprint-gateway">AUTH & RBAC GATEWAY<strong>Validate · classify · route</strong></div><i>↓</i><div className="blueprint-row"><div>NLP PROCESSING<strong>Hazards + entities</strong></div><div>RISK ENGINE<strong>75+ factors</strong></div><div>ALERTING<strong>Owner + deadline</strong></div></div><i>↓</i><div>SAFETY RECORDS + AUDIT TRAIL<strong>Reports · incidents · actions · history</strong></div></div><div className="blueprint-access"><SectionHead label="Permission matrix" accent={C.green} /><div className="blueprint-roles">{["Admin", "Supervisor", "Worker"].map((item) => <button key={item} className={role === item ? "is-active" : ""} onClick={() => setRole(item)}>{item}</button>)}</div><div className="blueprint-permissions">{permissions.map((permission) => <div key={permission}><b>✓</b>{permission}</div>)}</div></div></div>;
}

type ReportPage = { id: string; label: string; title: string; subtitle: string };

function ProjectReport({ onSelect }: { onSelect(tab: Tab): void }) {
  const [page, setPage] = useState(0);
  const pages: ReportPage[] = [
    { id: "executive", label: "01", title: "SIF Precursor Detection Engine", subtitle: "Oil India ke liye AI/NLP-powered predictive safety management system" },
    { id: "problem", label: "02", title: "Problem: hidden risk kaise miss hota hai?", subtitle: "Volume, delay aur siloed data ke beech dangerous pattern chhup jaata hai" },
    { id: "communication", label: "03", title: "Safety communication hierarchy", subtitle: "Top management se ground worker tak closed-loop information flow" },
    { id: "solution", label: "04", title: "Proposed solution", subtitle: "Reactive monitoring se predictive prevention tak" },
    { id: "architecture", label: "05", title: "High-level system architecture", subtitle: "Frontend, API, AI services, data layer aur integrations" },
    { id: "workflow", label: "06", title: "End-to-end incident workflow", subtitle: "Report se action tak six phases" },
    { id: "nlp", label: "07", title: "NLP processing pipeline", subtitle: "Hindi, Assamese aur English report ko structured risk data mein convert karna" },
    { id: "risk", label: "08", title: "Risk scoring algorithm", subtitle: "75+ factors se explainable SIF score aur confidence" },
    { id: "alert", label: "09", title: "Alert, escalation and action management", subtitle: "Right owner, right deadline, right channel" },
    { id: "field", label: "10", title: "Field safety operating model", subtitle: "Toolbox Talk, zones, training, AURA aur OilSafetyApp" },
    { id: "rbac", label: "11", title: "Security and RBAC", subtitle: "Least privilege, audit trail aur sensitive worker data protection" },
    { id: "integration", label: "12", title: "Technical stack and integrations", subtitle: "OIL ecosystem ke saath API-led architecture" },
    { id: "rollout", label: "13", title: "Implementation and change management", subtitle: "Foundation, pilot, waves aur adoption plan" },
    { id: "business", label: "14", title: "ROI, outcomes and success metrics", subtitle: "Safety impact ke saath measurable business case" },
    { id: "risks", label: "15", title: "Risks, mitigations and contingencies", subtitle: "Accuracy, adoption, integration aur regulatory readiness" },
    { id: "ask", label: "16", title: "Recommendation and SIH Q&A", subtitle: "Pilot-first Go Forward plan" },
  ];
  const current = pages[page];
  const go = (next: number) => setPage(Math.max(0, Math.min(pages.length - 1, next)));
  const Metric = ({ value, label, color = C.orange }: { value: string; label: string; color?: string }) => <div className="project-metric"><strong style={{ color }}>{value}</strong><span>{label}</span></div>;
  const Architecture = () => <div className="project-architecture"><div className="project-arch-row"><div>Mobile App</div><div>Web Dashboard</div><div>Offline Field Forms</div></div><i>↓ API Gateway</i><div className="project-arch-gateway">AUTH + RBAC GATEWAY<strong>OAuth / SSO · validation · routing</strong></div><i>↓</i><div className="project-arch-row project-arch-services"><div>NLP Pipeline<strong>Text → entities</strong></div><div>Risk Engine<strong>75+ factors</strong></div><div>Alert Service<strong>Notify + assign</strong></div></div><i>↓</i><div className="project-arch-data">PostgreSQL / MongoDB / Data Lake / Redis / Audit Trail</div></div>;
  const Workflow = () => <div className="project-workflow">{[["01", "Ingest", "Voice, web, SMS, call-centre, paper"], ["02", "Validate", "Location, timestamp, photos, GPS"], ["03", "Understand", "NLP + NER + terminology normalization"], ["04", "Assess", "75+ features + ensemble score"], ["05", "Escalate", "Priority, owner, channel, deadline"], ["06", "Learn", "Outcome feedback + retraining"]].map((item) => <div key={item[0]}><b>{item[0]}</b><strong>{item[1]}</strong><span>{item[2]}</span></div>)}</div>;
  const renderPage = () => {
    if (current.id === "executive") return <><div className="project-title-mark">OIL INDIA LIMITED · INTERNAL SIH REVIEW</div><h1>{current.title}</h1><p className="project-lead">{current.subtitle}. Aim simple hai: serious injury ya fatality hone se pehle precursor detect karna, explain karna aur action trigger karna.</p><div className="project-metrics"><Metric value="70–80%" label="projected serious incident reduction" color={C.green} /><Metric value="<30 min" label="incident to alert response" /><Metric value="89%" label="target model accuracy" color={C.blue} /><Metric value="₹8–13 Cr" label="projected annual net savings" color={C.green} /></div><div className="project-callout"><b>One-line pitch:</b> AI reports ko sirf store nahi karta; hidden patterns ko risk score, accountable alert aur corrective action mein convert karta hai.</div></>;
    if (current.id === "problem") return <><InfoBlock title="Scale">~40,000 employees · 100+ sites · 500–2,000+ monthly reports · 6,000–24,000 annual records.</InfoBlock><div className="project-metrics"><Metric value="7–14 days" label="current analysis lag" color={C.red} /><Metric value="10–15" label="reports / analyst / day" /><Metric value="3–5%" label="critical incidents potentially missed" color={C.red} /><Metric value="₹15–30 Cr" label="annual incident cost exposure" color={C.orange} /></div><InfoBlock title="Why current system fails">Free-text reports, different terminology, analyst fatigue, 9-to-5 analysis, regional silos aur corrective action ka 4–6 week delay. Single incident harmless lagta hai; connected pattern fatal precursor hota hai.</InfoBlock></>;
    if (current.id === "communication") return <><div className="project-hierarchy"><div><b>TOP MANAGEMENT</b><span>Site Manager · Safety Officer</span><small>Policy, budget, risk register</small></div><i>↕</i><div><b>MIDDLE MANAGEMENT</b><span>Supervisor · Foreman · Team Lead</span><small>Daily implementation, compliance, escalation</small></div><i>↕</i><div><b>GROUND LEVEL</b><span>Worker · Operator · Labourer</span><small>Real-time hazard report, safe execution</small></div></div><InfoBlock title="Closed loop">Worker signal → Supervisor action → Safety Officer verification → Top Management risk register → updated briefing, training aur policy.</InfoBlock></>;
    if (current.id === "solution") return <><div className="project-compare"><div><b>OLD · REACTIVE</b><span>Manual reading, 2–14 day lag, isolated records, subjective score, 9-to-5 visibility.</span></div><div><b>NEW · PREDICTIVE</b><span>Automated NLP, seconds-to-minutes processing, connected patterns, explainable score, 24/7 monitoring.</span></div></div><div className="project-metrics"><Metric value="100%" label="reports covered" color={C.green} /><Metric value="24/7" label="autonomous monitoring" color={C.blue} /><Metric value="85%" label="manual analysis time reduction" /><Metric value="1.5–4" label="potential lives saved / year" color={C.green} /></div></>;
    if (current.id === "architecture") return <><Architecture /><InfoBlock title="Design principle">Frontend channels simple rakhe gaye hain; API Gateway authentication and authorization enforce karta hai; AI services independently scale ho sakti hain; data layer audit aur historical learning preserve karta hai.</InfoBlock></>;
    if (current.id === "workflow") return <><Workflow /><InfoBlock title="SLA example">Incident 3:45 PM par report hota hai. Validation 0–5 min, NLP 5–15 min, scoring 15–30 min, alert 30–45 min. Critical score par phone, SMS, WhatsApp aur dashboard notification parallel jaate hain.</InfoBlock></>;
    if (current.id === "nlp") return <><div className="project-nlp"><div><b>RAW REPORT</b><span>“50 ft par drilling pipe se deep cut hua, gloves nahi the.”</span></div><i>→</i><div><b>EXTRACTED ENTITIES</b><span>Height: 50 ft · Injury: laceration · PPE: gloves missing · Equipment: pipe</span></div><i>→</i><div><b>STRUCTURED SIGNAL</b><span>Unsafe act + condition · confidence 0.95 · high-risk context</span></div></div><div className="project-tag-row"><span>Language detection</span><span>Tokenization</span><span>NER</span><span>Semantic analysis</span><span>Terminology normalization</span><span>Confidence score</span></div></>;
    if (current.id === "risk") return <><div className="project-formula">SIF SCORE = 0.25 × Injury + 0.20 × Height + 0.20 × PPE + 0.15 × Pattern + 0.12 × Exposure + 0.08 × Environment</div><div className="project-factor-grid">{[["Injury", "85", "Deep laceration"], ["Height", "80", "50 feet"], ["PPE", "35", "Gloves missing"], ["Pattern", "95", "5 similar incidents"], ["Exposure", "75", "300 workers"], ["Environment", "60", "Outdoor site"]].map((item) => <div key={item[0]}><b>{item[0]}</b><strong>{item[1]}</strong><span>{item[2]}</span></div>)}</div><div className="project-callout"><b>Example output: 72.3 / 100 · HIGH · URGENT.</b> Score ke saath “why” bhi dikhega: pattern increasing, PPE failure, high altitude aur large exposure.</div></>;
    if (current.id === "alert") return <><Workflow /><div className="project-action-grid">{[["0–30 min", "Secure area", "Site Supervisor", "URGENT"], ["≤2 hours", "Medical check", "Medical Officer", "URGENT"], ["≤24 hours", "Root cause analysis", "Safety Officer", "HIGH"], ["≤7 days", "Training plan", "Training Team", "HIGH"]].map((item) => <div key={item[1]}><Mono size={9} color={C.red}>{item[0]}</Mono><strong>{item[1]}</strong><span>{item[2]}</span><b>{item[3]}</b></div>)}</div></>;
    if (current.id === "field") return <><div className="project-field-grid"><InfoBlock title="Toolbox Talk">7:00 AM · 15 min · square formation · hazard identification · mandatory PPE · buddy system · hydration.</InfoBlock><InfoBlock title="Visual zones">Red: restricted + full PPE · Yellow: caution + helmet · Green: normal rules.</InfoBlock><InfoBlock title="Training cycle">Day 1 orientation · Day 2–3 safety · Day 4–5 job-specific · six-month refresher.</InfoBlock><InfoBlock title="Digital channels">SMS/WhatsApp alerts · QR task videos · OilSafetyApp · SOS · quizzes · leaderboard.</InfoBlock></div><div className="project-callout"><b>Human behaviour matters:</b> reporting ko punish nahi, reward karna hai. Zero incident +100, PPE +50, incident report +40, safety suggestion +25.</div></>;
    if (current.id === "rbac") return <><div className="project-role-grid">{[["Admin", "All sites, users, thresholds, audit"], ["Supervisor", "Own site, actions, report review"], ["Worker", "Own reports, voice/text submit, alerts view"]].map((item) => <div key={item[0]}><b>{item[0]}</b><span>{item[1]}</span></div>)}</div><InfoBlock title="Security controls">OAuth 2.0 / SSO, TLS 1.3, AES-256 at rest, RBAC, secrets vault, audit logs, consent-based medical data aur retention policy. Every edit: who, what, when.</InfoBlock></>;
    if (current.id === "integration") return <><div className="project-stack">{[["Frontend", "React mobile/web · offline forms"], ["API", "FastAPI / REST · WebSocket updates"], ["AI/ML", "spaCy · Indic-BERT · XGBoost · ensemble"], ["Data", "PostgreSQL · MongoDB · Redis · Elasticsearch · S3"], ["Infra", "Docker · Kubernetes · CI/CD · Prometheus"], ["External", "SAP · HRIS · medical records · DMS · SMS/WhatsApp"]].map((item) => <div key={item[0]}><b>{item[0]}</b><span>{item[1]}</span></div>)}</div><InfoBlock title="Integration rule">Existing OIL systems replace nahi honge. API-led layer incident, worker, training, cost aur document context ko safely connect karegi.</InfoBlock></>;
    if (current.id === "rollout") return <><div className="project-roadmap">{[["01", "Foundation", "Months 1–3", "Architecture, data audit, core NLP and model"], ["02", "Pilot", "Months 4–6", "1 major field, 500–800 workers, parallel run"], ["03", "Waves", "Months 7–12", "Eastern, Western, Northern site rollout"], ["04", "Full deploy", "Year 2", "100+ sites, corporate and regulatory integration"]].map((item) => <div key={item[0]}><b>{item[0]}</b><Mono size={9} color={C.orange}>{item[2]}</Mono><strong>{item[1]}</strong><span>{item[3]}</span></div>)}</div><InfoBlock title="Change management">Executive 4h briefing, Safety Officer 8h hands-on, worker 1.5h introduction, IT 16h technical training. Existing safety team ko replace nahi, augment kiya jayega.</InfoBlock></>;
    if (current.id === "business") return <><div className="project-metrics"><Metric value="70–80%" label="serious incidents reduction" color={C.green} /><Metric value="<30 min" label="response time" color={C.blue} /><Metric value="₹8–13 Cr" label="net annual savings" color={C.green} /><Metric value="300–400%" label="five-year ROI" /><Metric value="99.95%" label="target uptime" color={C.blue} /></div><div className="project-kpi-table">{[["Near-miss coverage", "40%", "100%"], ["Prevention success", "25%", "75–85%"], ["Risk accuracy", "65% manual", "89% target"], ["User adoption", "—", "90% by month 6"], ["Action closure", "7–14 days", "<2 days"]].map((row) => <div key={row[0]}><span>{row[0]}</span><em>{row[1]}</em><b>{row[2]}</b></div>)}</div></>;
    if (current.id === "risks") return <div className="project-risk-list">{[["NLP accuracy lower than expected", "Human review for border cases, retraining, threshold tuning"], ["Data integration challenge", "Early ETL testing, schema validation, fallback import"], ["Low user adoption", "Role-based training, site champions, incentives"], ["Budget overrun", "Phased funding, 20% contingency, defer non-critical features"], ["Privacy / regulatory", "Consent, encryption, audit trail, legal review"]].map((item) => <div key={item[0]}><b>{item[0]}</b><span>{item[1]}</span></div>)}</div>;
    return <><div className="project-callout project-callout--success"><b>Recommendation: GO FORWARD.</b> Pilot-first, ₹1.5–2 Crore budget, 12–18 month full deployment, 85%+ success probability with proper execution.</div><div className="project-qa"><b>Likely SIH questions</b><span>Q: AI galat score de to? → Human review + confidence threshold + audit feedback.</span><span>Q: Remote site par network na ho? → Offline-first capture, later sync.</span><span>Q: Worker surveillance feel karega? → Wake-word consent, safety-only purpose, clear retention.</span><span>Q: Existing SAP/HRIS replace hoga? → No, API integration layer connect karegi.</span><span>Q: Pilot success kaise measure? → Accuracy, response time, adoption, incident reduction, ROI.</span></div><button className="project-primary" onClick={() => onSelect("analyzer")}>OPEN LIVE INCIDENT DEMO →</button></>;
  };
  return <div className="project-report"><aside className="project-sidebar"><div className="project-brand">SIF / OIL INDIA<small>PROJECT REPORT · SIH INTERNAL</small></div>{pages.map((item, index) => <button key={item.id} className={index === page ? "is-active" : ""} onClick={() => setPage(index)}><b>{item.label}</b><span>{item.title}</span></button>)}</aside><main className="project-main"><div className="project-top"><Mono size={9} color={C.orange}>INTERACTIVE TECHNICAL + OPERATIONAL REPORT</Mono><span>{page + 1} / {pages.length}</span></div><div className="project-page"><div className="project-kicker">{current.label} · {current.subtitle}</div>{renderPage()}</div><div className="project-controls"><button onClick={() => go(page - 1)} disabled={page === 0}>← PREVIOUS</button><button onClick={() => go(page + 1)} disabled={page === pages.length - 1}>NEXT →</button></div></main></div>;
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) { return <div className="project-info"><b>{title}</b><span>{children}</span></div>; }

// ─── Header ───────────────────────────────────────────────────────────────────

function Header() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 18px", background: "#F8FBFB",
      borderBottom: `1px solid ${C.border}`, flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="brand-mark" aria-label="SIF logo">
          <span>S</span><span>IF</span>
        </div>
        <div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 18, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: C.text,
          }}>
            SIF Intelligence
          </div>
          <Mono size={8} color={C.muted}>Serious Injury & Fatality Intelligence</Mono>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div className="header-tagline">DETECT RISK BEFORE IT BECOMES FATAL</div>
        {/* System status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", border: `1px solid ${C.border2}` }}>
          <div style={{ width: 6, height: 6, background: C.green }} />
          <Mono size={9} color={C.green}>SYSTEM ONLINE</Mono>
        </div>
        {/* Alert count */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div className="blink" style={{ width: 6, height: 6, background: C.red }} />
          <Mono size={10} color={C.red}>11 ACTIVE ALERTS</Mono>
        </div>
        <Clock />
      </div>
    </div>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; glyph: string }[] = [
  { id: "home",     label: "Dashboard",         glyph: "⌂" },
  { id: "analyzer", label: "Incident Analyzer", glyph: "◎" },
  { id: "overview", label: "Network Overview",  glyph: "◈" },
  { id: "alerts",   label: "Pattern Alerts",    glyph: "◉" },
  { id: "worker",   label: "Worker Device",     glyph: "◌" },
  { id: "desk",     label: "Operations Desk",   glyph: "▦" },
  { id: "blueprint", label: "Blueprint",         glyph: "⌘" },
];

function TabBar({ active, onSelect }: { active: Tab; onSelect(t: Tab): void }) {
  return (
    <div style={{
      display: "flex", flexShrink: 0,
      borderTop: `1px solid ${C.border}`, background: "#F8FBFB",
    }}>
      {TABS.map((tab) => {
        const on = active === tab.id;
        return (
          <button
            key={tab.id}
            className="tab-btn"
            onClick={() => onSelect(tab.id)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "9px 8px", gap: 3, cursor: "pointer",
              background: on ? `${C.orange}08` : "transparent",
              borderTop: `2px solid ${on ? C.orange : "transparent"}`,
              color: on ? C.orange : C.muted,
            }}
          >
            <span style={{ fontSize: 13 }}>{tab.glyph}</span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase",
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [voiceAlert, setVoiceAlert] = useState<VoiceMatch | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.base, color: C.text }}>
      <Header />
      <div className="app-content-scroll">
        {tab !== "worker" && tab !== "home" && tab !== "blueprint" && <VoiceSignalPanel onAlert={setVoiceAlert} />}
        <div className="app-content-stage">
          {tab === "home"     && <DashboardHome onSelect={setTab} />}
          {tab === "analyzer" && <IncidentAnalyzer />}
          {tab === "overview" && <NetworkOverview />}
          {tab === "alerts"   && <AlertsFeed />}
          {tab === "worker"   && <WorkerDevice onAlert={setVoiceAlert} />}
          {tab === "desk"     && <OperationsDesk voiceAlert={voiceAlert} />}
          {tab === "blueprint" && <BlueprintView />}
        </div>
      </div>
      <TabBar active={tab} onSelect={setTab} />
      {voiceAlert && (
        <div className="voice-alert" role="alert">
          <div className="worker-toast__icon">!</div>
          <div><Mono size={9} color={C.red}>VOICE SIGNAL MATCHED TO RECORDS</Mono><div className="worker-toast__title">{voiceAlert.hazard}</div><Mono size={9} color={C.dim}>Worker action required · risk {voiceAlert.risk}</Mono></div>
          <button onClick={() => setVoiceAlert(null)}>DISMISS</button>
        </div>
      )}
    </div>
  );
}
