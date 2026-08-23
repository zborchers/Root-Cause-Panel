import { useState, useRef, useEffect } from "react";
import { SYSTEM_PROMPT } from "./systemPrompt.js";

const SANS = "'Plus Jakarta Sans','system-ui',sans-serif";
const SERIF = "'Crimson Text','Georgia',serif";

const c = {
  bg: "#faf8f4",
  bgHeader: "#f3f0e9",
  bgInput: "#ede8dd",
  border: "rgba(100,80,60,0.1)",
  borderMid: "rgba(100,80,60,0.18)",
  accent: "#2d5a3d",
  accentLight: "rgba(45,90,61,0.08)",
  accentMid: "rgba(45,90,61,0.18)",
  accentPop: "#c17f3a",
  textPrimary: "#1e1a16",
  textSecondary: "#5c5147",
  textMuted: "rgba(30,26,22,0.38)",
  userBubble: "#ede8dd",
  userBubbleBorder: "rgba(100,80,60,0.18)",
};

// ---- SCROLL HELPERS ----
// Carried over unchanged from the consumer app — the chat screen (after the
// panel generates) still needs reliable scroll-to-top-of-response behavior
// on step transitions and new messages landing. The intake side no longer
// needs any of this, since it's a single static page with no step
// transitions of its own.

function ensureHeaderVisible() {
  try {
    const headerEl = document.getElementById("app-header");
    if (!headerEl) return;
    const rect = headerEl.getBoundingClientRect();
    if (Math.round(rect.top) !== 0) {
      const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      const target = Math.max(0, currentScroll + rect.top);
      window.scrollTo({ top: target, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = target;
      document.body.scrollTop = target;
    }
  } catch {}
}

function formatMessage(content) {
  return <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.82 }}>{content}</div>;
}

// ---- PRACTICE CONFIG ----
// This is the one thing that changes between practice deployments. Every
// practice runs an identical fork of this file and the system prompt —
// intake fields, interpretive logic, token budget, none of it varies by
// practice. The only per-deployment edit is the practice's own name below,
// which is what "swap one file, five minutes" actually means in practice:
// one constant, not a branching config system. No logo, color, or copy
// customization beyond this is currently supported by design — see the
// earlier decision to keep the product identical across every practice
// rather than build per-practice customization into the template itself.
const PRACTICE_CONFIG = {
  name: "Practice Name Here",
};

function Header({ onClear }) {
  return (
    <div id="app-header" style={{ position: "fixed", top: 0, left: 0, right: 0, borderBottom: `1px solid ${c.border}`, padding: "1.25rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", background: c.bgHeader, zIndex: 50 }}>
      <div>
        <div style={{ fontSize: "19px", fontWeight: 700, color: c.textPrimary, fontFamily: SANS }}>{PRACTICE_CONFIG.name}</div>
        <div style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: c.accent, marginTop: "2px", fontFamily: SANS, fontWeight: 600 }}>Energetic Root Cause Panel</div>
      </div>
      {onClear && (
        <button
          onClick={() => {
            if (window.confirm("Clear this intake and start a new patient panel? This can't be undone.")) {
              onClear();
            }
          }}
          style={{ background: "transparent", border: `1px solid ${c.borderMid}`, borderRadius: "6px", padding: "7px 14px", cursor: "pointer", color: c.textMuted, fontSize: "12px", fontFamily: SANS, fontWeight: 600, letterSpacing: "0.02em" }}
        >
          New Patient
        </button>
      )}
    </div>
  );
}

function Disclaimer() {
  return (
    <div style={{ textAlign: "center", fontSize: "11px", color: c.textMuted, marginTop: "0.75rem", letterSpacing: "0.03em", fontFamily: SANS }}>
      Energetic interpretation for clinical reference — not a diagnostic instrument. Exercise independent clinical judgment.
    </div>
  );
}

// ---- REGION CONFIG ----
// Carried over unchanged from the consumer app's per-body-part form logic —
// this mapping of which regions get side/plane distinctions, and which
// quality-of-sensation options apply, doesn't change just because the
// intake is now single-page instead of step-by-step.

const REGION_OPTIONS = [
  "Head", "Neck", "Throat", "Mouth", "Shoulders", "Chest", "Heart",
  "Upper Back", "Lower Back", "Abdomen", "Gut", "Hips", "Pelvis",
  "Legs", "Knees", "Ankles", "Feet", "Arms", "Hands", "Skin", "Somewhere else",
];

