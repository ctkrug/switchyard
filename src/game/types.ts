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

/** One throw of a switch: which switch, and which branch to route through. */
export interface Move {
  switchId: string;
  branch: "left" | "right";
}

/** A generated, guaranteed-solvable puzzle layout. */
export interface Yard {
  id: string;
  seed: number;
  cars: Car[];
  sidings: Siding[];
  /** Minimum number of moves a perfect solve requires. */
  parMoves: number;
}
