# Ecosystem Simulation — Browser Edition

A standalone browser adaptation of the Java/Swing ecosystem simulation. Sheep find grass, wolves hunt sheep, and animals inherit DNA and traits. Runs entirely on the visitor's device. No server, account, API, build step, package install, or paid hosting is required.

## Features

- Responsive Russian-language interface for phones and desktops.
- Canvas map, movement animation, zoom and touch scrolling.
- Five biomes; impassable mountains and water; trees and flowers block paths.
- Breadth-first search (BFS) for food, hunger, health, aging and reproduction.
- DNA crossover, mutations and generation tracking.
- Four seasons and four times of day.
- Start/pause, single step, 1–20× speed and manual entity additions.
- Optional population support, enabled by default; additions are counted separately from births.
- Creature inspection, population chart and CSV export.
- Browser-local save/load plus portable JSON import/export.
- Optional synthesized sound effects, activated by tapping the sound button.
- Automatic temporary suspension in background tabs.

## Open locally

Extract the ZIP, then open `index.html` on your computer. Keep `styles.css` and the `js` folder beside it. For iPhone, publish the project and share its HTTPS link as described below.

## Publish for free on GitHub Pages (no terminal)

1. Extract this archive into a **new folder**, separate from the Java project. Suggested repository name: `ecosystem-simulation-web`.
2. On GitHub, click **+ → New repository**. Enter the new name and choose **Public**. Click **Create repository**. The original Java repository is a separate project; do not upload these files there.
3. On the empty repository page, click **uploading an existing file**. In an existing repository use **Add file → Upload files**.
4. Upload the **contents** of `ecosystem-simulation-web`, not the ZIP or the enclosing folder. `index.html`, `styles.css`, `README.md` and the `js` folder must be at the repository root. The `tests` folder may also be uploaded. Commit message: `Add browser ecosystem simulation` → **Commit changes**. Hidden `.gitignore` and `.nojekyll` are optional for this upload method; the website does not depend on them.
5. Open **Settings → Pages**. Under **Build and deployment**, choose **Source: Deploy from a branch**. Set **Branch: main** and **Folder: / (root)**. Click **Save**.
6. Wait for the Pages deployment to finish (check the repository's **Actions** tab if needed). Return to **Settings → Pages** and open **Visit site**. Send this link to her.

The URL will look like `https://YOUR_USERNAME.github.io/ecosystem-simulation-web/`. She opens it in Safari and taps **Запустить**. She does not need a GitHub account. Your computer can be off. The free GitHub Pages route requires a public repository, so its source code is publicly visible. No custom domain is needed.

If there is a 404, check that `index.html` is at the repository root and that the Pages deployment succeeded. If the site opens without styling or functionality, check that `styles.css`, `js/engine.js` and `js/app.js` were uploaded in the correct folders.

Official instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Controls

| Action | Phone / desktop |
| --- | --- |
| Run or pause | Запустить / Пауза |
| Advance one turn | Один ход while paused |
| Inspect a cell | Tap/click the map |
| Zoom | + / − below the map |
| Explore an enlarged map | Scroll horizontally/vertically |
| Add entities | Овца / Волк / Трава / Цветок |
| Preserve current state | Сохранить (in this browser) or Файл сохранения (JSON) |
| Restore state | Загрузить or Открыть файл |
| Export chart history | CSV |

Desktop shortcuts: Space = run/pause; H = sheep; W = wolf; G = grass; F = flower. New world and clearing require confirmation. Clearing keeps trees and pauses the simulation; population support will reintroduce animals when you resume.

## Project structure

```text
index.html              Page structure
styles.css              Responsive layout and visual design
js/engine.js            Simulation model, BFS, reproduction, save validation
js/app.js               Canvas rendering, controls, chart, browser storage, sound
tests/engine.test.cjs   Model regression tests (Node.js, no packages)
```

To run model tests with Node.js: `node --testtests/engine.test.cjs`.

## Adaptation notes

This is a new JavaScript project, not a Java-to-JavaScript binary conversion. The Java source was used as the model reference. Desktop Swing code and Maven are not needed.

Core rules retained: initial 40×25 world; 80 grass, 15 sheep, 7 wolves, 20 trees and 15 flowers; sheep HP 15 / speed 2; wolf HP 20 / speed 3 / attack 5; lifespan 30–49 turns; hunger penalties after 10 turns; hunger limits of 12/15; reproduction cooldown 3; nearby partners; inherited HP, speed, attack, DNA and mutations; time transitions every 11 turns and seasons every 31 turns. Placement counts may be lower when insufficient valid space exists.

Deliberate fixes and differences:

- A predator only occupies the prey's cell after killing it. Surviving sheep cannot be silently overwritten.
- Every animal present at the start of a turn acts at most once, and newborns wait until the next turn.
- Speed and winter's movement multiplier affect travel distance; in the Java version the computed speed was unused.
- Placement and reproduction both respect impassable terrain; the Java placement code excluded water but allowed mountains.
- Population support is optional. Its introductions are counted separately from natural births. The Java forced spawns after no births and forced population-health interventions are replaced by the explicit support toggle.
- Grass replenishment retains the seasonal minimum/growth rule from `TurnActions`; per-biome grass growth values remain descriptive metadata, as in that implementation.
- The compact phone interface replaces the separate minimap/fullscreen window. Sound effects use Web Audio synthesis.
- JSON saves preserve terrain, creatures, age, DNA, cooldowns, counters and history. They are a new format and are not compatible with the Java saves.
- CSV exports population history (up to 10,000 most recent turns); the chart displays the most recent 160.

Browser storage is local to this device, browser and website address. Clearing browser data removes it. Use JSON export for transferable saves. Exact future randomness is not saved, so loading restores the current state but does not guarantee the same future outcome. This project has no offline service worker: first opening the published link requires internet. Local desktop opening works with the supplied files.

## Portfolio description

> Browser adaptation of my Java ecosystem simulation, featuring BFS pathfinding, inheritance and mutations, seasonal behavior, interactive Canvas rendering and portable state serialization. Built with vanilla JavaScript, HTML and CSS and deployed using GitHub Pages.