const REGION_DISPLAY = {
  "Head": "head", "Neck": "neck", "Throat": "throat", "Mouth": "mouth", "Shoulders": "shoulder",
  "Chest": "chest", "Heart": "heart", "Upper Back": "upper back", "Lower Back": "lower back",
  "Abdomen": "abdomen", "Gut": "gut", "Hips": "hip", "Pelvis": "pelvis",
  "Legs": "leg", "Knees": "knee", "Ankles": "ankle", "Feet": "foot",
  "Arms": "arm", "Hands": "hand", "Skin": "skin", "Somewhere else": "the area noted",
};

const REGION_GROUP_CONFIG = {
  "Head": { side: true, plane: true, centered: true },
  "Neck": { side: true, plane: true, centered: true },
  "Throat": { side: false, plane: false, centered: false },
  "Mouth": { side: false, plane: false, centered: false },
  "Shoulders": { side: true, plane: true, centered: false },
  "Chest": { side: true, plane: false, centered: true },
  "Heart": { side: false, plane: false, centered: false },
  "Upper Back": { side: true, plane: false, centered: true },
  "Lower Back": { side: true, plane: false, centered: true },
  "Abdomen": { side: true, plane: false, centered: true },
  "Gut": { side: false, plane: false, centered: false },
  "Hips": { side: true, plane: true, centered: false },
  "Pelvis": { side: true, plane: false, centered: true },
  "Legs": { side: true, plane: true, centered: false },
  "Knees": { side: true, plane: true, centered: false },
  "Ankles": { side: true, plane: false, centered: false },
  "Feet": { side: true, plane: false, centered: false },
  "Arms": { side: true, plane: false, centered: false },
  "Hands": { side: true, plane: false, centered: false },
  "Skin": { side: false, plane: false, centered: false },
  "Somewhere else": { side: false, plane: false, centered: false },
};

const QUALITY_OPTIONS_DEFAULT = ["Sharp", "Dull ache", "Sore", "Burning", "Tight", "Stiff", "Throbbing", "Numb", "Cramping", "Tingling", "Swollen", "Bloating", "Pressure", "Heavy", "Weak"];
const QUALITY_OPTIONS_BY_REGION = {
  "Skin": ["Itchy", "Dry", "Flaky", "Rash", "Burning", "Tingling", "Tight", "Breakouts", "Redness", "Numb"],
};

function regionDisplayName(region) {
  return REGION_DISPLAY[region] || region.toLowerCase();
}

let uidCounter = 0;
function nextId() {
  uidCounter += 1;
  return `id_${Date.now()}_${uidCounter}`;
}

// ---- DIAGNOSES: repeatable field ----

function DiagnosesSection({ diagnoses, updateDiagnosis, addDiagnosis, removeDiagnosis }) {
  return (
    <div style={{ background: c.bgInput, border: `1.5px solid ${c.borderMid}`, borderRadius: "12px", padding: "24px 26px", marginBottom: "1.25rem" }}>
      <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: c.accent, marginBottom: "1rem", fontFamily: SANS }}>
        Diagnoses (optional)
      </div>
      {diagnoses.map((d, i) => (
        <div key={d.id} style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "flex-start" }}>
          <input
            value={d.name}
            onChange={e => updateDiagnosis(d.id, "name", e.target.value)}
            placeholder="Diagnosis name"
            style={{ flex: "1 1 40%", background: c.bg, border: `1px solid ${c.borderMid}`, borderRadius: "8px", padding: "10px 12px", fontSize: "15px", fontFamily: SERIF, color: c.textPrimary }}
          />
          <input
            value={d.detail}
            onChange={e => updateDiagnosis(d.id, "detail", e.target.value)}
            placeholder="Detail — how long, how it's progressed, etc. (optional)"
            style={{ flex: "1 1 50%", background: c.bg, border: `1px solid ${c.borderMid}`, borderRadius: "8px", padding: "10px 12px", fontSize: "15px", fontFamily: SERIF, color: c.textPrimary }}
          />
          <button
            onClick={() => removeDiagnosis(d.id)}
            aria-label="Remove diagnosis"
            style={{ background: "transparent", border: `1px solid ${c.borderMid}`, borderRadius: "6px", padding: "10px 12px", cursor: "pointer", color: c.textMuted, fontSize: "13px", fontFamily: SANS }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={addDiagnosis}
        style={{ background: "transparent", border: `1px dashed ${c.borderMid}`, borderRadius: "8px", padding: "9px 16px", cursor: "pointer", color: c.accent, fontSize: "13px", fontFamily: SANS, fontWeight: 600, marginTop: "4px" }}
      >
        + Add diagnosis
      </button>
    </div>
  );
}

// ---- SYMPTOMS: one block per added region, all visible on the same page ----

