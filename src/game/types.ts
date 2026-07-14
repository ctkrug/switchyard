/** A single rail car that must be delivered to a target siding. */
export interface Car {
  id: string;
  /** Id of the siding this car must end up on to solve the puzzle. */
  targetSidingId: string;
}

/** A siding is a dead-end track that accepts cars in the order they arrive. */
export interface Siding {
  id: string;
  capacity: number;
}

/**
 * A lever position. Switches sit in series along the lead track:
 * "left" keeps a car running straight down the lead toward the next
 * switch, "right" diverts it into this switch's own siding.
 */
export type Branch = "left" | "right";

/** One throw of a switch: which switch, and which branch to route through. */
export interface Move {
  switchId: string;
  branch: Branch;
}

/**
 * A switch sits at a fixed position in the lead-track chain and owns
 * exactly one siding branching off to the right of it.
 */
export interface Switch {
  id: string;
  sidingId: string;
}

/** A generated, guaranteed-solvable puzzle layout. */
export interface Yard {
  id: string;
  seed: number;
  /** Cars queued on the lead, front-of-train first (index 0 = next to dispatch). */
  cars: Car[];
  sidings: Siding[];
  /** Switches in lead-track order, index 0 is closest to the throat. */
  switches: Switch[];
  /** Minimum number of moves a perfect solve requires. */
  parMoves: number;
}
