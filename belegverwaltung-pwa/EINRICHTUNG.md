# Einrichtung – Belegverwaltung mit Supabase

Ziel: Der Anthropic-API-Key liegt **nur auf dem Server** und ist aus der App heraus
nicht auslesbar. Die App synchronisiert alle Belege zwischen Handy und Laptop.

---

## Schritt 1 – Supabase-Projekt anlegen

1. Auf **supabase.com** mit GitHub einloggen → "New Project"
2. Name: z. B. `meine-apps`, Region: **Europe (Frankfurt)**
3. Datenbank-Passwort vergeben und notieren
4. ~2 Minuten warten, bis das Projekt bereit ist

## Schritt 2 – Datenbank-Tabelle erstellen

Links im Menü **SQL Editor → New query**, folgenden Code einfügen und **Run** klicken:

```sql
create table if not exists kv_store (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  app text not null,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, app, key)
);

alter table kv_store enable row level security;

create policy "Users manage their own data"
on kv_store
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

Diese eine Tabelle kann **alle zukünftigen Apps** bedienen – jede App nutzt
einfach einen eigenen Wert in der Spalte `app`
(hier: `belegverwaltung`, später z. B. `fahrtenbuch`).

## Schritt 3 – E-Mail-Bestätigung abschalten (WICHTIG bei Benutzernamen)

**Authentication → Sign In / Providers → Email**:
"Confirm email" **ausschalten**.

Das ist nötig, weil die App mit **Benutzernamen** statt E-Mail-Adressen arbeitet.
Intern wird aus `matthi` die Adresse `matthi@belege.local` – an diese kann keine
Bestätigungsmail zugestellt werden. Ohne diese Einstellung schlägt die
Registrierung fehl.

*(Wer lieber eine echte E-Mail-Adresse nutzt, kann sie im Login-Feld einfach
komplett mit `@` eintippen – das wird ebenfalls akzeptiert.)*

## Schritt 4 – Anthropic-Key als Server-Geheimnis hinterlegen

**Project Settings → Edge Functions → Secrets** (bzw. "Manage secrets"):

| Name | Wert |
|---|---|
| `ANTHROPIC_API_KEY` | dein Key, beginnt mit `sk-ant-...` |

Ab hier ist der Key ausschließlich serverseitig gespeichert.

## Schritt 5 – Edge Function bereitstellen

**Variante A – über die Weboberfläche (am einfachsten):**

1. Links im Menü **Edge Functions → "Deploy a new function" → "Via Editor"**
2. Name exakt: `scan-receipt`
3. Den gesamten Inhalt von `supabase/functions/scan-receipt/index.ts`
   hineinkopieren
4. **Deploy** klicken

**Variante B – über die Kommandozeile:**

```bash
npm install -g supabase
supabase login
supabase link --project-ref DEIN-PROJEKT-REF
supabase functions deploy scan-receipt
```

## Schritt 6 – App verbinden und Konto anlegen

Beim ersten Start zeigt die App einen **Login-Bildschirm**:

1. **Project URL** und **anon public Key** eintragen
   (zu finden unter *Project Settings → API*) → "Verbinden"
2. **Benutzername** und **Passwort** (mind. 6 Zeichen) wählen
   → "Neues Konto anlegen"
3. Danach bist du direkt angemeldet und die App öffnet sich
4. Auf dem zweiten Gerät (Laptop/Handy) dieselbe URL + Key eintragen
   und mit **demselben Benutzernamen und Passwort** anmelden
   → alle Belege sind dort ebenfalls sichtbar

Die Anmeldung bleibt dauerhaft bestehen – du musst dich nicht bei jedem
Start neu anmelden. Unter **⚙ Einstellungen** kannst du dich abmelden.

---

## Sicherheitsüberblick

| Was | Wo gespeichert | Von außen lesbar? |
|---|---|---|
| Anthropic-API-Key | nur Supabase-Server (Secret) | **Nein** |
| Supabase anon key | in der App | Ja – aber ungefährlich, da nur mit Login nutzbar |
| Deine Belegdaten | Supabase-DB, pro Nutzer getrennt (RLS) | Nein, nur mit deinem Login |
| Lokale Kopie | IndexedDB im Browser | Nur auf deinem Gerät (Offline-Cache) |

Die Edge Function prüft bei **jedem** Aufruf, ob eine gültige Anmeldung vorliegt.
Ohne Login kann niemand die Funktion – und damit deinen API-Key – nutzen.
Zusätzlich sind pro Anfrage max. 8 Seiten und ca. 8 MB erlaubt, damit niemand
über eine gekaperte Sitzung hohe Kosten verursachen kann.

## Neue App an dieselbe Datenbank anschließen

In der neuen App einfach denselben Supabase-URL/Key verwenden und in der
Speicherlogik den Namensraum ändern:

```js
const APP_NS = 'fahrtenbuch';   // statt 'belegverwaltung'
```

Login, Tabelle und Sicherheitsregeln gelten dann automatisch mit.
