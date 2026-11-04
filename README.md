# Schachstudium – historische Partien mit Kommentaren

Statische Webseite mit interaktivem Schachbrett, einzelnen Zugkommentaren, Wochenarchiv (Mo–So) und PGN-Download.

## Veröffentlichung auf GitHub Pages
1. Ein **öffentliches** Repository anlegen (z. B. `schachstudium`). Dateien dieses Ordners auf den `main`-Branch laden.
2. In **Settings → Pages → Build and deployment** als Quelle **GitHub Actions** wählen.
3. Workflow **Schachstudium veröffentlichen** unter **Actions** manuell ausführen; die Webseite erscheint unter `https://<github-name>.github.io/<repo>/`.

## Tägliches Archiv
Die Datei `data/games.json` ist der Katalog. Jede Partie braucht ein Datum (`YYYY-MM-DD`), Metadaten und eine PGN-Datei mit je einem Kommentar pro Halbzug. Die Webseite zeigt eine Partie erst ab ihrem Veröffentlichungsdatum in der Zeitzone Europe/Zurich an. Dadurch können kommende Partien **vorab** vorbereitet werden.

Jeden Morgen um 06:00 Uhr läuft der GitHub-Workflow erneut und publiziert den aktuellen Stand. Das Programm **erzeugt noch keine neuen historischen Partien oder KI-Kommentare**: Dazu müssen geprüfte PGNs im Katalog ergänzt werden. Ohne neue PGNs bleiben zukünftige Tage leer. GitHub-Zeitpläne können verzögert starten.

`npm install` und `npm run validate` prüfen auf GitHub alle Partien mit chess.js auf legalen Zugverlauf und eine Kommentierung zu jedem Halbzug.

## Hinweise
Die Webseite lädt chess.js, chessboard.js und Figurenbilder über öffentliche CDNs und benötigt dafür Internet. Sie hat keine Stockfish-Engine. Elo ~1200 bezeichnet das **Lernniveau**, keine historische Elo-Zahl. Bei älteren Partien sind historische Elo-Ratings häufig nicht belegt und werden nicht erfunden.
