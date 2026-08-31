import { scoreForFoods, tickMsForFoods } from "./scoring";

export const COLS = 20;
export const ROWS = 16;

export type Dir = "up" | "down" | "left" | "right";
export type Cell = { x: number; y: number };

export type SnakeState = {
  snake: Cell[];
  dir: Dir;
  queued: Dir[];
  food: Cell;
  foods: number;
  score: number;
  over: boolean;
  rng: () => number;
};

/** Small deterministic RNG so a run can be replayed / audited. */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

export function placeFood(snake: Cell[], rng: () => number): Cell {
  let c: Cell;
  let guard = 0;
  do {
    c = { x: Math.floor(rng() * COLS), y: Math.floor(rng() * ROWS) };
    guard++;
  } while (guard < 500 && snake.some((s) => s.x === c.x && s.y === c.y));
  return c;
}

export function createState(seed = Date.now()): SnakeState {
  const rng = makeRng(seed);
  const snake: Cell[] = [
    { x: 5, y: 8 },
    { x: 4, y: 8 },
    { x: 3, y: 8 },
  ];
  return {
    snake,
    dir: "right",
    queued: [],
    food: placeFood(snake, rng),
    foods: 0,
    score: 0,
    over: false,
    rng,
  };
}

export function turn(state: SnakeState, dir: Dir) {
  const last = state.queued.length ? state.queued[state.queued.length - 1]! : state.dir;
  if (dir === last || dir === OPPOSITE[last]) return;
  if (state.queued.length < 2) state.queued.push(dir);
}

/** Advance one tick. Returns true if food was eaten. */
export function step(state: SnakeState): boolean {
  if (state.over) return false;
  const next = state.queued.shift();
  if (next) state.dir = next;

  const d = DELTA[state.dir];
  const head = state.snake[0]!;
  const nh: Cell = { x: head.x + d.x, y: head.y + d.y };

  // Classic behaviour: walls kill.
  if (nh.x < 0 || nh.y < 0 || nh.x >= COLS || nh.y >= ROWS) {
    state.over = true;
    return false;
  }
  const eating = nh.x === state.food.x && nh.y === state.food.y;
  const body = eating ? state.snake : state.snake.slice(0, -1);
  if (body.some((s) => s.x === nh.x && s.y === nh.y)) {
    state.over = true;
    return false;
  }

  state.snake.unshift(nh);
  if (eating) {
    state.foods += 1;
    state.score = scoreForFoods(state.foods);
    state.food = placeFood(state.snake, state.rng);
  } else {
    state.snake.pop();
  }
  return eating;
}

export const tickFor = (state: SnakeState) => tickMsForFoods(state.foods);

/** Simple greedy pathing used only by the non-interactive teaser loop. */
export function autopilot(state: SnakeState): Dir {
  const head = state.snake[0]!;
  const options: Dir[] = ["up", "down", "left", "right"];
  const safe = options.filter((dir) => {
    if (dir === OPPOSITE[state.dir]) return false;
    const d = DELTA[dir];
    const nx = head.x + d.x;
    const ny = head.y + d.y;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return false;
    return !state.snake.slice(0, -1).some((s) => s.x === nx && s.y === ny);
  });
  if (!safe.length) return state.dir;
  safe.sort((a, b) => {
    const da = DELTA[a];
    const db = DELTA[b];
    const distA = Math.abs(head.x + da.x - state.food.x) + Math.abs(head.y + da.y - state.food.y);
    const distB = Math.abs(head.x + db.x - state.food.x) + Math.abs(head.y + db.y - state.food.y);
    return distA - distB;
  });
  return safe[0]!;
}
