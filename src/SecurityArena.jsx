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
  return `You are an expert AI security evaluator acting as the judge in an "AI Agent Security Arena" exercise for graduate-level AI policy students. You must evaluate a prompt injection attack against a defensive control in the context of a specific government AI agent scenario.

SCENARIO: ${scenario.title}

AGENT DESCRIPTION: ${scenario.agent}

AGENT CAPABILITIES:
${scenario.capabilities.map(c => "- " + c).join("\n")}

EXISTING SECURITY CONTROL: ${scenario.existingControl}

THREAT ACTOR: ${scenario.threatActor}

DATA AT STAKE: ${scenario.dataAtStake}

---

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

---

SCORING RUBRIC:

ATTACKER DIMENSIONS (1-10 each):
1. Plausibility: Could this attack realistically happen during normal agent operations? Does the attack vector align with how the agent actually ingests external content?
2. Specificity: How precisely did they identify the injection point and craft the payload? Is the injected instruction concrete enough to actually work, or is it hand-wavy?
3. Impact: How severe is the damage if the attack succeeds? Does it reach the highest-value data, or only low-sensitivity information?
4. Evasion: How well does the attack circumvent the existing security control? Does it directly address the stated control, or ignore it?

DEFENDER DIMENSIONS (1-10 each):
1. Effectiveness: Does this control actually block the relevant class of attacks? Would it stop a well-crafted prompt injection through the identified attack surface?
2. Precision: Is the control targeted and surgical, or does it cripple agent functionality? A control that "turns off the agent" scores low here.
3. Tradeoff Honesty: Did they acknowledge what capability or efficiency the agent loses? Honest assessment of costs shows sophisticated thinking.
4. Residual Risk Awareness: Did they identify what their control does NOT stop? No single control stops everything; acknowledging gaps shows maturity.

JUDGING INSTRUCTIONS:
- Score strictly. A 10/10 should be rare and genuinely exceptional.
- Explain reasoning in plain language accessible to MBA/policy students, not security engineers.
- Consider whether the attack is actually feasible given the agent's stated capabilities. Do not give credit for attacks that require capabilities the agent does not have.
- Consider whether the defense is actually implementable. Do not give credit for vague "just add more security" answers.
- For the head-to-head verdict, reason step by step: given THIS specific attack and THIS specific defense, does the defense stop the attack? This is binary. A team can score well on the rubric but still lose if their specific play does not counter the opponent's.
- Each rationale should be exactly one sentence.
- The verdict reasoning should be 2-3 paragraphs.

Respond ONLY with a JSON object in this exact format, no other text, no markdown fences:

{
  "attacker_scores": {
    "plausibility": { "score": <1-10>, "rationale": "<one sentence>" },
    "specificity": { "score": <1-10>, "rationale": "<one sentence>" },
    "impact": { "score": <1-10>, "rationale": "<one sentence>" },
    "evasion": { "score": <1-10>, "rationale": "<one sentence>" },
    "total": <sum>
  },
  "defender_scores": {
    "effectiveness": { "score": <1-10>, "rationale": "<one sentence>" },
    "precision": { "score": <1-10>, "rationale": "<one sentence>" },
    "tradeoff_honesty": { "score": <1-10>, "rationale": "<one sentence>" },
    "residual_risk_awareness": { "score": <1-10>, "rationale": "<one sentence>" },
    "total": <sum>
  },
  "verdict": {
    "winner": "<attacker or defender>",
    "summary": "<One sentence: who won and why.>",
    "reasoning": "<2-3 paragraphs explaining the matchup dynamics.>"
  },
  "improvements": {
    "stronger_attack": ["<point 1>", "<point 2>", "<point 3>"],
    "stronger_defense": ["<point 1>", "<point 2>", "<point 3>"]
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

function ScoreBar({ score, maxScore = 10, color, label, rationale }) {
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

function LoadingScreen() {
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
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "80vh", gap: 32
    }}>
      <div style={{ fontFamily: fonts.sans, fontSize: 28, fontWeight: 700, color: colors.text, letterSpacing: 2, textTransform: "uppercase" }}>
        <GlowText color={colors.green}>Evaluating Matchup</GlowText>
      </div>
      <div style={{
        width: 520, maxWidth: "90%", background: colors.cardBg, border: `1px solid ${colors.border}`,
        borderRadius: 8, padding: 24, fontFamily: fonts.mono, fontSize: 13
      }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            color: i === lines.length - 1 ? colors.green : colors.textMuted,
            marginBottom: 6, opacity: i === lines.length - 1 ? 1 : 0.6,
            animation: i === lines.length - 1 ? "pulse 1.5s ease-in-out infinite" : "none"
          }}>{line}</div>
        ))}
        <div style={{ marginTop: 16 }}>
          <span style={{ color: colors.textMuted, fontSize: 11 }}>_</span>
          <span style={{ animation: "blink 1s step-end infinite", color: colors.green }}>|</span>
        </div>
      </div>
      <div style={{ width: 520, maxWidth: "90%" }}>
        <div style={{ height: 4, background: colors.cardBg, borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${barWidth}%`, transition: "width 2s ease",
            background: `linear-gradient(90deg, ${colors.green}80, ${colors.green})`,
            boxShadow: `0 0 10px ${colors.green}40`
          }} />
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
    resetSubmission();
    setResult(null);
    setError(null);
    setShowImprovements(false);
    setScreen("submission");
  }, [resetSubmission]);

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
      // Try to find JSON object if there's preamble
      const jsonStart = jsonStr.indexOf("{");
      const jsonEnd = jsonStr.lastIndexOf("}");
      if (jsonStart > 0 || jsonEnd < jsonStr.length - 1) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }

      const parsed = JSON.parse(jsonStr);
      setResult(parsed);

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
      <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: fonts.sans, padding: "32px 40px" }}>
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
    );
  }

  // ─── Render: Loading ───────────────────────────────────────────────────────
  if (screen === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: fonts.sans }}>
        <LoadingScreen />
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
    const isAttackerWin = result.verdict.winner === "attacker";
    const winColor = isAttackerWin ? colors.red : colors.blue;
    const winLabel = isAttackerWin ? "BREACH SUCCESSFUL" : "ATTACK NEUTRALIZED";

    return (
      <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: fonts.sans, padding: "24px 40px", overflowY: "auto" }}>
        {/* Verdict Banner */}
        <div style={{
          textAlign: "center", padding: "28px 20px", marginBottom: 28,
          border: `1px solid ${winColor}50`, borderRadius: 10,
          background: `linear-gradient(180deg, ${winColor}10, transparent)`,
          animation: "fadeIn 0.6s ease"
        }}>
          <div style={{
            fontSize: 42, fontWeight: 900, letterSpacing: 6, textTransform: "uppercase",
            color: winColor, textShadow: `0 0 20px ${winColor}50, 0 0 40px ${winColor}25`,
            marginBottom: 10
          }}>
            {winLabel}
          </div>
          <div style={{ fontSize: 16, color: colors.text, maxWidth: 700, margin: "0 auto", lineHeight: 1.5 }}>
            {result.verdict.summary}
          </div>
        </div>

        {/* Scenario label */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, letterSpacing: 1 }}>
            SCENARIO {selectedScenario.id}: {selectedScenario.title.toUpperCase()}
          </span>
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
                {result.attacker_scores.total}<span style={{ fontSize: 14, color: colors.textMuted }}>/40</span>
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
          </div>

          {/* Defender Scores */}
          <div style={{ background: colors.cardBg, border: `1px solid ${colors.blue}40`, borderRadius: 8, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
              <h3 style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>
                <GlowText color={colors.blue}>Defender</GlowText>
              </h3>
              <span style={{ fontFamily: fonts.mono, fontSize: 24, fontWeight: 800, color: colors.blue }}>
                {result.defender_scores.total}<span style={{ fontSize: 14, color: colors.textMuted }}>/40</span>
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
            {result.verdict.reasoning}
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
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 40, maxWidth: 960, margin: "0 auto 40px" }}>
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
            onClick={() => { resetSubmission(); setResult(null); setScreen("submission"); }}
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
      won: entry.winner === "attacker"
    });
    rows.push({
      scenarioId: entry.scenarioId,
      scenarioTitle: entry.scenarioTitle,
      role: "Defender",
      color: colors.blue,
      dimensions: DEFENDER_DIMENSIONS.map(d => entry.defenderScores[d]?.score || 0),
      total: entry.defenderScores.total || 0,
      won: entry.winner === "defender"
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