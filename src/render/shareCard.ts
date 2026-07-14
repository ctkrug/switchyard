export interface ShareCardData {
  moves: number;
  par: number;
  rating: string;
  totalSolved: number;
}

export const SHARE_CARD_WIDTH = 800;
export const SHARE_CARD_HEIGHT = 450;

/** Pure: the lines of copy the share card renders, in draw order. */
export function shareCardLines(data: ShareCardData): string[] {
  return [
    `Solved in ${data.moves} moves`,
    `Par ${data.par}`,
    data.rating,
    `Yards solved this session: ${data.totalSolved}`,
  ];
}

/**
 * Draws the DESIGN.md-toned share card onto (and sizes) the given canvas.
 * Safe no-op past the sizing step if a 2D context isn't available.
 */
export function drawShareCard(canvas: HTMLCanvasElement, data: ShareCardData): void {
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const bg = ctx.createLinearGradient(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);
  bg.addColorStop(0, "#0a1220");
  bg.addColorStop(1, "#111c30");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

  ctx.strokeStyle = "rgba(56, 189, 248, 0.14)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= SHARE_CARD_WIDTH; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, SHARE_CARD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= SHARE_CARD_HEIGHT; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SHARE_CARD_WIDTH, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#ffb020";
  ctx.font = "700 56px 'Space Grotesk', 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("SWITCHYARD", 48, 96);

  ctx.fillStyle = "#7f8fae";
  ctx.font = "500 20px 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace";
  ctx.fillText("Dispatch complete", 48, 132);

  ctx.font = "600 34px 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace";
  ctx.fillStyle = "#e7edf7";
  let y = 210;
  for (const line of shareCardLines(data)) {
    ctx.fillText(line, 48, y);
    y += 52;
  }
}

/** Triggers a browser download of the canvas contents as a PNG. */
export function downloadShareCard(canvas: HTMLCanvasElement, filename = "switchyard-result.png"): void {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}
