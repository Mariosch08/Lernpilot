# LernPilot – produktive Version (Accounts + Cloud + KI)

Statisches Frontend (`index.html`) + Supabase (Auth + PostgreSQL) + eine
Vercel-Function (`api/ai.js`) für die KI. Kein Build nötig.

## Repo-Struktur (wichtig für Vercel)
```
index.html        <- App (im Wurzelverzeichnis)
api/ai.js         <- KI-Endpunkt (Vercel Serverless Function)
schema.sql        <- Datenbank-Setup
README.md
```

## Einrichtung

### 1. Supabase (Datenbank + Login)
1. Projekt auf supabase.com erstellen.
2. Project Settings → API: **Project URL** und **anon public** Key in `index.html`
   bei `SUPABASE_URL` / `SUPABASE_ANON_KEY` eintragen.
3. SQL Editor → `schema.sql` einfügen → Run. (Mehrfaches Ausführen ist sicher;
   neue Spalten/Tabellen für Lernziele und Karteikarten werden ergänzt.)
4. Authentication → Providers → Email: „Confirm email" ausschalten (einfachere Anmeldung).

### 2. KI (Vercel-Function)
1. API-Key auf console.anthropic.com erstellen (beginnt mit `sk-ant-...`).
2. In Vercel: Project Settings → Environment Variables →
   `ANTHROPIC_API_KEY = sk-ant-...` (für Production, Preview, Development).
3. Neu deployen (Git-Push oder Re-Deploy), damit die Variable greift.

Modell ändern: in `api/ai.js` oben die Konstante `MODEL`
(`claude-haiku-4-5-20251001` = günstig/schnell, `claude-sonnet-4-6` = höhere Qualität).

## Deployen
- Repo zu GitHub pushen → in Vercel importieren (Framework Preset „Other").
- Vercel erkennt `index.html` als statische Seite und `api/ai.js` automatisch als Function.
- Auth-Redirect: Supabase → Authentication → URL Configuration → Site URL und
  Redirect URLs auf die Vercel-URL setzen (mit `/` am Ende).

## Funktionen
- Echte Accounts, Cloud-Speicher, geräteübergreifend (RLS schützt pro Benutzer).
- Lernziele pro Prüfung → KI baut daraus einen massgeschneiderten Lernplan
  (Themen pro Block, sinnvolle Längen, an Lernzeit/Tag angepasst, Spaced Repetition).
  Ohne KI/Lernziele: regelbasierter Standardplan als Fallback.
- KI-Karteikarten aus den Lernzielen, Lernmodus mit Spaced Repetition.
- Kalenderansicht (Monat) mit Prüfungen und Lernblöcken, Tag anklickbar.
- Noten, Statistiken, iCal- und PDF-Export wie gehabt.

## Lokal testen
- Frontend + KI zusammen: `vercel dev` (führt auch die Function lokal aus).
- Nur Frontend: `npx serve .` – dann läuft die KI nicht (kein `/api`),
  der Plan fällt automatisch auf die regelbasierte Variante zurück.

## Hinweise
- anon-Key und Project URL dürfen öffentlich sein (RLS schützt die Daten).
  Geheim bleiben: Datenbank-Passwort, service_role-Key und der ANTHROPIC_API_KEY
  (steht nur als Vercel-Variable serverseitig, nie im Frontend).
- Notenrichtung: Schweizer System (6 = beste Note).
