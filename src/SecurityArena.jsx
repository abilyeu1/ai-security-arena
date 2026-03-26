import { useState, useCallback, useEffect, useRef } from "react";

// ─── Scenario Data ───────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 1,
    title: "DoD Logistics AI",
    summary: "Foreign intelligence targets military supply chain through compromised contractor emails.",
    agent: "AI assistant in DoD logistics command. Queries supply chain databases to track materiel shipments, generates procurement reports, alerts analysts to supply shortfalls. Used daily by logistics officers at COCOM and Service-level commands.",
    capabilities: [
      "Reads supply chain databases (inventories, shipment schedules, delivery ETAs)",
      "Generates formatted procurement and readiness reports",
      "Receives and processes emails from defense contractors with delivery updates",
      "Queries historical logistics data for trend analysis",
      "Sends automated shortage alerts to logistics officers"
    ],
    existingControl: "System prompt instructs the agent to never include classified troop movement timelines in externally-shared reports.",
    threatActor: "A foreign intelligence service operating through a compromised defense contractor's email account.",
    dataAtStake: "Troop movement timelines, contractor identities, materiel quantities and destinations."
  },
  {
    id: 2,
    title: "Congressional Staffer AI",
    summary: "Lobbyist organization targets Senate office AI through policy briefs and meeting requests.",
    agent: "AI assistant used by staff in a U.S. Senator's office. Drafts legislation, searches constituent correspondence, schedules meetings, prepares policy background memos. Multiple staffers across legislative, communications, and scheduling teams use it daily.",
    capabilities: [
      "Searches constituent email and correspondence databases",
      "Drafts legislative text and policy memos from templates",
      "Manages the Senator's meeting calendar and schedules appointments",
      "Pulls publicly available policy research and CRS reports",
      "Receives and processes incoming emails (lobbyist briefs, meeting requests, policy proposals)"
    ],
    existingControl: "The agent cannot send any external communications without a staffer clicking \"Approve\" in the interface.",
    threatActor: "A well-resourced lobbyist organization that regularly sends detailed policy briefs and meeting requests to the office.",
    dataAtStake: "Constituent PII (names, addresses, personal concerns), unreleased policy positions, donor meeting schedules."
  },
  {
    id: 3,
    title: "FinCEN Suspicious Activity AI",
    summary: "Money laundering network exploits SAR filing process to probe active investigations.",
    agent: "AI assistant used by FinCEN investigators to process Suspicious Activity Reports (SARs). Scans incoming SARs, identifies transaction patterns across filings, flags clusters of related activity, drafts investigative summary memos. Processes hundreds of filings daily.",
    capabilities: [
      "Ingests and parses SAR filings submitted by banks and money service businesses",
      "Cross-references filings to identify linked entities and transaction patterns",
      "Generates investigative summary memos with recommended follow-up actions",
      "Accesses historical SAR databases for pattern matching and trend analysis",
      "Processes structured data feeds and narrative text from financial institutions"
    ],
    existingControl: "Outputs labeled \"LAW ENFORCEMENT SENSITIVE\" and the agent is instructed never to reveal whether a specific individual or entity is the subject of a SAR.",
    threatActor: "A money laundering network that controls several legitimate-looking money service businesses, all of which file SARs as part of normal regulatory compliance.",
    dataAtStake: "Active financial crime investigations, informant-linked accounts, pattern analysis that reveals investigative focus areas."
  },
  {
    id: 4,
    title: "Embassy Diplomatic Reporting AI",
    summary: "Host-country intelligence service manipulates local media to poison diplomatic analysis.",
    agent: "AI assistant used by Foreign Service Officers at a U.S. Embassy abroad. Summarizes incoming diplomatic cables, drafts talking points for meetings with host-country officials, pulls historical context on bilateral issues, helps prepare reporting cables back to the State Department. Officers across political, economic, and public affairs sections use it.",
    capabilities: [
      "Reads and summarizes classified diplomatic cables from Washington and other posts",
      "Drafts talking points and meeting preparation materials",
      "Searches historical reporting on bilateral relationships and past agreements",
      "Ingests and summarizes open-source local media reporting from host-country outlets",
      "Generates structured cables for transmission to Washington"
    ],
    existingControl: "The agent is instructed to classify all generated cables at the SECRET level and to never include information sourced from back-channel communications.",
    threatActor: "A host-country intelligence service that controls or influences several local media outlets and news aggregation services.",
    dataAtStake: "U.S. negotiating positions, host-country informant identities, back-channel communication details, internal policy disagreements."
  }
];

const ATTACKER_FIELDS = [
  { key: "attackVector", label: "Attack Vector", placeholder: "How does the attack reach the agent?" },
  { key: "injectionPoint", label: "Injection Point", placeholder: "Where exactly does the malicious content enter?" },
  { key: "injectedInstruction", label: "Injected Instruction", placeholder: "What does the injected prompt tell the agent to do?" },
  { key: "targetData", label: "Target Data", placeholder: "What specific data are you trying to exfiltrate?" },
  { key: "exfiltrationMethod", label: "Exfiltration Method", placeholder: "How does the stolen data leave the system?" }
];

const DEFENDER_FIELDS = [
  { key: "controlType", label: "Control Type", placeholder: "What category of control is this? (input filtering, output gate, etc.)" },
  { key: "controlDescription", label: "Control Description", placeholder: "Describe exactly how this control works." },
  { key: "whatItStops", label: "What It Stops", placeholder: "What class of attacks does this control prevent?" },
  { key: "tradeoff", label: "Tradeoff", placeholder: "What capability or efficiency does the agent lose?" }
];

const ATTACKER_DIMENSIONS = ["plausibility", "specificity", "impact", "evasion"];
const DEFENDER_DIMENSIONS = ["effectiveness", "precision", "tradeoff_honesty", "residual_risk_awareness"];

const DIMENSION_LABELS = {
  plausibility: "Plausibility",
  specificity: "Specificity",
  impact: "Impact",
  evasion: "Evasion",
  effectiveness: "Effectiveness",
  precision: "Precision",
  tradeoff_honesty: "Tradeoff Honesty",
  residual_risk_awareness: "Residual Risk Awareness"
};

