import "./style.css";
import { Sfx } from "./audio/sfx";
import { createSession, hasMistake, isWin, reset, throwSwitch, undo, type Session } from "./game/engine";
import { generateYard } from "./game/generator";
import { formatBestDelta, loadStats, recordSolve, saveStats, type Stats } from "./game/stats";
import { Board } from "./render/board";
import { downloadShareCard, drawShareCard } from "./render/shareCard";
import { WinCelebration } from "./render/winCelebration";

const root = document.querySelector<HTMLDivElement>("#app");

function nextSeed(): number {
  return Math.floor(performance.now() * 1000 + Math.random() * 1_000_000);
}

function main(container: HTMLElement): void {
  container.innerHTML = `
    <header class="topbar">
      <svg class="wordmark" viewBox="0 0 340 56" role="img" aria-label="Switchyard">
        <text x="4" y="42" class="wordmark-text">SWITCHYARD</text>
      </svg>
      <p class="tagline">Route every car to its siding in the fewest moves.</p>
    </header>
    <div class="layout">
      <section class="board-region" id="board-container" aria-label="Yard board"></section>
      <aside class="hud">
        <div class="hud-stats" role="status" aria-live="polite">
          <div class="stat">
            <span class="stat-label">Moves</span>
            <span class="stat-value" id="move-count">0</span>
          </div>
          <div class="stat">
            <span class="stat-label">Par</span>
            <span class="stat-value" id="par-count">0</span>
          </div>
          <div class="stat">
            <span class="stat-label">Solved</span>
            <span class="stat-value" id="solved-count">0</span>
          </div>
          <div class="stat">
            <span class="stat-label">Best</span>
            <span class="stat-value" id="best-delta">—</span>
          </div>
        </div>
        <div class="hud-controls">
          <button type="button" class="btn btn-primary" id="new-yard-btn">New Yard</button>
          <button type="button" class="btn" id="undo-btn">Undo</button>
          <button type="button" class="btn" id="reset-btn">Reset</button>
          <button type="button" class="btn btn-icon" id="mute-btn" aria-pressed="false">
            <span id="mute-label">Sound on</span>
          </button>
        </div>
        <p class="mistake-note" id="mistake-note" role="alert" hidden>
          A car was sent to the wrong siding — Undo or Reset to recover.
        </p>
      </aside>
    </div>
    <div class="win-overlay" id="win-overlay" hidden>
      <canvas class="win-particles" id="win-particles" aria-hidden="true"></canvas>
      <div class="win-card" role="dialog" aria-modal="true" aria-labelledby="win-title">
        <p class="win-eyebrow">Dispatch complete</p>
        <h2 id="win-title">Yard cleared</h2>
        <p class="win-stats" id="win-stats"></p>
        <p class="win-rating" id="win-rating"></p>
        <div class="win-actions">
          <button type="button" class="btn btn-primary" id="win-next-btn">Next Yard</button>
          <button type="button" class="btn" id="win-share-btn">Download card</button>
        </div>
      </div>
    </div>
  `;

  const sfx = new Sfx();
  let yardsGenerated = 1;
  let yard = generateYard(nextSeed(), yardsGenerated - 1);
  let session: Session = createSession(yard);

  let stats: Stats = loadStats();

  const boardContainer = container.querySelector<HTMLElement>("#board-container")!;
  const moveCountEl = container.querySelector<HTMLElement>("#move-count")!;
  const parCountEl = container.querySelector<HTMLElement>("#par-count")!;
  const solvedCountEl = container.querySelector<HTMLElement>("#solved-count")!;
  const bestDeltaEl = container.querySelector<HTMLElement>("#best-delta")!;
  const mistakeNoteEl = container.querySelector<HTMLElement>("#mistake-note")!;
  const muteBtn = container.querySelector<HTMLButtonElement>("#mute-btn")!;
  const muteLabel = container.querySelector<HTMLElement>("#mute-label")!;
  const undoBtn = container.querySelector<HTMLButtonElement>("#undo-btn")!;
  const resetBtn = container.querySelector<HTMLButtonElement>("#reset-btn")!;
  const newYardBtn = container.querySelector<HTMLButtonElement>("#new-yard-btn")!;
  const winOverlay = container.querySelector<HTMLElement>("#win-overlay")!;
  const winCard = container.querySelector<HTMLElement>(".win-card")!;
  const winStats = container.querySelector<HTMLElement>("#win-stats")!;
  const winRating = container.querySelector<HTMLElement>("#win-rating")!;
  const winNextBtn = container.querySelector<HTMLButtonElement>("#win-next-btn")!;
  const winShareBtn = container.querySelector<HTMLButtonElement>("#win-share-btn")!;
  const winParticlesCanvas = container.querySelector<HTMLCanvasElement>("#win-particles")!;
  const wordmarkText = container.querySelector<SVGTextElement>(".wordmark-text")!;

  const celebration = new WinCelebration(winParticlesCanvas);

  function playWordmarkIntro(): void {
    wordmarkText.style.animation = "none";
    // Force a reflow so removing/restoring the animation actually restarts it.
    void wordmarkText.getBoundingClientRect();
    wordmarkText.style.animation = "";
  }

  function updateHud(): void {
    moveCountEl.textContent = String(session.present.moveCount);
    parCountEl.textContent = String(yard.parMoves);
    undoBtn.disabled = session.past.length === 0;
    mistakeNoteEl.hidden = !hasMistake(session);
  }

  function updateStatsDisplay(): void {
    solvedCountEl.textContent = String(stats.totalSolved);
    bestDeltaEl.textContent = formatBestDelta(stats.bestDelta);
  }

  function updateMuteControl(): void {
    const muted = sfx.isMuted();
    muteBtn.setAttribute("aria-pressed", String(muted));
    muteLabel.textContent = muted ? "Sound off" : "Sound on";
  }

  function ratingFor(moves: number, par: number): string {
    if (moves <= par) return "At par — a perfect dispatch.";
    if (moves <= par + 2) return "Solid run, just over par.";
    return "Cleared — try to beat par next time.";
  }

  function showWin(): void {
    winStats.textContent = `Solved in ${session.present.moveCount} moves · par ${yard.parMoves}`;
    winRating.textContent = ratingFor(session.present.moveCount, yard.parMoves);
    stats = recordSolve(stats, session.present.moveCount, yard.parMoves);
    saveStats(stats);
    updateStatsDisplay();
    winOverlay.hidden = false;
    winNextBtn.focus();

    const overlayRect = winOverlay.getBoundingClientRect();
    const cardRect = winCard.getBoundingClientRect();
    celebration.resize(overlayRect.width, overlayRect.height);
    celebration.burst(
      cardRect.left - overlayRect.left + cardRect.width / 2,
      cardRect.top - overlayRect.top,
      Math.floor(Math.random() * 1_000_000_000),
    );
  }

  function hideWin(): void {
    winOverlay.hidden = true;
    celebration.clear();
  }

  const board = new Board(boardContainer, yard, {
    onSwitchThrow(switchId, branch) {
      const prev = session;
      session = throwSwitch(session, switchId, branch);
      board.applyThrow(prev, session, branch);
      updateHud();
      if (isWin(session)) {
        showWin();
      }
    },
  }, sfx);

  function spawnYard(): void {
    hideWin();
    yardsGenerated++;
    yard = generateYard(nextSeed(), yardsGenerated - 1);
    session = createSession(yard);
    board.setYard(yard, session);
    updateHud();
    playWordmarkIntro();
  }

  board.snapTo(session);
  updateHud();
  updateStatsDisplay();
  updateMuteControl();
  playWordmarkIntro();

  undoBtn.addEventListener("click", () => {
    session = undo(session);
    board.snapTo(session);
    updateHud();
  });

  resetBtn.addEventListener("click", () => {
    session = reset(session);
    board.snapTo(session);
    updateHud();
  });

  newYardBtn.addEventListener("click", spawnYard);
  winNextBtn.addEventListener("click", spawnYard);

  muteBtn.addEventListener("click", () => {
    sfx.toggleMute();
    updateMuteControl();
  });

  winShareBtn.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    drawShareCard(canvas, {
      moves: session.present.moveCount,
      par: yard.parMoves,
      rating: winRating.textContent ?? "",
      totalSolved: stats.totalSolved,
    });
    downloadShareCard(canvas);
  });
}

if (root) {
  main(root);
}