function RegionBlock({ entry, updateRegionOption, updateRegionDetail, removeRegion }) {
  const config = REGION_GROUP_CONFIG[entry.region] || { side: true, plane: true };
  const qualityOptions = QUALITY_OPTIONS_BY_REGION[entry.region] || QUALITY_OPTIONS_DEFAULT;
  const display = regionDisplayName(entry.region);

  const sideOptions = config.side ? (config.centered ? ["Left", "Right", "Centered"] : ["Left", "Right"]) : null;
  const bothSides = config.side && (entry.side || []).includes("Left") && (entry.side || []).includes("Right");

  const renderGroup = (label, key, options) => (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ fontSize: "13px", fontWeight: 700, color: c.textPrimary, marginBottom: "0.5rem", fontFamily: SANS }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {options.map(opt => {
          const selected = (entry[key] || []).includes(opt);
          return (
            <button
              key={opt}
              onClick={() => updateRegionOption(entry.id, key, opt)}
              style={{
                background: selected ? c.accent : c.bg,
                border: `1.5px solid ${selected ? c.accent : c.borderMid}`,
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "14px",
                color: selected ? "#fff" : c.textPrimary,
                cursor: "pointer",
                fontFamily: SERIF,
                fontWeight: selected ? 600 : 400,
              }}
            >
              {selected ? "✓ " : ""}{opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ background: c.bg, border: `1.5px solid ${c.borderMid}`, borderRadius: "12px", padding: "20px 22px", marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ fontSize: "17px", fontWeight: 700, color: c.textPrimary, fontFamily: SANS, textTransform: "capitalize" }}>{display}</div>
        <button
          onClick={() => removeRegion(entry.id)}
          style={{ background: "transparent", border: `1px solid ${c.borderMid}`, borderRadius: "6px", padding: "6px 10px", cursor: "pointer", color: c.textMuted, fontSize: "12px", fontFamily: SANS }}
        >
          Remove
        </button>
      </div>

      {sideOptions && renderGroup("Side", "side", sideOptions)}

      {bothSides ? (
        <>
          <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: c.accent, margin: "0.75rem 0 0.5rem" }}>Left {display}</div>
          {config.plane && renderGroup("Front / back", "left_plane", ["Front", "Back"])}
          {renderGroup("Sensation", "left_quality", qualityOptions)}
          {renderGroup("Pattern", "left_pattern", ["First time", "Comes and goes", "Constant / ongoing"])}
          <textarea
            value={entry.left_detail || ""}
            onChange={e => updateRegionDetail(entry.id, "left_detail", e.target.value)}
            placeholder={`Additional detail on the left ${display} (optional)`}
            rows={2}
            style={{ width: "100%", background: c.bgInput, border: `1px solid ${c.borderMid}`, borderRadius: "8px", padding: "10px 12px", fontSize: "14px", fontFamily: SERIF, color: c.textPrimary, marginBottom: "1rem", resize: "vertical" }}
          />
          <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: c.accent, margin: "0.75rem 0 0.5rem" }}>Right {display}</div>
          {config.plane && renderGroup("Front / back", "right_plane", ["Front", "Back"])}
          {renderGroup("Sensation", "right_quality", qualityOptions)}
          {renderGroup("Pattern", "right_pattern", ["First time", "Comes and goes", "Constant / ongoing"])}
          <textarea
            value={entry.right_detail || ""}
            onChange={e => updateRegionDetail(entry.id, "right_detail", e.target.value)}
            placeholder={`Additional detail on the right ${display} (optional)`}
            rows={2}
            style={{ width: "100%", background: c.bgInput, border: `1px solid ${c.borderMid}`, borderRadius: "8px", padding: "10px 12px", fontSize: "14px", fontFamily: SERIF, color: c.textPrimary, resize: "vertical" }}
          />
        </>
      ) : (
        <>
          {config.plane && renderGroup("Front / back", "plane", ["Front", "Back"])}
          {renderGroup("Sensation", "quality", qualityOptions)}
          {renderGroup("Pattern", "pattern", ["First time", "Comes and goes", "Constant / ongoing"])}
          <textarea
            value={entry.detail || ""}
            onChange={e => updateRegionDetail(entry.id, "detail", e.target.value)}
            placeholder="Additional detail — onset, what makes it better or worse, etc. (optional)"
            rows={2}
            style={{ width: "100%", background: c.bgInput, border: `1px solid ${c.borderMid}`, borderRadius: "8px", padding: "10px 12px", fontSize: "14px", fontFamily: SERIF, color: c.textPrimary, resize: "vertical" }}
          />
        </>
      )}
    </div>
  );
}