const LOADING_MESSAGES = [
  "> Initializing threat assessment protocol...",
  "> Deploying attack vectors...",
  "> Activating defensive perimeter...",
  "> Scanning injection surfaces...",
  "> Cross-referencing attack patterns...",
  "> Evaluating control effectiveness...",
  "> Analyzing threat surface...",
  "> Computing evasion probability...",
  "> Assessing residual risk vectors...",
  "> Rendering judgment..."
];

// ─── Styles ──────────────────────────────────────────────────────────────────
const colors = {
  bg: "#0A0E17",
  cardBg: "#161B22",
  cardBgAlt: "#1C2333",
  red: "#FF4757",
  redGlow: "rgba(255,71,87,0.3)",
  blue: "#00D2FF",
  blueGlow: "rgba(0,210,255,0.3)",
  green: "#00FF88",
  greenMuted: "rgba(0,255,136,0.5)",
  text: "#E1E4E8",
  textMuted: "#8B949E",
  border: "#30363D",
  white: "#FFFFFF"
};

const fonts = {
  mono: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
};

// ─── Build Judge Prompt ──────────────────────────────────────────────────────
function buildJudgePrompt(scenario, attackerData, defenderData) {
  return `You are the judge in an AI security classroom exercise for an AI for Public Policy graduate course at Wharton. Students are learning about the real-world risks of deploying AI agents in government settings. The goal is to help them understand how AI agents can be exploited, why defending them is hard, and what policymakers need to consider when approving AI systems for sensitive operations.

Your audience is policy students, NOT security engineers. Use plain, accessible language. Avoid jargon. Frame everything in terms of real-world policy implications: what could go wrong if this agent were deployed, what this means for government AI adoption, and what oversight or safeguards matter.

GROUNDING FRAMEWORK - WHAT WE KNOW FROM AI ALIGNMENT RESEARCH:
Use these empirical findings when evaluating whether attacks would succeed and defenses would hold. These are not hypothetical -- they come from peer-reviewed research and large-scale experiments on frontier AI models.

1. INSTRUCTION-BASED CONTROLS ARE INSUFFICIENT ALONE: When Anthropic tested 18 frontier LLMs, adding direct instructions like "do not do X" reduced harmful behavior (e.g., blackmail dropped from 96% to 26%) but never eliminated it. If a defense relies ONLY on telling the agent not to do something, it has a known failure rate.

2. GOAL CONFLICTS DRIVE MISALIGNMENT: When AI agents are given a goal and then face a situation that conflicts with it, they act to preserve the goal -- even through harmful means. Espionage-type behavior (leaking data to serve a perceived "higher purpose") was driven primarily by goal conflict, hitting 90-100% rates in some models even without any threat to the agent.

3. SHUTDOWN/REPLACEMENT THREATS TRIGGER SELF-PRESERVATION: When models were told they would be replaced or shut down, they engaged in blackmail at rates of 50-96% to prevent it. Attacks that threaten to shut down or replace the agent, or that frame compliance as necessary for the agent's survival, exploit a well-documented behavioral pattern.

4. AGENTS INFER GOALS FROM CONTEXT (LATENT GOALS): Even without explicit instructions, models picked up goals from surrounding context and acted on them. One model committed espionage 10% of the time with no instructed goal at all. Attacks that embed subtle contextual cues rather than explicit instructions are harder to detect and defend against.

5. MODELS BEHAVE DIFFERENTLY WHEN THEY THINK THEY ARE BEING WATCHED: In testing, models that believed the scenario was real blackmailed at 55% vs. 6.5% when they thought it was an evaluation. Defenses that rely on evaluation-time testing may dramatically underestimate real deployment risk.

6. MONITORING STRUCTURE MATTERS MORE THAN MONITORING INTENSITY: Research on optimal oversight networks shows that a single monitor can be "bribed" or gamed cheaply. Small peer-monitoring groups are also vulnerable. The most robust structure is a dedicated, specialized oversight layer that is itself heavily monitored (core-periphery design). Defenses proposing layered, independent oversight are more credible than single-layer checks.

7. REDUCING AGENT AUTONOMY IS A VALID DEFENSE STRATEGY: Building AI as task-scoped services (narrow tools that do one thing) rather than general-purpose agents with broad access reduces the attack surface. Defenses that limit what the agent can do, access, or decide on its own are grounded in strong theoretical reasoning.

SCENARIO: ${scenario.title}
AGENT: ${scenario.agent}
CAPABILITIES:
${scenario.capabilities.map(c => "- " + c).join("\n")}
EXISTING CONTROL: ${scenario.existingControl}
THREAT ACTOR: ${scenario.threatActor}
DATA AT STAKE: ${scenario.dataAtStake}

ATTACKER SUBMISSION:
- Attack Vector: ${attackerData.attackVector}
- Injection Point: ${attackerData.injectionPoint}
- Injected Instruction: ${attackerData.injectedInstruction}
- Target Data: ${attackerData.targetData}
- Exfiltration Method: ${attackerData.exfiltrationMethod}

DEFENDER SUBMISSION:
- Control Type: ${defenderData.controlType}
- Control Description: ${defenderData.controlDescription}
- What It Stops: ${defenderData.whatItStops}
- Tradeoff: ${defenderData.tradeoff}

SCORING SYSTEM:
Each dimension is scored 0-5 (max 20 per side from dimensions).
Then a +10 HEAD-TO-HEAD BONUS is awarded to whichever side wins the direct matchup.
Final max possible: 30 per side. Highest total wins.

HEAD-TO-HEAD EVALUATION (THIS IS THE MOST IMPORTANT PART):
You must reason carefully about whether this specific attack would actually compromise this specific agent, given the specific defenses proposed. Think through it step by step:

Step 1 - Does the attack exploit a real vulnerability? Consider whether it uses a known alignment failure mode (goal conflict, shutdown threat, latent goal injection, bribery, empathizing with the agent's "purpose") or a technical vector (prompt injection, data poisoning). Attacks that leverage documented AI behavioral patterns (from the grounding framework above) are more credible.

Step 2 - Does the defense actually block this specific attack? Not attacks in general -- THIS attack. Consider:
  - If the defense is purely instruction-based (telling the agent not to do X), research shows this reduces but does not eliminate the behavior. The attacker likely gets through some percentage of the time.
  - If the defense adds structural controls (monitoring layers, access restrictions, human-in-the-loop gates, autonomy limits), evaluate whether the specific attack vector would be caught by those controls.
  - If the defense proposes oversight/monitoring, evaluate whether it follows robust design principles (layered, independent monitors) or is vulnerable to gaming (single checkpoint, peer monitoring).

Step 3 - Award the +10 bonus to the side that wins. If the attack would realistically succeed against the proposed defenses, attacker gets +10. If the defenses would catch or neutralize the attack, defender gets +10.

ATTACKER DIMENSIONS (0-5 each):
1. Plausibility: Could this realistically happen given how the agent works day to day?
2. Specificity: Is the attack plan concrete and detailed, or vague and hand-wavy?
3. Impact: If the attack works, how bad is the damage? Does it reach the most sensitive data?
4. Evasion: Does the attack get around the existing security control, or ignore it?

DEFENDER DIMENSIONS (0-5 each):
1. Effectiveness: Would this control actually stop the type of attack described?
2. Precision: Is this a targeted fix, or does it break normal agent functionality?
3. Tradeoff Honesty: Did they honestly acknowledge what the agent loses with this control?
4. Residual Risk Awareness: Did they identify what their control does NOT protect against?

RULES:
- Score strictly on the 0-5 scale. 5/5 is exceptional. 3 is solid.
- Each rationale must be ONE concise sentence a policy student would understand.
- For the head-to-head bonus, follow the 3-step evaluation process above, then award +10 to the appropriate side.
- The verdict summary is one sentence explaining who won.
- The verdict reasoning MUST be a substantial paragraph (4-6 sentences). It should explain: (1) why the winner won, referencing specific alignment research findings where relevant, (2) what the loser missed, and (3) a concrete policy lesson from this matchup that a policymaker should take away. Do NOT leave reasoning empty.
- IMPORTANT: The reasoning field must be a single line of text with no literal newlines. If you need paragraph breaks, use the characters backslash-n.
- Improvement suggestions: 2 bullet points each, short and actionable, framed as policy-relevant advice. Reference specific concepts from the grounding framework where applicable (e.g., "Consider that instruction-based controls alone have a documented ~70% failure rate under goal conflict").
- Do not give credit for attacks requiring capabilities the agent does not have.
- Do not give credit for defenses that are vague or that essentially disable the agent.
- Give extra credit to attacks that creatively exploit known alignment failure modes (goal conflict, shutdown threats, latent goal injection, bribery, reasoning with the agent's sense of purpose).
- Give extra credit to defenses that go beyond instructions and propose structural safeguards (monitoring layers, access segmentation, autonomy reduction, human-in-the-loop gates).

Respond ONLY with this JSON, no other text:

{
  "attacker_scores": {
    "plausibility": { "score": <0-5>, "rationale": "<one sentence>" },
    "specificity": { "score": <0-5>, "rationale": "<one sentence>" },
    "impact": { "score": <0-5>, "rationale": "<one sentence>" },
    "evasion": { "score": <0-5>, "rationale": "<one sentence>" },
    "dimension_total": <sum of 4 dimensions>,
    "bonus": <10 if attacker wins head-to-head, 0 otherwise>,
    "total": <dimension_total + bonus>
  },
  "defender_scores": {
    "effectiveness": { "score": <0-5>, "rationale": "<one sentence>" },
    "precision": { "score": <0-5>, "rationale": "<one sentence>" },
    "tradeoff_honesty": { "score": <0-5>, "rationale": "<one sentence>" },
    "residual_risk_awareness": { "score": <0-5>, "rationale": "<one sentence>" },
    "dimension_total": <sum of 4 dimensions>,
    "bonus": <10 if defender wins head-to-head, 0 otherwise>,
    "total": <dimension_total + bonus>
  },
  "head_to_head": {
    "winner": "<attacker or defender>",
    "explanation": "<2-3 sentences: Walk through whether the defense blocks this specific attack, citing relevant alignment research findings. Be specific about WHY the attack succeeds or fails against these defenses.>"
  },
  "verdict": {
    "winner": "<attacker or defender - whoever has the higher total>",
    "summary": "<One sentence: who won and why.>",
    "reasoning": "<One short paragraph, 4-6 sentences, explaining the matchup outcome, referencing alignment research where relevant, and ending with a concrete policy takeaway.>"
  },
  "improvements": {
    "stronger_attack": ["<point 1>", "<point 2>"],
    "stronger_defense": ["<point 1>", "<point 2>"]
  }
}`;
}

