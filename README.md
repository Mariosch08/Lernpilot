# LernPilot – produktive Version (Accounts + Cloud-Speicher)

Single-File-Web-App mit echtem Login und gerätübergreifender Speicherung.
Frontend = `index.html` (statisch, kein Build), Backend = Supabase (Auth + PostgreSQL).

## Einrichtung (einmalig, ~5 Min)

1. **Supabase-Projekt erstellen**
   Auf [supabase.com](https://supabase.com) kostenlos registrieren → *New project*.

2. **Zugangsdaten eintragen**
   Im Projekt: *Project Settings → API*. Dort kopieren:
   - **Project URL** → in `index.html` bei `SUPABASE_URL`
   - **anon public** Key → in `index.html` bei `SUPABASE_ANON_KEY`

   Der anon-Key darf öffentlich im Frontend stehen – der Zugriff ist über
   Row Level Security (RLS) pro Benutzer abgesichert.

3. **Datenbank anlegen**
   *SQL Editor → New query* → Inhalt von `schema.sql` einfügen → **Run**.
   Das erstellt die Tabellen, Sicherheitsregeln und den Signup-Trigger.

4. **(Für schnelles Testen optional) E-Mail-Bestätigung ausschalten**
   *Authentication → Sign In / Providers → Email* → Option *Confirm email* deaktivieren.
   Dann kann man sich sofort ohne Bestätigungsmail anmelden.
   Für ein echtes Release lässt man die Bestätigung an.

## Starten / Deployen

Die App lädt Supabase als ES-Modul – sie muss **über einen Server** laufen
(nicht per Doppelklick / `file://`).

**Lokal testen:**
```
npx serve .
```
…dann die angezeigte URL öffnen (z. B. `http://localhost:3000`).

**Deployen (statisches Hosting):**
- Vercel / Netlify / GitHub Pages / Cloudflare Pages
- Einfach `index.html` als statische Seite hochladen – kein Build nötig.

## Was funktioniert

- Registrierung, Login, Logout, Passwort-zurücksetzen
- Alle Daten (Prüfungen, Lernblöcke, Dark-Mode) liegen in PostgreSQL und
  synchronisieren über alle Geräte – jeder sieht nur seine eigenen Daten
- Automatischer Lernplan inkl. Spaced Repetition
- iCal-Export (.ics) und PDF-Export (Druckdialog)
- Neue Konten starten leer; Demodaten lassen sich per Knopf laden

## Hinweise

- Die „KI" (Aufwand schätzen + Lernplan) ist aktuell regelbasiert und in
  `schaetzeStunden()` / `generiereBloecke()` jederzeit durch einen echten
  LLM-Call ersetzbar.
- Notenrichtung beachten: Diese Version nutzt das Schweizer System
  (6 = beste Note). Im Mockup wirkte die Skala teils umgekehrt – im Team
  kurz abgleichen, welche Richtung gewollt ist.
