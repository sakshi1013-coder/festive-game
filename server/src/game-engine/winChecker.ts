/**
 * Server-authoritative win checker for Tambola / Housie
 * All functions operate on the ticket grid + server's called number list.
 * Never trust client-provided data.
 */

import { getTicketNumbers } from './ticketGenerator';

export interface PatternResult {
  pattern: string;
  completed: boolean;
  matchedNumbers: number[];
}

export interface PlayerProgress {
  markedCount: number;
  totalNumbers: number;
  progressPercent: number;
  patterns: Record<string, PatternResult>;
  completedPatterns: string[];
}

/**
 * Get numbers in a specific row that have been called.
 */
function getRowMatches(
  grid: (number | null)[][],
  rowIndex: number,
  calledNumbers: number[]
): number[] {
  const calledSet = new Set(calledNumbers);
  const rowNums = grid[rowIndex].filter((n) => n !== null) as number[];
  return rowNums.filter((n) => calledSet.has(n));
}

/**
 * Check if all 5 numbers in a row are called.
 */
function isRowComplete(
  grid: (number | null)[][],
  rowIndex: number,
  calledNumbers: number[]
): boolean {
  const rowNums = grid[rowIndex].filter((n) => n !== null) as number[];
  const calledSet = new Set(calledNumbers);
  return rowNums.length === 5 && rowNums.every((n) => calledSet.has(n));
}

export function checkEarlyFive(
  grid: (number | null)[][],
  calledNumbers: number[]
): PatternResult {
  const calledSet = new Set(calledNumbers);
  const allNums = getTicketNumbers(grid);
  const matched = allNums.filter((n) => calledSet.has(n));
  return {
    pattern: 'early-five',
    completed: matched.length >= 5,
    matchedNumbers: matched.slice(0, 5),
  };
}

export function checkTopLine(
  grid: (number | null)[][],
  calledNumbers: number[]
): PatternResult {
  const completed = isRowComplete(grid, 0, calledNumbers);
  return {
    pattern: 'top-line',
    completed,
    matchedNumbers: completed ? getRowMatches(grid, 0, calledNumbers) : [],
  };
}

export function checkMiddleLine(
  grid: (number | null)[][],
  calledNumbers: number[]
): PatternResult {
  const completed = isRowComplete(grid, 1, calledNumbers);
  return {
    pattern: 'middle-line',
    completed,
    matchedNumbers: completed ? getRowMatches(grid, 1, calledNumbers) : [],
  };
}

export function checkBottomLine(
  grid: (number | null)[][],
  calledNumbers: number[]
): PatternResult {
  const completed = isRowComplete(grid, 2, calledNumbers);
  return {
    pattern: 'bottom-line',
    completed,
    matchedNumbers: completed ? getRowMatches(grid, 2, calledNumbers) : [],
  };
}

export function checkFourCorners(
  grid: (number | null)[][],
  calledNumbers: number[]
): PatternResult {
  const calledSet = new Set(calledNumbers);
  // Four corners: first and last number of top and bottom rows
  const topRow = grid[0].filter((n) => n !== null) as number[];
  const bottomRow = grid[2].filter((n) => n !== null) as number[];

  const corners = [
    topRow[0],
    topRow[topRow.length - 1],
    bottomRow[0],
    bottomRow[bottomRow.length - 1],
  ].filter(Boolean);

  const matched = corners.filter((n) => calledSet.has(n));
  return {
    pattern: 'four-corners',
    completed: matched.length === 4 && corners.length === 4,
    matchedNumbers: matched,
  };
}

export function checkFullHouse(
  grid: (number | null)[][],
  calledNumbers: number[]
): PatternResult {
  const calledSet = new Set(calledNumbers);
  const allNums = getTicketNumbers(grid);
  const matched = allNums.filter((n) => calledSet.has(n));
  const completed = matched.length === allNums.length && allNums.length === 15;
  return {
    pattern: 'full-house',
    completed,
    matchedNumbers: matched,
  };
}

/**
 * Validate a win claim. All validation is server-side.
 */
export function validateWinClaim(
  pattern: string,
  grid: (number | null)[][],
  calledNumbers: number[]
): { valid: boolean; reason?: string } {
  let result: PatternResult;

  switch (pattern) {
    case 'early-five':
      result = checkEarlyFive(grid, calledNumbers);
      break;
    case 'top-line':
      result = checkTopLine(grid, calledNumbers);
      break;
    case 'middle-line':
      result = checkMiddleLine(grid, calledNumbers);
      break;
    case 'bottom-line':
      result = checkBottomLine(grid, calledNumbers);
      break;
    case 'four-corners':
      result = checkFourCorners(grid, calledNumbers);
      break;
    case 'full-house':
      result = checkFullHouse(grid, calledNumbers);
      break;
    default:
      return { valid: false, reason: `Unknown pattern: ${pattern}` };
  }

  if (!result.completed) {
    return { valid: false, reason: `Pattern ${pattern} is not yet complete` };
  }
  return { valid: true };
}

/**
 * Calculate full player progress across all configured patterns.
 */
export function calculatePlayerProgress(
  grid: (number | null)[][],
  calledNumbers: number[],
  activePatterns: string[]
): PlayerProgress {
  const allNums = getTicketNumbers(grid);
  const calledSet = new Set(calledNumbers);
  const markedCount = allNums.filter((n) => calledSet.has(n)).length;

  const patternCheckers: Record<string, (g: (number | null)[][], c: number[]) => PatternResult> = {
    'early-five': checkEarlyFive,
    'top-line': checkTopLine,
    'middle-line': checkMiddleLine,
    'bottom-line': checkBottomLine,
    'four-corners': checkFourCorners,
    'full-house': checkFullHouse,
  };

  const patterns: Record<string, PatternResult> = {};
  const completedPatterns: string[] = [];

  for (const p of activePatterns) {
    if (patternCheckers[p]) {
      const result = patternCheckers[p](grid, calledNumbers);
      patterns[p] = result;
      if (result.completed) completedPatterns.push(p);
    }
  }

  return {
    markedCount,
    totalNumbers: allNums.length,
    progressPercent: Math.round((markedCount / allNums.length) * 100),
    patterns,
    completedPatterns,
  };
}