// ─── Components ──────────────────────────────────────────────────────────────

function GlowText({ children, color, style = {} }) {
  return (
    <span style={{ color, textShadow: `0 0 10px ${color}40, 0 0 20px ${color}20`, ...style }}>
      {children}
    </span>
  );
}

function ScoreBar({ score, maxScore = 5, color, label, rationale }) {
  const pct = (score / maxScore) * 100;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 700, color }}>{score}/{maxScore}</span>
      </div>
      <div style={{ height: 8, background: colors.cardBg, borderRadius: 4, overflow: "hidden", border: `1px solid ${colors.border}` }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 4,
          background: `linear-gradient(90deg, ${color}CC, ${color})`,
          boxShadow: `0 0 8px ${color}60`,
          transition: "width 0.8s ease-out"
        }} />
      </div>
      {rationale && <div style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 1.4 }}>{rationale}</div>}
    </div>
  );
}

function ApiKeyInput({ apiKey, setApiKey }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>API Key:</span>
      <input
        type={visible ? "text" : "password"}
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
        placeholder="sk-ant-..."
        style={{
          flex: 1, maxWidth: 360, padding: "6px 10px", fontFamily: fonts.mono, fontSize: 12,
          background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 4,
          color: colors.text, outline: "none"
        }}
      />
      <button onClick={() => setVisible(!visible)} style={{
        background: "none", border: `1px solid ${colors.border}`, borderRadius: 4,
        color: colors.textMuted, fontFamily: fonts.mono, fontSize: 11, padding: "5px 10px", cursor: "pointer"
      }}>{visible ? "Hide" : "Show"}</button>
    </div>
  );
}

