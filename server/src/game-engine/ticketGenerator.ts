/**
 * Tambola / Housie Ticket Generator
 * Standard rules:
 * - 3 rows × 9 columns
 * - 15 numbers total (5 per row)
 * - Column ranges: col0=1-9, col1=10-19, ..., col8=80-90
 * - Each column has 1-3 numbers
 * - Numbers sorted ascending within each column
 */

// Column ranges
const COL_RANGES: [number, number][] = [
  [1, 9],
  [10, 19],
  [20, 29],
  [30, 39],
  [40, 49],
  [50, 59],
  [60, 69],
  [70, 79],
  [80, 90],
];

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate a valid Tambola ticket grid.
 * Returns a 3×9 grid where null means blank cell.
 * Each row has exactly 5 numbers.
 */
export function generateTicket(): (number | null)[][] {
  const MAX_ATTEMPTS = 1000;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const grid = tryGenerateTicket();
    if (grid && validateTicket(grid)) return grid;
  }

  throw new Error('Failed to generate valid ticket after max attempts');
}

function tryGenerateTicket(): (number | null)[][] | null {
  // Step 1: Decide how many numbers each column gets (1-3), total = 15
  // Distribute 15 numbers across 9 columns, each column 1-3
  const colCounts = distributeNumbers(15, 9, 1, 3);
  if (!colCounts) return null;

  // Step 2: Pick unique random numbers for each column
  const colNumbers: number[][] = [];
  for (let col = 0; col < 9; col++) {
    const [min, max] = COL_RANGES[col];
    const available = Array.from({ length: max - min + 1 }, (_, i) => i + min);
    const shuffled = shuffle(available);
    colNumbers.push(shuffled.slice(0, colCounts[col]).sort((a, b) => a - b));
  }

  // Step 3: Assign numbers to rows
  // We need to assign colNumbers[col] to rows such that each row has exactly 5
  // Each column distributes its numbers across rows (one per row max)

  // Build grid as null
  const grid: (number | null)[][] = [
    Array(9).fill(null),
    Array(9).fill(null),
    Array(9).fill(null),
  ];

  // For each column, assign its numbers to rows
  for (let col = 0; col < 9; col++) {
    const nums = colNumbers[col];
    const count = nums.length; // 1, 2, or 3
    const rows = shuffle([0, 1, 2]).slice(0, count);
    for (let i = 0; i < count; i++) {
      grid[rows[i]][col] = nums[i];
    }
  }

  // Step 4: Check each row has exactly 5 numbers
  const rowCounts = grid.map((row) => row.filter((n) => n !== null).length);
  if (rowCounts.some((c) => c !== 5)) {
    // Redistribute to fix
    return fixRowCounts(grid, colNumbers);
  }

  return grid;
}

function fixRowCounts(
  grid: (number | null)[][],
  colNumbers: number[][]
): (number | null)[][] | null {
  // Try a different assignment approach: assign column numbers to rows respecting the 5-per-row constraint
  const newGrid: (number | null)[][] = [
    Array(9).fill(null),
    Array(9).fill(null),
    Array(9).fill(null),
  ];

  const rowBudget = [5, 5, 5];

  // For columns with 3 numbers: one goes to each row
  // For columns with 2 numbers: pick 2 different rows
  // For columns with 1 number: pick 1 row

  for (let col = 0; col < 9; col++) {
    const nums = colNumbers[col];
    const count = nums.length;

    if (count === 3) {
      for (let r = 0; r < 3; r++) {
        newGrid[r][col] = nums[r];
        rowBudget[r]--;
      }
    }
  }

  const shuffledCols = shuffle(
    colNumbers
      .map((nums, col) => ({ nums, col }))
      .filter(({ nums }) => nums.length < 3)
  );

  for (const { nums, col } of shuffledCols) {
    const count = nums.length;
    // Find rows with remaining budget that don't have this col filled
    const eligibleRows = [0, 1, 2].filter(
      (r) => newGrid[r][col] === null && rowBudget[r] > 0
    );
    if (eligibleRows.length < count) return null;
    const chosen = shuffle(eligibleRows).slice(0, count);
    for (let i = 0; i < count; i++) {
      newGrid[chosen[i]][col] = nums[i];
      rowBudget[chosen[i]]--;
    }
  }

  const rowCounts = newGrid.map((row) => row.filter((n) => n !== null).length);
  if (rowCounts.some((c) => c !== 5)) return null;

  return newGrid;
}

function distributeNumbers(
  total: number,
  slots: number,
  min: number,
  max: number
): number[] | null {
  // Distribute `total` among `slots` bins, each bin in [min, max]
  const counts = Array(slots).fill(min);
  let remaining = total - slots * min;

  const indices = shuffle(Array.from({ length: slots }, (_, i) => i));
  for (const i of indices) {
    const add = Math.min(remaining, max - min);
    if (add <= 0) continue;
    const actual = Math.floor(Math.random() * (add + 1));
    counts[i] += actual;
    remaining -= actual;
    if (remaining <= 0) break;
  }

  if (remaining > 0) {
    // Try to add the remaining
    for (let i = 0; i < slots && remaining > 0; i++) {
      const space = max - counts[i];
      if (space > 0) {
        counts[i]++;
        remaining--;
      }
    }
  }

  return remaining === 0 ? counts : null;
}

export function validateTicket(grid: (number | null)[][]): boolean {
  if (grid.length !== 3) return false;
  if (grid.some((row) => row.length !== 9)) return false;

  // Each row must have exactly 5 numbers
  for (const row of grid) {
    const count = row.filter((n) => n !== null).length;
    if (count !== 5) return false;
  }

  // Each column must have at least 1 number
  for (let col = 0; col < 9; col++) {
    const colNums = grid.map((row) => row[col]).filter((n) => n !== null) as number[];
    if (colNums.length === 0) return false;

    // Check column range
    const [min, max] = COL_RANGES[col];
    if (colNums.some((n) => n < min || n > max)) return false;
  }

  // All numbers unique
  const all = grid.flat().filter((n) => n !== null) as number[];
  if (new Set(all).size !== all.length) return false;
  if (all.length !== 15) return false;

  return true;
}

/**
 * Get all actual numbers from a ticket (flat array, no nulls).
 */
export function getTicketNumbers(grid: (number | null)[][]): number[] {
  return grid.flat().filter((n) => n !== null) as number[];
}