function SymptomsSection({ regions, addRegion, updateRegionOption, updateRegionDetail, removeRegion }) {
  const [picking, setPicking] = useState(false);
  const usedRegions = new Set(regions.map(r => r.region));

  return (
    <div style={{ background: c.bgInput, border: `1.5px solid ${c.borderMid}`, borderRadius: "12px", padding: "24px 26px", marginBottom: "1.25rem" }}>
      <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: c.accent, marginBottom: "1rem", fontFamily: SANS }}>
        Symptoms by Region
      </div>

      {regions.map(entry => (
        <RegionBlock
          key={entry.id}
          entry={entry}
          updateRegionOption={updateRegionOption}
          updateRegionDetail={updateRegionDetail}
          removeRegion={removeRegion}
        />
      ))}

      {picking ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "0.5rem" }}>
          {REGION_OPTIONS.filter(r => !usedRegions.has(r)).map(r => (
            <button
              key={r}
              onClick={() => { addRegion(r); setPicking(false); }}
              style={{ background: c.bg, border: `1.5px solid ${c.borderMid}`, borderRadius: "8px", padding: "8px 14px", fontSize: "14px", color: c.textPrimary, cursor: "pointer", fontFamily: SERIF }}
            >
              {r}
            </button>
          ))}
          <button
            onClick={() => setPicking(false)}
            style={{ background: "transparent", border: "none", color: c.textMuted, fontSize: "13px", fontFamily: SANS, cursor: "pointer", padding: "8px 4px" }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setPicking(true)}
          style={{ background: "transparent", border: `1px dashed ${c.borderMid}`, borderRadius: "8px", padding: "9px 16px", cursor: "pointer", color: c.accent, fontSize: "13px", fontFamily: SANS, fontWeight: 600 }}
        >
          + Add region
        </button>
      )}
    </div>
  );
}

function LifeContextSection({ lifeContext, setLifeContext }) {
  return (
    <div style={{ background: c.bgInput, border: `1.5px solid ${c.borderMid}`, borderRadius: "12px", padding: "24px 26px", marginBottom: "1.25rem" }}>
      <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: c.accent, marginBottom: "0.5rem", fontFamily: SANS }}>
        Life Context (optional)
      </div>
      <div style={{ fontSize: "13px", color: c.textMuted, fontFamily: SANS, fontStyle: "italic", marginBottom: "0.75rem" }}>
        Anything from the session worth carrying into the panel — timing, relationships, major transitions, what the patient said in their own words.
      </div>
      <textarea
        value={lifeContext}
        onChange={e => setLifeContext(e.target.value)}
        placeholder="Type here..."
        rows={4}
        style={{ width: "100%", background: c.bg, border: `1px solid ${c.borderMid}`, borderRadius: "8px", padding: "12px 14px", fontSize: "15px", fontFamily: SERIF, color: c.textPrimary, resize: "vertical" }}
      />
    </div>
  );
}

// ---- COMPILE INTAKE INTO THE TEXT SENT TO THE MODEL ----

function formatRegionEntry(entry) {
  const display = regionDisplayName(entry.region);
  const parts = [];
  const bothSides = (entry.side || []).includes("Left") && (entry.side || []).includes("Right");

  if (entry.side && entry.side.length) parts.push(`Side: ${entry.side.join(", ")}`);

  if (bothSides) {
    const sideParts = (prefix, label) => {
      const p = [];
      if (entry[`${prefix}_plane`]?.length) p.push(`Front/back: ${entry[`${prefix}_plane`].join(", ")}`);
      if (entry[`${prefix}_quality`]?.length) p.push(`Sensation: ${entry[`${prefix}_quality`].join(", ")}`);
      if (entry[`${prefix}_pattern`]?.length) p.push(`Pattern: ${entry[`${prefix}_pattern`].join(", ")}`);
      if (entry[`${prefix}_detail`]?.trim()) p.push(`Detail: ${entry[`${prefix}_detail`].trim()}`);
      if (p.length) parts.push(`${label} — ${p.join(" | ")}`);
    };
    sideParts("left", "Left side");
    sideParts("right", "Right side");
  } else {
    if (entry.plane && entry.plane.length) parts.push(`Front/back: ${entry.plane.join(", ")}`);
    if (entry.quality && entry.quality.length) parts.push(`Sensation: ${entry.quality.join(", ")}`);
    if (entry.pattern && entry.pattern.length) parts.push(`Pattern: ${entry.pattern.join(", ")}`);
    if (entry.detail && entry.detail.trim()) parts.push(`Detail: ${entry.detail.trim()}`);
  }

  return `Regarding the patient's ${display}:\n${parts.length ? parts.join(" | ") : "(no further detail provided)"}`;
}

