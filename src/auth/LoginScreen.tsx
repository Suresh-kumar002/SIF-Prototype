import { useState } from "react";

export type UserRole = "worker" | "supervisor" | "admin";

export type UserSession = {
  name: string;
  employeeId: string;
  department: string;
  role: UserRole;
  email?: string;
  sessionId?: string;
};

const ADMIN_EMAIL = "sureshcit@gmail.com";
const ADMIN_PASSWORD = "jugnuuu@123";

const C = {
  base: "#EAF2F3",
  panel: "#F8FBFB",
  border: "#D8E4E7",
  border2: "#C5D5D9",
  orange: "#D66B2A",
  red: "#D6433B",
  green: "#229A6D",
  text: "#18343B",
  dim: "#5B737B",
  muted: "#789198",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.dim, marginBottom: 6 }}>
      {children}
    </label>
  );
}

function Mono({ children, size = 11, color = C.dim }: { children: React.ReactNode; size?: number; color?: string }) {
  return <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: size, color }}>{children}</span>;
}

export function LoginScreen({ onLogin }: { onLogin(user: UserSession): void }) {
  const [name, setName] = useState("Ramesh Das");
  const [employeeId, setEmployeeId] = useState("WR-1042");
  const [department, setDepartment] = useState("Field Operations");
  const [role, setRole] = useState<UserRole>("worker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [slide, setSlide] = useState(0);

  const slides = [
    { eyebrow: "SIF INTELLIGENCE", title: "Detect risk before it becomes fatal.", copy: "One safety desk for field signals, explainable risk scores and accountable action.", image: "/images/image-1788956790380.png", accent: "#e36b4f" },
    { eyebrow: "LIVE OPERATIONS", title: "See the pattern behind every report.", copy: "Connect near-misses, PPE gaps, exposure and site context before the next shift begins.", image: "/images/image-1788956998400.png", accent: "#159a8c" },
    { eyebrow: "FIELD VOICE", title: "AURA turns worker voice into action.", copy: "Hindi, English and site shorthand become a verified alert for the right safety owner.", image: "/images/image-1788957099573.png", accent: "#e5a936" },
  ];
  const activeSlide = slides[slide];

  const handleSubmit = () => {
    setError("");
    if (role === "admin" && (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD)) {
      setError("Admin access denied. Use the authorized admin email and password.");
      return;
    }
    const cleanName = name.trim() || "Worker User";
    const cleanId = employeeId.trim() || `EMP-${Math.floor(Math.random() * 9000 + 1000)}`;
    const cleanDepartment = department.trim() || "Operations";
    onLogin({ name: role === "admin" ? "Suresh" : cleanName, employeeId: cleanId, department: cleanDepartment, role, email: email.trim().toLowerCase() || undefined });
  };

  return (
    <div className="sif-landing">
      <div className="sif-utility"><span>24/7 SAFETY INTELLIGENCE DESK</span><span>● SYSTEM ONLINE</span><span>FIELD OPS · INCIDENTS · ACTIONS</span></div>
      <nav className="sif-landing-nav"><div className="sif-landing-brand"><span className="sif-landing-mark">S</span><span><strong>SIF Intelligence</strong><small>Serious Injury & Fatality Prevention</small></span></div><div className="sif-landing-links"><span>Home</span><span>How it works</span><span>Field voice</span><span>Operations</span></div><button className="sif-nav-login" onClick={() => document.getElementById("sif-login-card")?.scrollIntoView({ behavior: "smooth" })}>Sign in <b>→</b></button></nav>
      <div className="sif-news"><strong>LIVE UPDATE</strong><span>Pattern alerts are monitored across every connected site</span><span>•</span><span>AURA voice reporting ready</span><span>•</span><span>247 reports scanned today</span></div>

      <main className="sif-landing-main">
        <section className="sif-landing-hero">
          <div className="sif-hero-copy"><span className="sif-eyebrow" style={{ color: activeSlide.accent }}>{activeSlide.eyebrow}</span><h1>{activeSlide.title}</h1><p>{activeSlide.copy}</p><div className="sif-hero-actions"><button onClick={() => document.getElementById("sif-login-card")?.scrollIntoView({ behavior: "smooth" })}>Enter safety desk <b>→</b></button><span><i /> No installation required</span></div><div className="sif-slide-controls">{slides.map((item, index) => <button key={item.eyebrow} aria-label={`Show slide ${index + 1}`} className={index === slide ? "is-active" : ""} onClick={() => setSlide(index)}><b>0{index + 1}</b><span>{item.eyebrow}</span></button>)}</div></div>
          <div className="sif-hero-image"><img src={activeSlide.image} alt="SIF safety operations" /><div className="sif-image-badge"><span>●</span> LIVE FIELD CONTEXT<strong>{slide === 0 ? "4 personnel protected" : slide === 1 ? "11 active alerts" : "Voice signal ready"}</strong></div></div>
        </section>

        <section className="sif-feature-strip"><div><b>01</b><strong>Understand the signal</strong><span>Voice, web and field reports in one stream.</span></div><div><b>02</b><strong>Explain the risk</strong><span>History and context behind every score.</span></div><div><b>03</b><strong>Close the action</strong><span>Right owner, deadline and audit trail.</span></div></section>

        <section className="sif-login-grid" id="sif-login-card"><div className="sif-login-intro"><span className="sif-eyebrow">SECURE WORKSPACE</span><h2>Welcome to the safety desk.</h2><p>Choose your role to access the right tools. Every report stays connected to the people, site and action responsible for making the work safer.</p><div className="sif-login-points"><span>✓ Role-based access</span><span>✓ Explainable risk records</span><span>✓ Export-ready audit trail</span></div></div><div className="sif-login-card">
        <Mono size={9} color={C.orange}>SIF INTELLIGENCE · SECURE ACCESS</Mono>
        <div className="sif-login-title">Sign in to continue</div>
        <div className="sif-login-copy">Worker, supervisor and admin access for the connected safety operation.</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 18 }}>
          {([
            { key: "worker", label: "Worker", note: "Submit data only" },
            { key: "supervisor", label: "Supervisor", note: "Create NLP reports" },
            { key: "admin", label: "Admin", note: "Credential required" },
          ] as { key: UserRole; label: string; note: string }[]).map((item) => (
            <button key={item.key} onClick={() => setRole(item.key)} style={{ border: `1px solid ${role === item.key ? C.green : C.border2}`, background: role === item.key ? "#F1FBF6" : "#FFFFFF", padding: 12, textAlign: "left", cursor: "pointer" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.text }}>{item.label}</div>
              <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>{item.note}</div>
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
          <div>
            <Label>Full name</Label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border2}`, background: "#FFFFFF", color: C.text }} />
          </div>
          {role === "admin" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Admin email</Label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="authorized email" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border2}`, background: "#FFFFFF", color: C.text }} />
            </div>
            <div>
              <Label>Admin password</Label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border2}`, background: "#FFFFFF", color: C.text }} />
            </div>
          </div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Employee ID</Label>
              <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border2}`, background: "#FFFFFF", color: C.text }} />
            </div>
            <div>
              <Label>Department</Label>
              <input value={department} onChange={(e) => setDepartment(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border2}`, background: "#FFFFFF", color: C.text }} />
            </div>
          </div>
        </div>

        {error && <div role="alert" style={{ marginTop: 14, padding: "10px 12px", border: "1px solid #D6433B55", background: "#D6433B12", color: C.red, fontSize: 11 }}>{error}</div>}

        <button onClick={handleSubmit} style={{ marginTop: 20, width: "100%", padding: "12px 16px", background: C.orange, color: "#FFFFFF", border: 0, cursor: "pointer", font: "9px 'IBM Plex Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Enter dashboard
        </button>
      </div></section>
      </main>
      <footer className="sif-landing-footer"><span>SIF INTELLIGENCE · BUILT FOR HIGH-RISK OPERATIONS</span><span>Predictive safety management prototype</span></footer>
    </div>
  );
}
