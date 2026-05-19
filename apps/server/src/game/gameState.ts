import { Board, createBoard, dropToken } from "./board.js";
import { checkWin, isDraw } from "./check_board.js";

type GameVariant = "connect4";
type GameStatus = "in_progress" | "finished" | "abandoned";

interface Players
{
  1: number; // userId du joueur 1
  2: number | null; // userId du joueur 2 (null si IA)
}

interface StateSnapshot
{
  board: Board;
  currentPlayer: 1 | 2;
  players: Players;
  variant: GameVariant;
  status: GameStatus;
  winner: 1 | 2 | null;
  timerP1: number;
  timerP2: number;
}

export class GameState
{
  board: Board;
  currentPlayer: 1 | 2;
  players: Players;
  variant: GameVariant;
  status: GameStatus;
  winner: 1 | 2 | null;
  timerP1: number;
  timerP2: number;

  constructor(players: Players, variant: GameVariant = "connect4", timePerPlayer = 300)
  {
    this.board = createBoard();
    this.currentPlayer = 1;
    this.players = players;
    this.variant = variant;
    this.status = "in_progress";
    this.winner = null;
    this.timerP1 = timePerPlayer;
    this.timerP2 = timePerPlayer;
  }

  // Joue un coup dans la colonne donnee, retourne false si le coup est invalide
  makeMove(col: number): boolean
  {
    if (this.status !== "in_progress")
      return false;

    const newBoard = dropToken(this.board, col, this.currentPlayer);
    if (newBoard === null)
      return false;

    this.board = newBoard;

    const gagnant = checkWin(this.board);
    if (gagnant !== null) {
      this.winner = gagnant;
      this.status = "finished";
    } else if (isDraw(this.board)) {
      this.status = "finished";
    } else {
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    }

    return true;
  }

  // Retourne l'etat complet a envoyer au front via Socket.io
  getState(): StateSnapshot
  {
    return {
      board: this.board,
      currentPlayer: this.currentPlayer,
      players: this.players,
      variant: this.variant,
      status: this.status,
      winner: this.winner,
      timerP1: this.timerP1,
      timerP2: this.timerP2,
    };
  }

  // Recharge un etat depuis la DB (pour la reconnexion)
  loadState(data: StateSnapshot): void
  {
    this.board = data.board;
    this.currentPlayer = data.currentPlayer;
    this.players = data.players;
    this.variant = data.variant;
    this.status = data.status;
    this.winner = data.winner;
    this.timerP1 = data.timerP1;
    this.timerP2 = data.timerP2;
  }
}
