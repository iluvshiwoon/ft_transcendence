import { Board, dropToken, getValidMoves } from "./board.js";
import { checkWin, isDraw } from "./check_board.js";

// Calcule le score d'une fenetre de 4 cases pour l'IA
function scoreWindow(window: number[], aiPlayer: 1 | 2): number
{
  const opponent = aiPlayer === 1 ? 2 : 1;
  let nbIA = 0, nbAdv = 0, nbVide = 0;

  for (const cell of window) {
    if (cell === aiPlayer)
      nbIA++;
    else if (cell === opponent)
      nbAdv++;
    else
      nbVide++;
  }
  if (nbIA === 4)
    return 100;
  if (nbIA === 3 && nbVide === 1)
    return 5;
  if (nbIA === 2 && nbVide === 2)
    return 2;
  if (nbAdv === 3 && nbVide === 1)
    return -4;
  return 0;
}

// Evalue le plateau entier en decoupant toutes les fenetres de 4 cases possibles
function scoreBoard(board: Board, aiPlayer: 1 | 2): number
{
  const rows = board.length;
  const cols = board[0].length;
  let score = 0;

  // Bonus pour la colonne centrale (strategiquement plus forte)
  const colCentre = Math.floor(cols / 2);
  for (let r = 0; r < rows; r++) {
    if (board[r][colCentre] === aiPlayer) score += 3;
  }
  // Fenetres horizontales
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols - 4; c++) {
      score += scoreWindow([board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]], aiPlayer);
    }
  }
  // Fenetres verticales
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r <= rows - 4; r++) {
      score += scoreWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]], aiPlayer);
    }
  }
  // Fenetres diagonales ↘
  for (let r = 0; r <= rows - 4; r++) {
    for (let c = 0; c <= cols - 4; c++) {
      score += scoreWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]], aiPlayer);
    }
  }
  // Fenetres diagonales ↙
  for (let r = 0; r <= rows - 4; r++) {
    for (let c = 3; c < cols; c++) {
      score += scoreWindow([board[r][c], board[r+1][c-1], board[r+2][c-2], board[r+3][c-3]], aiPlayer);
    }
  }
  return score;
}

function minimax(board: Board, depth: number, isAI: boolean, aiPlayer: 1 | 2): number
{
  const opponent: 1 | 2 = aiPlayer === 1 ? 2 : 1;
  const winner = checkWin(board);

  if (winner === aiPlayer)
    return 1000 + depth;
  if (winner === opponent)
    return -(1000 + depth);
  if (isDraw(board) || depth === 0)
    return scoreBoard(board, aiPlayer);

  const coups = getValidMoves(board);
  let best = isAI ? -Infinity : Infinity;

  for (const col of coups) {
    const joueur = isAI ? aiPlayer : opponent;
    const score = minimax(dropToken(board, col, joueur)!, depth - 1, !isAI, aiPlayer);
    if (isAI)
      best = score > best ? score : best;
    else
      best = score < best ? score : best;
  }
  return best;
}

// Retourne la meilleure colonne pour l'IA (profondeur 3, sans alpha-beta)
export function getBestMove(board: Board, aiPlayer: 1 | 2 = 2): number 
{
  const coups = getValidMoves(board);
  let BestScore = -Infinity;
  let BestCol = coups[Math.floor(coups.length / 2)];

  for (const col of coups) {
    const score = minimax(dropToken(board, col, aiPlayer)!, 2, false, aiPlayer);
    if (score > BestScore) {
      BestScore = score;
      BestCol = col;
    }
  }
  return BestCol;
}
