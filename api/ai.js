// =====================================================================
// LernPilot – KI-Endpunkt (Vercel Serverless Function)
// Liegt unter /api/ai und wird vom Frontend per POST aufgerufen.
// Der API-Key bleibt serverseitig (Vercel-Umgebungsvariable ANTHROPIC_API_KEY).
//
//   action "plan" -> erzeugt einen Lernplan (blocks) aus den Lernzielen
//   action "quiz" -> erzeugt Karteikarten (cards) aus den Lernzielen
//
// Einrichtung: in Vercel unter Project Settings -> Environment Variables
//   ANTHROPIC_API_KEY = sk-ant-...   (von console.anthropic.com)
// =====================================================================

// Modell – günstig & schnell. Für mehr Qualität: "claude-sonnet-4-6"
const MODEL = "claude-haiku-4-5-20251001";
const API_URL = "https://api.anthropic.com/v1/messages";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Nur POST erlaubt." });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY ist nicht gesetzt (Vercel Environment Variables)." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const action = body.action;

  let system, user, maxTokens;
  if (action === "plan") {
    ({ system, user, maxTokens } = buildPlanPrompt(body));
  } else if (action === "quiz") {
    ({ system, user, maxTokens } = buildQuizPrompt(body));
  } else {
    res.status(400).json({ error: "Unbekannte action (erwartet 'plan' oder 'quiz')." });
    return;
  }

  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }]
      })
    });

    if (!r.ok) {
      const t = await r.text();
      res.status(502).json({ error: "KI-Aufruf fehlgeschlagen", detail: t.slice(0, 500) });
      return;
    }

    const data = await r.json();
    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n");

    const parsed = extractJson(text);
    if (!parsed) {
      res.status(502).json({ error: "KI-Antwort war kein gültiges JSON.", raw: text.slice(0, 500) });
      return;
    }
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Serverfehler", detail: String(err).slice(0, 500) });
  }
};

// ---------------------------------------------------------------------
function buildPlanPrompt(b) {
  const e = b.exam || {};
  const heute = b.heute || "";
  const ziele = (e.lernziele || "").trim();
  const system =
    "Du bist ein erfahrener Lerncoach. Du erstellst realistische, lernpsychologisch sinnvolle Lernpläne. " +
    "Antworte AUSSCHLIESSLICH mit gültigem JSON ohne Markdown, ohne Code-Fences, ohne Erklärungstext.";
  const user =
`Erstelle einen Lernplan für eine Prüfung.

Fach: ${e.fach || ""}
Prüfungsdatum: ${e.datum || ""}
Heute: ${heute}
Wunschnote (Schweiz, 6=beste, 4=bestanden): ${e.wunschnote}
Schwierigkeit (1 leicht – 6 sehr schwer): ${e.schwierigkeit}
Bevorzugter Lerntyp: ${e.lerntyp}
Maximale Lernzeit pro Tag (Stunden): ${e.stundenProTag || 1.5}
Ziel-Gesamtaufwand (Stunden, Richtwert): ${e.geplanteStunden}
Lernziele / Themen:
${ziele || "(keine angegeben – leite sinnvolle Themen aus dem Fach ab)"}

Regeln:
- Verteile die Lernblöcke auf die Tage zwischen heute und dem Tag VOR der Prüfung. Niemals am Prüfungstag oder danach.
- Pro Tag höchstens die angegebene maximale Lernzeit.
- Jeder Block dauert zwischen 0.75 und 2 Stunden (Vielfache von 0.25). Keine winzigen Mini-Blöcke.
- Decke alle Lernziele ab; ordne jedem Block ein konkretes Thema zu.
- Formuliere die Aufgabe konkret und passend zum Lerntyp (z. B. visuell: Mindmap; auditiv: laut erklären).
- Plane gegen Ende einige kurze Wiederholungen (Spaced Repetition) ein, diese mit "sr": true.

Gib NUR dieses JSON zurück:
{"blocks":[{"datum":"YYYY-MM-DD","thema":"...","aufgabe":"...","dauer":1.5,"sr":false}]}`;
  return { system, user, maxTokens: 2500 };
}

function buildQuizPrompt(b) {
  const anzahl = Math.min(30, Math.max(4, b.anzahl || 12));
  const ziele = (b.lernziele || "").trim();
  const system =
    "Du bist ein Lerncoach, der prägnante Lernkarten erstellt. " +
    "Antworte AUSSCHLIESSLICH mit gültigem JSON ohne Markdown, ohne Code-Fences, ohne Erklärungstext.";
  const user =
`Erstelle ${anzahl} Karteikarten zum Lernen für das Fach "${b.fach || ""}".

Lernziele / Themen:
${ziele || "(keine angegeben – leite sinnvolle Themen aus dem Fach ab)"}

Regeln:
- Fragen auf Deutsch, klar und kurz. Antworten knapp, aber vollständig (1–3 Sätze).
- Verteile die Karten gleichmässig über die Lernziele.
- Mische Verständnis- und Faktenfragen.

Gib NUR dieses JSON zurück:
{"cards":[{"frage":"...","antwort":"...","thema":"..."}]}`;
  return { system, user, maxTokens: 2500 };
}

// JSON aus der Antwort holen, auch falls versehentlich Fences drumherum sind
function extractJson(text) {
  if (!text) return null;
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/,"").trim();
  try { return JSON.parse(t); } catch {}
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) {
    try { return JSON.parse(t.slice(s, e + 1)); } catch {}
  }
  return null;
}