function compilePanelIntake(diagnoses, regions, lifeContext) {
  const sections = [];

  const namedDiagnoses = diagnoses.filter(d => d.name.trim());
  if (namedDiagnoses.length) {
    sections.push(
      "Diagnoses reported for this patient:\n" +
      namedDiagnoses.map(d => `- ${d.name.trim()}${d.detail.trim() ? ` — ${d.detail.trim()}` : ""}`).join("\n")
    );
  }

  if (regions.length) {
    sections.push(regions.map(formatRegionEntry).join("\n\n"));
  }

  if (lifeContext.trim()) {
    sections.push(`Life context from the session:\n${lifeContext.trim()}`);
  }

  return sections.join("\n\n");
}

// Token budget for panel generation.
//
// This replaces the consumer app's "base covers one issue, flat increment
// per additional issue" formula, which doesn't fit how the panel is
// actually structured. That formula assumed a single flowing narrative
// where a primary issue could carry shared framing and additional issues
// rode on top of it more cheaply. The panel has no such hierarchy — every
// one of the seven chakra sections gets written every time, and a flagged
// chakra gets the same full depth as any other flagged chakra, not more or
// less depending on whether it was the first thing reported. So the right
// unit to scale against is "how many of the seven chakras will likely be
// flagged," not "how many issues were reported" treated as an ordered list.
//
// This also has to account for a cost the old formula never had to: even a
// single-issue panel still writes six quiet-chakra sections, each small but
// real ("nothing significant surfaces here" is still generated text, not
// free). That's a genuine floor cost that scales with 7 minus however many
// chakras end up flagged, independent of how simple the intake was.
//
// Flagged-chakra count can only be estimated before generation — a single
// diagnosis or region doesn't always map to exactly one chakra (see the two-
// layer autoimmune handling in the system prompt, for instance), and two
// different reported regions can sometimes land on the same chakra. Using
// the count of distinct diagnoses + regions as a proxy, capped at seven, is
// the same kind of reasonable approximation the consumer app already relied
// on for its own issue-count estimate. Since only actual generated tokens
// are billed, erring generous on the ceiling costs nothing and protects
// against a genuinely complex intake getting cut off mid-section.
function estimateFlaggedChakraCount(diagnoses, regions) {
  const diagnosisCount = diagnoses.filter(d => d.name.trim()).length;
  const regionCount = regions.length;
  return Math.min(7, Math.max(1, diagnosisCount + regionCount));
}

function tokensForPanel(diagnoses, regions) {
  const flaggedCount = estimateFlaggedChakraCount(diagnoses, regions);
  const quietCount = 7 - flaggedCount;

  // Opening framing plus the transitions between seven sections.
  const BASE_OVERHEAD = 500;
  // Per flagged chakra: real, substantive paragraphs plus a folded-in
  // guiding question — deliberately generous, since the standard set for
  // this tool is at least as deep as the original single-issue reading
  // (which used roughly this much on its own), and ideally more.
  const TOKENS_PER_FLAGGED_CHAKRA = 2800;
  // Per quiet chakra: a sentence or two, honestly brief by design.
  const TOKENS_PER_QUIET_CHAKRA = 150;
  // Safety ceiling — comfortably above the natural max (all seven flagged
  // deeply) to leave room for unusually verbose or multi-layered diagnosis
  // handling, without requesting an unreasonably large ceiling by default.
  const CEILING = 23000;

  const estimate = BASE_OVERHEAD
    + flaggedCount * TOKENS_PER_FLAGGED_CHAKRA
    + quietCount * TOKENS_PER_QUIET_CHAKRA;

  return Math.min(estimate, CEILING);
}

// ---- MAIN INTAKE SCREEN ----

