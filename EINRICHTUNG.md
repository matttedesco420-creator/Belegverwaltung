# Belegverwaltung – Einrichtung

Diese App läuft **vollständig auf deinem Gerät**. Es gibt kein Konto, keinen
Server und keine Cloud. Alle Belege liegen im Speicher deines Handys bzw.
Rechners.

---

## 1. API-Key erstellen

Die Texterkennung läuft über die Anthropic-API. Dafür brauchst du einen Key:

1. **console.anthropic.com** öffnen und anmelden
2. Unter **Billing** ein kleines Guthaben aufladen (5 € reichen für Jahre)
3. Unter **API Keys** → **Create Key** einen Key erstellen
4. Den Key kopieren – er beginnt mit `sk-ant-...`

Kosten: rund 0,3–1,5 Cent pro Beleg, je nach Seitenzahl.

## 2. App veröffentlichen

Die Dateien in ein GitHub-Repository hochladen, dann **Settings → Pages**
→ *Deploy from a branch*, Branch `main`, Ordner `/ (root)`.

Wichtig: `index.html` muss direkt im Hauptordner liegen, nicht in einem
Unterordner.

## 3. Auf dem Handy installieren

Die Pages-Adresse am Handy öffnen:

- **iPhone (Safari):** Teilen-Symbol → „Zum Home-Bildschirm"
- **Android (Chrome):** Menü → „App installieren"

Beim ersten Start fragt die App nach dem API-Key. Danach ist sie
einsatzbereit.

---

## Speicher und Sicherung

Die Belege liegen in der lokalen Datenbank des Browsers (IndexedDB).
Die App fordert beim Start **dauerhaften Speicher** an; iOS gewährt das
bevorzugt für Apps auf dem Startbildschirm und nimmt sie damit von der
automatischen Bereinigung aus.

Die bekannte 7-Tage-Löschregel von iOS gilt **nicht** für Web-Apps auf dem
Startbildschirm – nur für normale Safari-Tabs.

**Trotzdem gilt:** Ohne Cloud gibt es keine zweite Kopie. Daten sind weg,
wenn du die App vom Startbildschirm löschst, das Gerät verlierst oder der
Speicher knapp wird.

Deshalb unter **⚙ Einstellungen → Sicherung erstellen** regelmäßig eine
Sicherungsdatei herunterladen und in den Dateien oder in iCloud ablegen.
Über **Sicherung einlesen** kommen die Belege auf einem neuen Gerät oder
nach einer Neuinstallation zurück. Bereits vorhandene Belege werden dabei
nicht doppelt angelegt.

Dieselbe Datei eignet sich auch, um die Belege auf ein zweites Gerät zu
übertragen – allerdings als einmalige Kopie, nicht als laufender Abgleich.

## Mehrere Geräte

Ein automatischer Abgleich zwischen Handy und Laptop ist ohne Server nicht
möglich. Entweder du erfasst alles auf einem Gerät, oder du überträgst die
Belege bei Bedarf per Sicherungsdatei.

## Sicherheitshinweis zum API-Key

Der Key liegt im lokalen Speicher des Browsers. Wer physischen Zugriff auf
das entsperrte Gerät hat, könnte ihn über die Entwicklertools auslesen.
Für ein privates Werkzeug auf dem eigenen Handy ist das üblich und
vertretbar. Falls der Key doch einmal nach außen gelangt, lässt er sich
unter console.anthropic.com jederzeit widerrufen und neu erstellen.