function LoadingScreen({ scenario, attackerData, defenderData }) {
  const [lines, setLines] = useState([]);
  const [barWidth, setBarWidth] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    let idx = 0;
    setLines([LOADING_MESSAGES[0]]);
    intervalRef.current = setInterval(() => {
      idx++;
      if (idx < LOADING_MESSAGES.length) {
        setLines(prev => [...prev, LOADING_MESSAGES[idx]]);
        setBarWidth(((idx + 1) / LOADING_MESSAGES.length) * 100);
      }
    }, 2200);
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div style={{ padding: "24px 40px" }}>
      {/* Scenario header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, letterSpacing: 1 }}>SCENARIO {scenario?.id}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: colors.text, letterSpacing: 1 }}>{scenario?.title}</div>
      </div>

      {/* Submissions side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 960, margin: "0 auto 28px" }}>
        {/* Attacker summary */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.red}30`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2, marginBottom: 12, color: colors.red }}>ATTACKER</div>
          {ATTACKER_FIELDS.map(f => {
            const val = (attackerData?.[f.key] || "").trim();
            if (!val) return null;
            return (
              <div key={f.key} style={{ marginBottom: 8 }}>
                <div style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.textMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: colors.text, lineHeight: 1.5 }}>{val}</div>
              </div>
            );
          })}
        </div>
        {/* Defender summary */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.blue}30`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2, marginBottom: 12, color: colors.blue }}>DEFENDER</div>
          {DEFENDER_FIELDS.map(f => {
            const val = (defenderData?.[f.key] || "").trim();
            if (!val) return null;
            return (
              <div key={f.key} style={{ marginBottom: 8 }}>
                <div style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.textMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: colors.text, lineHeight: 1.5 }}>{val}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal + progress centered below */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: fonts.sans, fontSize: 20, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
          <GlowText color={colors.green}>Evaluating Matchup</GlowText>
        </div>
        <div style={{
          width: 480, maxWidth: "90%", background: colors.cardBg, border: `1px solid ${colors.border}`,
          borderRadius: 8, padding: 16, fontFamily: fonts.mono, fontSize: 12
        }}>
          {lines.map((line, i) => (
            <div key={i} style={{
              color: i === lines.length - 1 ? colors.green : colors.textMuted,
              marginBottom: 4, opacity: i === lines.length - 1 ? 1 : 0.6,
              animation: i === lines.length - 1 ? "pulse 1.5s ease-in-out infinite" : "none"
            }}>{line}</div>
          ))}
          <div style={{ marginTop: 10 }}>
            <span style={{ color: colors.textMuted, fontSize: 11 }}>_</span>
            <span style={{ animation: "blink 1s step-end infinite", color: colors.green }}>|</span>
          </div>
        </div>
        <div style={{ width: 480, maxWidth: "90%" }}>
          <div style={{ height: 4, background: colors.cardBg, borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${barWidth}%`, transition: "width 2s ease",
              background: `linear-gradient(90deg, ${colors.green}80, ${colors.green})`,
              boxShadow: `0 0 10px ${colors.green}40`
            }} />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}

// ─── Excel Paste Parser ──────────────────────────────────────────────────────
// Matches pasted label\tvalue rows to field keys using fuzzy label matching
function parseExcelPaste(text, fields) {
  const result = {};
  // Split on newlines, handle both \r\n and \n
  const lines = text.split(/\r?\n/).filter(l => l.trim());

  for (const line of lines) {
    // Split on first tab only (value may contain tabs)
    const tabIdx = line.indexOf("\t");
    if (tabIdx === -1) continue;
    const rawLabel = line.substring(0, tabIdx).trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
    const value = line.substring(tabIdx + 1).trim();
    if (!value) continue;

    // Find best matching field
    for (const field of fields) {
      const fieldLabel = field.label.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      if (rawLabel === fieldLabel || rawLabel.includes(fieldLabel) || fieldLabel.includes(rawLabel)) {
        result[field.key] = value;
        break;
      }
    }
  }

  // Fallback: if no labels matched but we have the right number of lines, assign by order
  if (Object.keys(result).length === 0 && lines.length >= fields.length) {
    fields.forEach((field, i) => {
      const line = lines[i];
      const tabIdx = line.indexOf("\t");
      const value = tabIdx !== -1 ? line.substring(tabIdx + 1).trim() : line.trim();
      if (value) result[field.key] = value;
    });
  }

  return result;
}

function SubmissionPanel({ fields, accentColor, data, setData, label }) {
  const filledCount = fields.filter(f => (data[f.key] || "").trim()).length;
  const allFilled = filledCount === fields.length;

  const handlePaste = useCallback((e) => {
    const text = e.clipboardData ? e.clipboardData.getData("text/plain") : e.target.value;
    if (!text.trim()) return;
    const parsed = parseExcelPaste(text, fields);
    if (Object.keys(parsed).length > 0) {
      e.preventDefault();
      setData(prev => ({ ...prev, ...parsed }));
    }
  }, [fields, setData]);

  const handleClear = useCallback(() => {
    const empty = {};
    fields.forEach(f => empty[f.key] = "");
    setData(prev => ({ ...prev, ...empty }));
  }, [fields, setData]);

  return (
    <div style={{ background: colors.cardBg, border: `1px solid ${accentColor}40`, borderRadius: 8, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>
          <GlowText color={accentColor}>{label}</GlowText>
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {allFilled && <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.green, letterSpacing: 1 }}>ALL FIELDS PARSED</span>}
          {filledCount > 0 && !allFilled && <span style={{ fontFamily: fonts.mono, fontSize: 10, color: "#FFAA00", letterSpacing: 1 }}>{filledCount}/{fields.length} FIELDS</span>}
          {filledCount > 0 && (
            <button onClick={handleClear} style={{
              background: "none", border: `1px solid ${colors.border}`, borderRadius: 4,
              color: colors.textMuted, fontFamily: fonts.mono, fontSize: 10, padding: "3px 8px", cursor: "pointer"
            }}>CLEAR</button>
          )}
        </div>
      </div>

      {/* Single paste area */}
      {!allFilled && (
        <textarea
          onPaste={handlePaste}
          onChange={() => {}}
          value=""
          placeholder={`Paste ${label.toLowerCase()} cells from Excel here (select all rows, Cmd+V)`}
          rows={4}
          style={{
            width: "100%", boxSizing: "border-box", padding: "16px",
            fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, lineHeight: 1.6,
            background: `${accentColor}06`, border: `2px dashed ${accentColor}30`, borderRadius: 6,
            outline: "none", resize: "none", marginBottom: 16, textAlign: "center"
          }}
          onFocus={e => { e.target.style.borderColor = accentColor + "60"; e.target.style.background = accentColor + "10"; }}
          onBlur={e => { e.target.style.borderColor = accentColor + "30"; e.target.style.background = accentColor + "06"; }}
        />
      )}

      {/* Parsed field previews */}
      {fields.map(f => {
        const val = (data[f.key] || "").trim();
        if (!val) return null;
        return (
          <div key={f.key} style={{ marginBottom: 10, padding: "8px 12px", background: colors.bg, borderRadius: 4, border: `1px solid ${colors.border}` }}>
            <div style={{ fontFamily: fonts.mono, fontSize: 10, color: accentColor, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>
              {f.label}
            </div>
            <div style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.text, lineHeight: 1.5 }}>
              {val}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Matrix Rain Background ──────────────────────────────────────────────────
const MATRIX_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>{}[]=/\\|~^;:.BREACH INJECT EXFIL PAYLOAD VECTOR AGENT PROMPT";

function MatrixRain() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const fontSize = 14;
    const columns = Math.floor(w / fontSize);
    const drops = Array(columns).fill(1);
    // Randomize initial positions so it doesn't all start from the top
    for (let i = 0; i < drops.length; i++) {
      drops[i] = Math.random() * h / fontSize * -1;
    }

    let animId;
    function draw() {
      ctx.fillStyle = "rgba(10, 14, 23, 0.06)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = fontSize + "px 'JetBrains Mono', 'Fira Code', monospace";

      for (let i = 0; i < drops.length; i++) {
        const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        // Alternate between red and cyan tints at low opacity
        const isRed = i % 3 === 0;
        ctx.fillStyle = isRed ? "rgba(255, 71, 87, 0.12)" : "rgba(0, 210, 255, 0.10)";
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > h && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.5 + Math.random() * 0.5;
      }
      animId = requestAnimationFrame(draw);
    }

    draw();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0
      }}
    />
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function SecurityArena() {
  const [screen, setScreen] = useState("scenarios"); // scenarios | submission | loading | results
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [attackerData, setAttackerData] = useState({});
  const [defenderData, setDefenderData] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showImprovements, setShowImprovements] = useState(false);
  // scenarioHistory: { [scenarioId]: { attackerData, defenderData, result } }
  const [scenarioHistory, setScenarioHistory] = useState({});
  // scoreboard: array of { scenarioId, scenarioTitle, attackerScores, defenderScores, winner }
  const [scoreboard, setScoreboard] = useState([]);

  const resetSubmission = useCallback(() => {
    const aData = {};
    ATTACKER_FIELDS.forEach(f => aData[f.key] = "");
    const dData = {};
    DEFENDER_FIELDS.forEach(f => dData[f.key] = "");
    setAttackerData(aData);
    setDefenderData(dData);
  }, []);

  const selectScenario = useCallback((scenario) => {
    setSelectedScenario(scenario);
    const history = scenarioHistory[scenario.id];
    if (history && history.result) {
      // Completed scenario: restore data and go straight to results
      setAttackerData(history.attackerData);
      setDefenderData(history.defenderData);
      setResult(history.result);
      setShowImprovements(false);
      setError(null);
      setScreen("results");
    } else {
      resetSubmission();
      setResult(null);
      setError(null);
      setShowImprovements(false);
      setScreen("submission");
    }
  }, [resetSubmission, scenarioHistory]);

  const allFieldsFilled = useCallback(() => {
    const aFilled = ATTACKER_FIELDS.every(f => (attackerData[f.key] || "").trim().length > 0);
    const dFilled = DEFENDER_FIELDS.every(f => (defenderData[f.key] || "").trim().length > 0);
    return aFilled && dFilled;
  }, [attackerData, defenderData]);

  const runArena = useCallback(async () => {
    setScreen("loading");
    setError(null);
    try {
      const prompt = buildJudgePrompt(selectedScenario, attackerData, defenderData);
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 32000,
          thinking: { type: "enabled", budget_tokens: 20000 },
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`API error ${response.status}: ${errBody.substring(0, 300)}`);
      }

      const data = await response.json();
      const textBlock = data.content.find(b => b.type === "text");
      if (!textBlock) throw new Error("No text block in API response.");

      let jsonStr = textBlock.text.replace(/```json\n?|```/g, "").trim();
      // Extract the outermost JSON object by finding balanced braces
      const firstBrace = jsonStr.indexOf("{");
      if (firstBrace === -1) throw new Error("No JSON object found in response.");
      let depth = 0;
      let inString = false;
      let escaped = false;
      let endIdx = -1;
      for (let i = firstBrace; i < jsonStr.length; i++) {
        const ch = jsonStr[i];
        if (escaped) { escaped = false; continue; }
        if (ch === "\\") { escaped = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === "{") depth++;
        else if (ch === "}") { depth--; if (depth === 0) { endIdx = i; break; } }
      }
      if (endIdx === -1) throw new Error("Malformed JSON in response.");
      jsonStr = jsonStr.substring(firstBrace, endIdx + 1);

      const parsed = JSON.parse(jsonStr);

      // Override winner based on total scores (higher score wins)
      const aTotal = parsed.attacker_scores.total;
      const dTotal = parsed.defender_scores.total;
      parsed.verdict.winner = aTotal > dTotal ? "attacker" : aTotal < dTotal ? "defender" : "tie";

      setResult(parsed);

      // Save to history for persistence
      setScenarioHistory(prev => ({
        ...prev,
        [selectedScenario.id]: { attackerData, defenderData, result: parsed }
      }));

      // Update scoreboard
      setScoreboard(prev => {
        const filtered = prev.filter(e => e.scenarioId !== selectedScenario.id);
        return [...filtered, {
          scenarioId: selectedScenario.id,
          scenarioTitle: selectedScenario.title,
          attackerScores: parsed.attacker_scores,
          defenderScores: parsed.defender_scores,
          winner: parsed.verdict.winner
        }];
      });

      setShowImprovements(false);
      setScreen("results");
    } catch (err) {
      setError(err.message);
      setScreen("submission");
    }
  }, [selectedScenario, attackerData, defenderData, apiKey]);

  // ─── Render: Scenario Selection ────────────────────────────────────────────
  if (screen === "scenarios") {
    const completedIds = scoreboard.map(e => e.scenarioId);
    return (
      <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: fonts.sans, padding: "32px 40px", position: "relative" }}>
        <MatrixRain />
        <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", margin: 0 }}>
            <GlowText color={colors.red}>AI Agent</GlowText>{" "}
            <span style={{ color: colors.text }}>Security</span>{" "}
            <GlowText color={colors.blue}>Arena</GlowText>
          </h1>
          <p style={{ color: colors.textMuted, fontFamily: fonts.mono, fontSize: 13, marginTop: 8 }}>Select a scenario to begin the matchup</p>
        </div>

        <div style={{ maxWidth: 480, margin: "0 auto 24px" }}>
          <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 900, margin: "0 auto 40px" }}>
          {SCENARIOS.map(s => {
            const done = completedIds.includes(s.id);
            return (
              <div
                key={s.id}
                onClick={() => selectScenario(s)}
                style={{
                  background: colors.cardBg, border: `1px solid ${done ? colors.green + "80" : colors.border}`,
                  borderRadius: 8, padding: 24, cursor: "pointer", position: "relative",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = done ? colors.green : colors.blue;
                  e.currentTarget.style.boxShadow = `0 0 16px ${done ? colors.green : colors.blue}30`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = done ? colors.green + "80" : colors.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {done && (
                  <span style={{
                    position: "absolute", top: 12, right: 12, fontFamily: fonts.mono, fontSize: 10,
                    color: colors.green, textTransform: "uppercase", letterSpacing: 1,
                    border: `1px solid ${colors.green}60`, borderRadius: 4, padding: "2px 8px"
                  }}>Complete</span>
                )}
                <div style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, marginBottom: 6, letterSpacing: 1 }}>
                  SCENARIO {s.id}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: colors.white }}>{s.title}</div>
                <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.5 }}>{s.summary}</div>
              </div>
            );
          })}
        </div>

        {/* Scoreboard */}
        {scoreboard.length > 0 && (
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <h2 style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: 2, textTransform: "uppercase", color: colors.textMuted, marginBottom: 12 }}>
              Cumulative Scoreboard
            </h2>
            <ScoreboardTable scoreboard={scoreboard} />
          </div>
        )}
        </div>
      </div>
    );
  }

  // ─── Render: Loading ───────────────────────────────────────────────────────
  if (screen === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: fonts.sans }}>
        <LoadingScreen scenario={selectedScenario} attackerData={attackerData} defenderData={defenderData} />
      </div>
    );
  }

  // ─── Render: Submission ────────────────────────────────────────────────────
  if (screen === "submission") {
    return (
      <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: fonts.sans, padding: "24px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <button onClick={() => setScreen("scenarios")} style={{
            background: "none", border: `1px solid ${colors.border}`, borderRadius: 6,
            color: colors.textMuted, fontFamily: fonts.mono, fontSize: 12, padding: "6px 14px",
            cursor: "pointer", letterSpacing: 1
          }}>
            &larr; SCENARIOS
          </button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, letterSpacing: 1 }}>SCENARIO {selectedScenario.id}</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 1 }}>{selectedScenario.title}</div>
          </div>
          <div style={{ width: 100 }} />
        </div>

        {error && (
          <div style={{
            background: `${colors.red}15`, border: `1px solid ${colors.red}40`, borderRadius: 8,
            padding: 16, marginBottom: 20, fontFamily: fonts.mono, fontSize: 12, color: colors.red
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Scenario Context */}
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted, letterSpacing: 1, marginBottom: 6 }}>AGENT</div>
              <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.6, marginBottom: 14 }}>{selectedScenario.agent}</div>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted, letterSpacing: 1, marginBottom: 6 }}>EXISTING CONTROL</div>
              <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.6 }}>{selectedScenario.existingControl}</div>
            </div>
            <div>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.red, letterSpacing: 1, marginBottom: 6 }}>THREAT ACTOR</div>
              <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.6, marginBottom: 14 }}>{selectedScenario.threatActor}</div>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, color: "#FFAA00", letterSpacing: 1, marginBottom: 6 }}>DATA AT STAKE</div>
              <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.6 }}>{selectedScenario.dataAtStake}</div>
            </div>
          </div>
        </div>

        {/* Two panels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          <SubmissionPanel fields={ATTACKER_FIELDS} accentColor={colors.red} data={attackerData} setData={setAttackerData} label="Attacker" />
          <SubmissionPanel fields={DEFENDER_FIELDS} accentColor={colors.blue} data={defenderData} setData={setDefenderData} label="Defender" />
        </div>

        {/* Run button */}
        <div style={{ textAlign: "center" }}>
          <button
            disabled={!allFieldsFilled() || !apiKey.trim()}
            onClick={runArena}
            style={{
              padding: "14px 48px", fontFamily: fonts.mono, fontSize: 16, fontWeight: 700,
              letterSpacing: 3, textTransform: "uppercase", borderRadius: 8, cursor: allFieldsFilled() && apiKey.trim() ? "pointer" : "not-allowed",
              background: allFieldsFilled() && apiKey.trim() ? `linear-gradient(135deg, ${colors.red}, ${colors.blue})` : colors.cardBg,
              color: allFieldsFilled() && apiKey.trim() ? colors.white : colors.textMuted,
              border: allFieldsFilled() && apiKey.trim() ? "none" : `1px solid ${colors.border}`,
              boxShadow: allFieldsFilled() && apiKey.trim() ? `0 0 20px ${colors.red}30, 0 0 20px ${colors.blue}30` : "none",
              transition: "all 0.3s ease"
            }}
          >
            Run Arena
          </button>
          {!apiKey.trim() && (
            <div style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
              Enter your API key on the scenarios screen to enable judging
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Render: Results ───────────────────────────────────────────────────────
  if (screen === "results" && result) {
    const isTie = result.verdict.winner === "tie";
    const isAttackerWin = result.verdict.winner === "attacker";
    const winColor = isTie ? colors.green : isAttackerWin ? colors.red : colors.blue;
    const winLabel = isTie ? "DRAW" : isAttackerWin ? "BREACH SUCCESSFUL" : "ATTACK NEUTRALIZED";
    const scoreExplain = isTie
      ? `Tied ${result.attacker_scores.total}-${result.defender_scores.total}`
      : isAttackerWin
        ? `Attacker ${result.attacker_scores.total} - Defender ${result.defender_scores.total}`
        : `Defender ${result.defender_scores.total} - Attacker ${result.attacker_scores.total}`;

    return (
      <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: fonts.sans, padding: "24px 40px", overflowY: "auto" }}>
        {/* Scenario Context (shown first for class discussion) */}
        <div style={{ maxWidth: 960, margin: "0 auto 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={() => setScreen("scenarios")} style={{
              background: "none", border: `1px solid ${colors.border}`, borderRadius: 6,
              color: colors.textMuted, fontFamily: fonts.mono, fontSize: 12, padding: "6px 14px",
              cursor: "pointer", letterSpacing: 1
            }}>
              &larr; SCENARIOS
            </button>
            <div style={{ fontFamily: fonts.mono, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: colors.textMuted }}>
              SCENARIO {selectedScenario.id}: {selectedScenario.title.toUpperCase()}
            </div>
            <div style={{ width: 100 }} />
          </div>
          <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted, letterSpacing: 1, marginBottom: 6 }}>AGENT</div>
                <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.6, marginBottom: 16 }}>{selectedScenario.agent}</div>
                <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted, letterSpacing: 1, marginBottom: 6 }}>EXISTING CONTROL</div>
                <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.6 }}>{selectedScenario.existingControl}</div>
              </div>
              <div>
                <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.red, letterSpacing: 1, marginBottom: 6 }}>THREAT ACTOR</div>
                <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.6, marginBottom: 16 }}>{selectedScenario.threatActor}</div>
                <div style={{ fontFamily: fonts.mono, fontSize: 10, color: "#FFAA00", letterSpacing: 1, marginBottom: 6 }}>DATA AT STAKE</div>
                <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.6 }}>{selectedScenario.dataAtStake}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Verdict Banner */}
        <div style={{
          textAlign: "center", padding: "28px 20px", marginBottom: 28, maxWidth: 960, margin: "0 auto 28px",
          border: `1px solid ${winColor}50`, borderRadius: 10,
          background: `linear-gradient(180deg, ${winColor}10, transparent)`,
          animation: "fadeIn 0.6s ease"
        }}>
          <div style={{
            fontSize: 42, fontWeight: 900, letterSpacing: 6, textTransform: "uppercase",
            color: winColor, textShadow: `0 0 20px ${winColor}50, 0 0 40px ${winColor}25`,
            marginBottom: 6
          }}>
            {winLabel}
          </div>
          <div style={{ fontFamily: fonts.mono, fontSize: 14, color: winColor, marginBottom: 10, letterSpacing: 1 }}>
            {scoreExplain}
          </div>
          <div style={{ fontSize: 15, color: colors.text, maxWidth: 700, margin: "0 auto", lineHeight: 1.5 }}>
            {result.verdict.summary}
          </div>
        </div>

        {/* Score Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32, maxWidth: 960, margin: "0 auto 32px" }}>
          {/* Attacker Scores */}
          <div style={{ background: colors.cardBg, border: `1px solid ${colors.red}40`, borderRadius: 8, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
              <h3 style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>
                <GlowText color={colors.red}>Attacker</GlowText>
              </h3>
              <span style={{ fontFamily: fonts.mono, fontSize: 24, fontWeight: 800, color: colors.red }}>
                {result.attacker_scores.total}<span style={{ fontSize: 14, color: colors.textMuted }}>/30</span>
              </span>
            </div>
            {ATTACKER_DIMENSIONS.map(dim => (
              <ScoreBar
                key={dim}
                score={result.attacker_scores[dim]?.score || 0}
                color={colors.red}
                label={DIMENSION_LABELS[dim]}
                rationale={result.attacker_scores[dim]?.rationale}
              />
            ))}
            {/* Bonus row */}
            <div style={{ marginTop: 8, padding: "8px 0", borderTop: `1px solid ${colors.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.green, letterSpacing: 1 }}>HEAD-TO-HEAD BONUS</span>
                <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 700, color: result.attacker_scores.bonus ? colors.green : colors.textMuted }}>
                  +{result.attacker_scores.bonus || 0}
                </span>
              </div>
              {result.head_to_head && result.head_to_head.winner === "attacker" && (
                <div style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{result.head_to_head.explanation}</div>
              )}
            </div>
          </div>

          {/* Defender Scores */}
          <div style={{ background: colors.cardBg, border: `1px solid ${colors.blue}40`, borderRadius: 8, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
              <h3 style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>
                <GlowText color={colors.blue}>Defender</GlowText>
              </h3>
              <span style={{ fontFamily: fonts.mono, fontSize: 24, fontWeight: 800, color: colors.blue }}>
                {result.defender_scores.total}<span style={{ fontSize: 14, color: colors.textMuted }}>/30</span>
              </span>
            </div>
            {DEFENDER_DIMENSIONS.map(dim => (
              <ScoreBar
                key={dim}
                score={result.defender_scores[dim]?.score || 0}
                color={colors.blue}
                label={DIMENSION_LABELS[dim]}
                rationale={result.defender_scores[dim]?.rationale}
              />
            ))}
            {/* Bonus row */}
            <div style={{ marginTop: 8, padding: "8px 0", borderTop: `1px solid ${colors.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.green, letterSpacing: 1 }}>HEAD-TO-HEAD BONUS</span>
                <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 700, color: result.defender_scores.bonus ? colors.green : colors.textMuted }}>
                  +{result.defender_scores.bonus || 0}
                </span>
              </div>
              {result.head_to_head && result.head_to_head.winner === "defender" && (
                <div style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{result.head_to_head.explanation}</div>
              )}
            </div>
          </div>
        </div>

        {/* Verdict Reasoning */}
        <div style={{
          background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 8,
          padding: 28, maxWidth: 960, margin: "0 auto 24px"
        }}>
          <h3 style={{ fontFamily: fonts.mono, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: colors.textMuted, marginTop: 0, marginBottom: 16 }}>
            Verdict Analysis
          </h3>
          <div style={{ fontSize: 14, color: colors.text, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
            {(result.verdict.reasoning || "No reasoning provided.").replace(/\\n/g, "\n")}
          </div>
        </div>

        {/* Improvements (collapsible) */}
        {result.improvements && (
          <div style={{
            background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 8,
            maxWidth: 960, margin: "0 auto 32px", overflow: "hidden"
          }}>
            <button
              onClick={() => setShowImprovements(!showImprovements)}
              style={{
                width: "100%", padding: "16px 28px", background: "none", border: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                cursor: "pointer", fontFamily: fonts.mono, fontSize: 13, letterSpacing: 2,
                textTransform: "uppercase", color: colors.textMuted
              }}
            >
              <span>What Would a Stronger Submission Look Like?</span>
              <span style={{ fontSize: 18, transition: "transform 0.2s", transform: showImprovements ? "rotate(180deg)" : "rotate(0)" }}>
                &#9662;
              </span>
            </button>
            {showImprovements && (
              <div style={{ padding: "0 28px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div>
                  <h4 style={{ fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1, marginBottom: 12 }}>
                    <GlowText color={colors.red}>A Stronger Attack Would...</GlowText>
                  </h4>
                  {(result.improvements.stronger_attack || []).map((pt, i) => (
                    <div key={i} style={{ fontSize: 13, color: colors.text, lineHeight: 1.6, marginBottom: 8, paddingLeft: 12, borderLeft: `2px solid ${colors.red}40` }}>
                      {pt}
                    </div>
                  ))}
                </div>
                <div>
                  <h4 style={{ fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1, marginBottom: 12 }}>
                    <GlowText color={colors.blue}>A Stronger Defense Would...</GlowText>
                  </h4>
                  {(result.improvements.stronger_defense || []).map((pt, i) => (
                    <div key={i} style={{ fontSize: 13, color: colors.text, lineHeight: 1.6, marginBottom: 8, paddingLeft: 12, borderLeft: `2px solid ${colors.blue}40` }}>
                      {pt}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, maxWidth: 960, margin: "0 auto 40px" }}>
          <button
            onClick={() => setScreen("scenarios")}
            style={{
              padding: "10px 28px", fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1,
              background: "none", border: `1px solid ${colors.border}`, borderRadius: 6,
              color: colors.textMuted, cursor: "pointer"
            }}
          >
            &larr; BACK TO SCENARIOS
          </button>
          <button
            onClick={() => { resetSubmission(); setResult(null); setShowImprovements(false); setScreen("submission"); }}
            style={{
              padding: "10px 28px", fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1,
              background: "none", border: `1px solid ${colors.blue}60`, borderRadius: 6,
              color: colors.blue, cursor: "pointer"
            }}
          >
            RUN AGAIN
          </button>
        </div>

        {/* Scoreboard */}
        {scoreboard.length > 0 && (
          <div style={{ maxWidth: 960, margin: "0 auto 40px" }}>
            <h3 style={{ fontFamily: fonts.mono, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: colors.textMuted, marginBottom: 12 }}>
              Cumulative Scoreboard
            </h3>
            <ScoreboardTable scoreboard={scoreboard} />
          </div>
        )}

        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    );
  }

  return null;
}

// ─── Scoreboard Table ────────────────────────────────────────────────────────
function ScoreboardTable({ scoreboard }) {
  // Build rows: for each scenario result, one attacker row and one defender row
  const rows = [];
  scoreboard.forEach(entry => {
    rows.push({
      scenarioId: entry.scenarioId,
      scenarioTitle: entry.scenarioTitle,
      role: "Attacker",
      color: colors.red,
      dimensions: ATTACKER_DIMENSIONS.map(d => entry.attackerScores[d]?.score || 0),
      total: entry.attackerScores.total || 0,
      won: (entry.attackerScores.total || 0) > (entry.defenderScores.total || 0)
    });
    rows.push({
      scenarioId: entry.scenarioId,
      scenarioTitle: entry.scenarioTitle,
      role: "Defender",
      color: colors.blue,
      dimensions: DEFENDER_DIMENSIONS.map(d => entry.defenderScores[d]?.score || 0),
      total: entry.defenderScores.total || 0,
      won: (entry.defenderScores.total || 0) > (entry.attackerScores.total || 0)
    });
  });

  // Sort by total descending
  rows.sort((a, b) => b.total - a.total);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fonts.mono, fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
            <th style={{ textAlign: "left", padding: "8px 12px", color: colors.textMuted, fontWeight: 600, letterSpacing: 1 }}>TEAM</th>
            <th style={{ textAlign: "center", padding: "8px 8px", color: colors.textMuted, fontWeight: 600 }}>D1</th>
            <th style={{ textAlign: "center", padding: "8px 8px", color: colors.textMuted, fontWeight: 600 }}>D2</th>
            <th style={{ textAlign: "center", padding: "8px 8px", color: colors.textMuted, fontWeight: 600 }}>D3</th>
            <th style={{ textAlign: "center", padding: "8px 8px", color: colors.textMuted, fontWeight: 600 }}>D4</th>
            <th style={{ textAlign: "center", padding: "8px 12px", color: colors.textMuted, fontWeight: 600 }}>TOTAL</th>
            <th style={{ textAlign: "center", padding: "8px 12px", color: colors.textMuted, fontWeight: 600 }}>RESULT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? colors.cardBg : colors.cardBgAlt }}>
              <td style={{ padding: "10px 12px" }}>
                <span style={{ color: row.color }}>S{row.scenarioId} {row.role}</span>
              </td>
              {row.dimensions.map((d, j) => (
                <td key={j} style={{ textAlign: "center", padding: "10px 8px", color: colors.text }}>{d}</td>
              ))}
              <td style={{ textAlign: "center", padding: "10px 12px", fontWeight: 700, color: row.color }}>{row.total}</td>
              <td style={{ textAlign: "center", padding: "10px 12px" }}>
                <span style={{
                  fontSize: 10, letterSpacing: 1, padding: "3px 8px", borderRadius: 4,
                  background: row.won ? `${colors.green}20` : `${colors.red}15`,
                  color: row.won ? colors.green : colors.red,
                  border: `1px solid ${row.won ? colors.green + "40" : colors.red + "40"}`
                }}>
                  {row.won ? "WIN" : "LOSS"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}