function PanelIntakeForm({ diagnoses, regions, lifeContext, loading,
  addDiagnosis, updateDiagnosis, removeDiagnosis,
  addRegion, updateRegionOption, updateRegionDetail, removeRegion,
  setLifeContext, submitIntake }) {

  const hasAnyInput = diagnoses.some(d => d.name.trim()) || regions.length > 0;

  return (
    <div style={{ width: "100%", maxWidth: "760px", margin: "1.75rem auto", padding: "0 1.5rem", boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "28px", fontWeight: 800, color: c.textPrimary, fontFamily: SANS, letterSpacing: "-0.02em" }}>
          New Patient Panel
        </div>
        <div style={{ fontSize: "15px", color: c.textSecondary, fontFamily: SERIF, marginTop: "0.5rem" }}>
          Enter what was gathered from the session. All fields are optional except at least one diagnosis or region.
        </div>
      </div>

      <DiagnosesSection diagnoses={diagnoses} updateDiagnosis={updateDiagnosis} addDiagnosis={addDiagnosis} removeDiagnosis={removeDiagnosis} />
      <SymptomsSection regions={regions} addRegion={addRegion} updateRegionOption={updateRegionOption} updateRegionDetail={updateRegionDetail} removeRegion={removeRegion} />
      <LifeContextSection lifeContext={lifeContext} setLifeContext={setLifeContext} />

      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
        {!hasAnyInput && (
          <div style={{ fontSize: "13px", color: c.textMuted, fontFamily: SANS, fontStyle: "italic", marginBottom: "0.75rem" }}>
            Add at least one diagnosis or region before generating the panel.
          </div>
        )}
        <button
          onClick={submitIntake}
          disabled={loading || !hasAnyInput}
          style={{
            background: (loading || !hasAnyInput) ? c.accentMid : c.accent,
            border: "none", borderRadius: "8px", padding: "14px 32px",
            cursor: (loading || !hasAnyInput) ? "default" : "pointer",
            color: (loading || !hasAnyInput) ? c.textMuted : "#fff",
            fontSize: "15px", fontFamily: SANS, fontWeight: 700, letterSpacing: "0.03em",
          }}
        >
          {loading ? "Generating Panel…" : "Generate Panel"}
        </button>
      </div>
      <Disclaimer />
    </div>
  );
}

// ---- SIMPLE CHAT INPUT (unchanged from consumer app, for the follow-up conversation) ----

function SimpleChatInput({ value, onChange, onSubmit, placeholder, loading, handleTextKeyDown, sendLabel }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: c.bgInput, border: `1px solid ${c.borderMid}`, borderRadius: "10px", padding: "10px 14px" }}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleTextKeyDown(onSubmit)}
        placeholder={placeholder}
        rows={2}
        autoFocus
        style={{ background: "transparent", border: "none", outline: "none", color: c.textPrimary, fontSize: "18px", fontFamily: SERIF, lineHeight: 1.6, resize: "none", width: "100%" }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onSubmit}
          disabled={!value.trim() || loading}
          style={{ background: value.trim() && !loading ? c.accent : c.accentMid, border: "none", borderRadius: "4px", padding: "7px 18px", cursor: value.trim() && !loading ? "pointer" : "default", color: value.trim() && !loading ? "#fff" : c.textMuted, fontSize: "13px", fontFamily: SANS, fontWeight: 700, letterSpacing: "0.04em" }}
        >
          {sendLabel || "Send \u2192"}
        </button>
      </div>
    </div>
  );
}

// ---- TRANSCRIPT ----
// Structurally similar to the consumer app's transcript renderer, but with
// the donation note and accuracy note removed entirely — both were written
// for an individual reading their own reading (a pitch for support, a
// reassurance about imprecision aimed at a first-person reader). Neither
// has a place in a practitioner-facing clinical document. Confirmed clean
// as of the consumer-facing-elements pass: no isDonationNote/isAccuracyNote
// handling exists anywhere in this file.

