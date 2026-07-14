import "./style.css";
import { generateYard } from "./game/generator";
import { solve } from "./game/solver";

function renderShell(container: HTMLElement): void {
  const yard = generateYard(Date.now());
  const solution = solve(yard);

  container.innerHTML = `
    <header style="padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--line);">
      <h1 class="font-display" style="margin: 0; font-size: 1.75rem; color: var(--accent);">
        SWITCHYARD
      </h1>
      <p style="margin: 4px 0 0; color: var(--text-muted);">
        Route every car to its siding in the fewest moves.
      </p>
    </header>
    <main style="flex: 1; display: flex; align-items: center; justify-content: center; padding: var(--space-4);">
      <div
        style="
          background: var(--surface-1);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: var(--space-4);
          max-width: 480px;
          text-align: center;
        "
      >
        <p style="color: var(--text-muted); margin: 0 0 var(--space-2);">
          Scaffold online — the yard board lands in the next build pass.
        </p>
        <p style="font-family: var(--font-ui); color: var(--accent-support); margin: 0;">
          yard ${yard.id} · par ${yard.parMoves} move${yard.parMoves === 1 ? "" : "s"} ·
          solver ${solution ? "found a plan" : "found no plan"}
        </p>
      </div>
    </main>
  `;
}

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  renderShell(root);
}
