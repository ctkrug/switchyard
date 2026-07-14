import type { Yard } from "../game/types";

/** Virtual coordinate space the board is drawn in, independent of actual canvas pixel size. */
export const VIRTUAL_WIDTH = 1000;
export const VIRTUAL_HEIGHT = 600;

const PAD = 56;
const LEAD_Y = 150;
const DIAGONAL_RUN = 36;
const LADDER_SPACING = 64;
const MIN_LADDER_SPACING = 20;
const LADDER_BOTTOM_MARGIN = 40;
const CAR_WIDTH = 40;
const CAR_HEIGHT = 26;
const CAR_GAP = 6;
const QUEUE_CAR_SPACING = 46;
const MIN_QUEUE_SPACING = 28;

export interface WorldPoint {
  x: number;
  y: number;
}

export interface SwitchLayout {
  id: string;
  position: WorldPoint;
}

export interface SidingLayout {
  id: string;
  /** Where the diagonal peels off the lead track (== its switch's position). */
  bendStart: WorldPoint;
  /** Where the diagonal meets the horizontal siding stub. */
  mouth: WorldPoint;
  laneY: number;
  stubEndX: number;
  /** World position for the (0-indexed) car delivered into this siding. */
  slot(index: number): WorldPoint;
}

export interface BoardLayout {
  width: number;
  height: number;
  leadY: number;
  throatX: number;
  endX: number;
  carWidth: number;
  carHeight: number;
  switches: SwitchLayout[];
  sidings: Map<string, SidingLayout>;
  /** World position for the car `offsetFromFront` places behind the throat (0 = next to dispatch). */
  queueSlot(offsetFromFront: number): WorldPoint;
}

export function computeLayout(yard: Yard): BoardLayout {
  const switchCount = yard.switches.length;
  const throatX = PAD + 190;
  const endX = VIRTUAL_WIDTH - PAD - 40;
  const gap = switchCount > 0 ? (endX - throatX) / (switchCount + 1) : 0;

  const switches: SwitchLayout[] = yard.switches.map((sw, i) => ({
    id: sw.id,
    position: { x: throatX + gap * (i + 1), y: LEAD_Y },
  }));

  // Lanes normally step down by LADDER_SPACING, but compress (down to a
  // legible minimum) so any switch count still fits inside VIRTUAL_HEIGHT
  // instead of the ladder running off the bottom of the board.
  const availableLaneSpan = VIRTUAL_HEIGHT - (LEAD_Y + 80) - LADDER_BOTTOM_MARGIN;
  const laneSpacing =
    switchCount > 1 ? Math.max(MIN_LADDER_SPACING, Math.min(LADDER_SPACING, availableLaneSpan / (switchCount - 1))) : LADDER_SPACING;

  const capacityById = new Map(yard.sidings.map((s) => [s.id, s.capacity]));
  const sidings = new Map<string, SidingLayout>();
  yard.switches.forEach((sw, i) => {
    const bendStart = switches[i].position;
    const laneY = LEAD_Y + 80 + i * laneSpacing;
    const mouth: WorldPoint = { x: bendStart.x + DIAGONAL_RUN, y: laneY };
    const capacity = Math.max(1, capacityById.get(sw.sidingId) ?? 1);
    const stubEndX = mouth.x + capacity * (CAR_WIDTH + CAR_GAP) + 24;

    sidings.set(sw.sidingId, {
      id: sw.sidingId,
      bendStart,
      mouth,
      laneY,
      stubEndX,
      slot: (index: number) => ({
        x: mouth.x + 16 + index * (CAR_WIDTH + CAR_GAP),
        y: laneY,
      }),
    });
  });

  // Spacing shrinks to fit more cars behind the throat, but only down to a
  // legible minimum — beyond that the queue simply extends past the left
  // edge of the board (a longer train than fits on screen) rather than
  // cramming cars into an unreadable pile.
  const queueAvailable = Math.max(throatX - PAD, QUEUE_CAR_SPACING);
  const spacing =
    yard.cars.length > 0 ? Math.max(MIN_QUEUE_SPACING, Math.min(QUEUE_CAR_SPACING, queueAvailable / yard.cars.length)) : QUEUE_CAR_SPACING;

  return {
    width: VIRTUAL_WIDTH,
    height: VIRTUAL_HEIGHT,
    leadY: LEAD_Y,
    throatX,
    endX,
    carWidth: CAR_WIDTH,
    carHeight: CAR_HEIGHT,
    switches,
    sidings,
    queueSlot: (offsetFromFront: number) => ({
      x: throatX - spacing * (offsetFromFront + 1),
      y: LEAD_Y,
    }),
  };
}