function Transcript({ messages, loading, messagesEndRef, lastMessageRef, scrollContainerRef, ctaSlot, loadingLabel, copyReadingText, downloadReadingText, copiedIndex }) {
  let lastRealIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (!messages[i].hidden && !messages[i].localOnly) { lastRealIndex = i; break; }
  }
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", maxWidth: "700px", width: "100%", margin: "0 auto" }}>
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: "auto", padding: "0 1.5rem" }}>
        <div style={{ paddingTop: "2rem" }}>
          {messages.map((msg, i) => msg.hidden ? null : (
            <div key={i} ref={i === lastRealIndex ? lastMessageRef : null} style={{ marginBottom: "2rem" }}>
              {msg.role === "user" ? (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ background: c.userBubble, border: `1px solid ${c.userBubbleBorder}`, borderRadius: "14px 14px 2px 14px", padding: "12px 18px", maxWidth: "85%", fontSize: "15px", lineHeight: 1.65, color: c.textSecondary, whiteSpace: "pre-wrap", fontFamily: SERIF }}>
                    {msg.display || msg.content}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: c.accentLight, border: `1px solid ${c.borderMid}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: c.accent, flexShrink: 0, marginTop: "2px", fontFamily: SANS }}>&#10022;</div>
                    <div style={{ flex: 1, fontSize: "17px", color: c.textPrimary, fontFamily: SERIF }}>{formatMessage(msg.content)}</div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "0.9rem", marginLeft: "40px" }}>
                    <button onClick={() => copyReadingText(msg.content, i)} style={{ background: "transparent", border: `1px solid ${c.borderMid}`, borderRadius: "6px", padding: "6px 14px", fontFamily: SANS, fontSize: "12px", fontWeight: 600, color: c.textSecondary, cursor: "pointer", letterSpacing: "0.02em" }}>
                      {copiedIndex === i ? "Copied ✓" : "Copy"}
                    </button>
                    <button onClick={() => downloadReadingText(msg.content, msg.readingLabel || "panel")} style={{ background: "transparent", border: `1px solid ${c.borderMid}`, borderRadius: "6px", padding: "6px 14px", fontFamily: SANS, fontSize: "12px", fontWeight: 600, color: c.textSecondary, cursor: "pointer", letterSpacing: "0.02em" }}>
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "2rem" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: c.accentLight, border: `1px solid ${c.borderMid}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: c.accent, flexShrink: 0 }}>&#10022;</div>
              <div style={{ paddingTop: "6px" }}>
                {loadingLabel && <div style={{ fontSize: "13px", color: c.textMuted, fontFamily: SANS, marginBottom: "6px" }}>{loadingLabel}</div>}
                <div style={{ display: "flex", gap: "5px" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.accent, animation: `panel-pulse 1.2s ease-in-out ${i * 0.2}s infinite`, opacity: 0.45 }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} style={{ paddingBottom: "1rem" }} />
        </div>
      </div>
      {ctaSlot && (
        <div style={{ flexShrink: 0, background: c.bg, borderTop: `1px solid ${c.border}`, padding: "1rem 1.5rem 1.25rem" }}>
          {ctaSlot}
        </div>
      )}
    </div>
  );
}

// ---- MAIN COMPONENT ----

