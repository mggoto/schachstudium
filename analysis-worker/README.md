# KI-Auswertung für Schachstudium

Die öffentliche GitHub-Pages-Seite kann keine geheimen API-Schlüssel speichern. Deshalb läuft die echte KI-Kommentierung in einem separaten **Cloudflare Worker**.

## Einrichtung

1. Cloudflare-Konto erstellen und Wrangler authentifizieren: `cd analysis-worker && npm install && npx wrangler login`
2. In Cloudflare Worker zwei Secrets setzen:
   - `npx wrangler secret put OPENAI_API_KEY` – eigener OpenAI-API-Schlüssel
   - `npx wrangler secret put ANALYSIS_ACCESS_TOKEN` – ein langer, zufällig generierter persönlicher Zugriffscode (z. B. 32+ Zeichen). **Nie auf GitHub speichern.**
3. `npm run deploy` ausführen. Cloudflare zeigt eine HTTPS-Adresse, z. B. `https://schachstudium-analyse.<account>.workers.dev`.
4. Unter https://lab.kidsgambit.ch → **Eigene Partie** nach dem PGN-Import das Feld **Adresse des Analysedienstes** mit `https://...workers.dev/analyze` ausfüllen. Den Zugriffscode eingeben, dann **Mit KI kommentieren**.

Der API-Schlüssel bleibt ausschliesslich in Cloudflare. Der persönliche Zugriffscode wird in der Webseite nicht fest eingebaut; er wird pro Sitzung manuell eingegeben. Die Worker-CORS-Regel erlaubt nur `https://lab.kidsgambit.ch`.

**Kosten und Sicherheit:** OpenAI-API-Nutzung ist separat kostenpflichtig. Für einen öffentlichen Dienst solltest du zusätzliche Rate-Limits bei Cloudflare einrichten und einen langen Zugriffscode verwenden. Keine Partien mit vertraulichen Angaben importieren, da ihre Zugdaten an den KI-Anbieter gesendet werden.

**Grenzen:** Die PGN wird vor der KI-Auswertung mit chess.js auf Legalität geprüft. Die KI liefert Zugerklärungen, aber ohne Stockfish-Stellungsbewertungen sind Begriffe wie *Fehler* oder *bester Zug* nicht objektiv engine-verifiziert. Das Interface zeigt keine erfundenen Bewertungswerte. Maximal 160 Halbzüge pro KI-Anfrage.