export default function PanelInterpreter() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  // step: 'intake' (the single-page form) -> 'chat' (panel result, then
  // open-ended follow-up conversation). Same two-stage shape as the
  // consumer app's tier1 -> chat, just renamed since "tier1" was a
  // wizard-specific term that no longer applies.
  const [step, setStep] = useState("intake");

  const [diagnoses, setDiagnoses] = useState([{ id: nextId(), name: "", detail: "" }]);
  const [regions, setRegions] = useState([]);
  const [lifeContext, setLifeContext] = useState("");
  const [chatDraft, setChatDraft] = useState("");

  const messagesEndRef = useRef(null);
  const lastMessageRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // NOTE ON PERSISTENCE: the consumer app persists messages/step to
  // localStorage so a person can leave and come back to their own reading.
  // That's the wrong default for a practitioner tool used on patient after
  // patient — carrying one patient's intake into the next patient's session
  // is a real risk, not a convenience. This version deliberately does NOT
  // persist to localStorage at all; "New Patient" (or a fresh page load)
  // always starts clean. Revisit only if per-practitioner session recovery
  // (e.g. accidental tab close mid-panel) turns out to be worth the
  // cross-patient-leakage risk — if so, it should be explicit and cleared
  // immediately after a panel is generated, not left sitting.

  useEffect(() => {
    const reset = () => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch {}
      ensureHeaderVisible();
    };
    reset();
    const raf = requestAnimationFrame(reset);
    const timers = [30, 60, 100, 200, 350, 500].map(delay => setTimeout(reset, delay));
    return () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); };
  }, [step, messages.length]);

  const copyReadingText = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(prev => (prev === index ? null : prev)), 2000);
    }).catch(() => {});
  };

  const downloadReadingText = (text, label) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = (label || "panel").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".txt";
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  async function callAPI(newMessages, maxTokens) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: maxTokens || 6000,
        system: SYSTEM_PROMPT,
        messages: newMessages.filter(m => !m.localOnly).map(({ role, content }) => ({ role, content })),
      }),
    });
    const data = await response.json();
    return data.content?.find(b => b.type === "text")?.text
      || "Something went wrong. Please try again.";
  }

  // ---- DIAGNOSES HANDLERS ----
  const addDiagnosis = () => setDiagnoses(prev => [...prev, { id: nextId(), name: "", detail: "" }]);
  const updateDiagnosis = (id, field, value) => setDiagnoses(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  const removeDiagnosis = (id) => setDiagnoses(prev => prev.filter(d => d.id !== id));

  // ---- REGIONS HANDLERS ----
  const addRegion = (region) => setRegions(prev => [...prev, { id: nextId(), region }]);
  const removeRegion = (id) => setRegions(prev => prev.filter(r => r.id !== id));
  const updateRegionOption = (id, key, option) => setRegions(prev => prev.map(r => {
    if (r.id !== id) return r;
    const current = r[key] || [];
    const next = current.includes(option) ? current.filter(o => o !== option) : [...current, option];
    return { ...r, [key]: next };
  }));
  const updateRegionDetail = (id, key, value) => setRegions(prev => prev.map(r => r.id === id ? { ...r, [key]: value } : r));

  // ---- SUBMIT INTAKE -> GENERATE PANEL ----
  const submitIntake = async () => {
    const hasAnyInput = diagnoses.some(d => d.name.trim()) || regions.length > 0;
    if (!hasAnyInput || loading) return;

    setLoading(true);
    const compiled = compilePanelIntake(diagnoses, regions, lifeContext);
    const userMsg = {
      role: "user",
      content: `Here is the intake for a new patient panel:\n\n${compiled}\n\nGenerate the full seven-chakra Energetic Root Cause Panel based on this intake.`,
      display: compiled,
      hidden: true,
    };
    const newMessages = [userMsg];
    setMessages(newMessages);
    try {
      const text = await callAPI(newMessages, tokensForPanel(diagnoses, regions));
      setMessages([...newMessages, { role: "assistant", content: text, isReading: true, readingLabel: "Energetic Root Cause Panel" }]);
      setStep("chat");
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "There was a connection error. Please try again." }]);
    }
    setLoading(false);
  };

  const sendChatMessage = async (userMsg) => {
    const newMessages = [...messages, userMsg];
    setLoading(true);
    setMessages(newMessages);
    try {
      const text = await callAPI(newMessages, 8000);
      setMessages(prev => [...prev, { role: "assistant", content: text }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "There was a connection error. Please try again." }]);
    }
    setLoading(false);
  };

  const submitChatMessage = () => {
    const trimmed = chatDraft.trim();
    if (!trimmed || loading) return;
    setChatDraft("");
    sendChatMessage({ role: "user", content: trimmed, display: trimmed });
  };

  const handleTextKeyDown = (submitFn) => (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitFn(); }
  };

  const handleNewPatient = () => {
    setMessages([]);
    setStep("intake");
    setDiagnoses([{ id: nextId(), name: "", detail: "" }]);
    setRegions([]);
    setLifeContext("");
    setChatDraft("");
  };

  // ---- RENDER: INTAKE ----
  if (step === "intake" && !loading) {
    return (
      <div style={{ minHeight: "100vh", background: c.bg, color: c.textPrimary, fontFamily: SERIF, display: "flex", flexDirection: "column", paddingTop: "80px" }}>
        <Header onClear={null} />
        <PanelIntakeForm
          diagnoses={diagnoses} regions={regions} lifeContext={lifeContext} loading={loading}
          addDiagnosis={addDiagnosis} updateDiagnosis={updateDiagnosis} removeDiagnosis={removeDiagnosis}
          addRegion={addRegion} updateRegionOption={updateRegionOption} updateRegionDetail={updateRegionDetail} removeRegion={removeRegion}
          setLifeContext={setLifeContext} submitIntake={submitIntake}
        />
        <style>{`* { box-sizing: border-box; overflow-anchor: none; } body { margin: 0; } textarea::placeholder, input::placeholder { color: rgba(30,26,22,0.3); }`}</style>
      </div>
    );
  }

  // ---- RENDER: PANEL RESULT + FOLLOW-UP CHAT ----
  return (
    <div style={{ height: "100vh", overflow: "hidden", background: c.bg, color: c.textPrimary, fontFamily: SERIF, display: "flex", flexDirection: "column", paddingTop: "80px" }}>
      <Header onClear={handleNewPatient} />
      <Transcript
        messages={messages} loading={loading} messagesEndRef={messagesEndRef} lastMessageRef={lastMessageRef}
        scrollContainerRef={scrollContainerRef} copyReadingText={copyReadingText} downloadReadingText={downloadReadingText} copiedIndex={copiedIndex}
        loadingLabel={loading && messages.length <= 1 ? "Generating the panel…" : undefined}
        ctaSlot={
          <>
            <SimpleChatInput
              value={chatDraft} onChange={setChatDraft} onSubmit={submitChatMessage}
              placeholder="Ask a follow-up — go deeper on a chakra, explore a connection, talk through approach..."
              loading={loading} handleTextKeyDown={handleTextKeyDown}
            />
            <Disclaimer />
          </>
        }
      />
      <style>{`
        @keyframes panel-pulse { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 0.8; transform: scale(1); } }
        textarea::placeholder, input::placeholder { color: rgba(30,26,22,0.3); }
        * { box-sizing: border-box; overflow-anchor: none; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}
