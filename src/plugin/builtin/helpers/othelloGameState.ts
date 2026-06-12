export type OthelloGameState = {
  board: number[][];
  currentPlayer: 1 | 2;
  player1HashId: string;
  player2HashId: string;
  player1Name: string;
  player2Name: string;
  moveCount: number;
  isComplete: boolean;
  winner: 0 | 1 | 2;
  targetOppPostNumber?: number;
  passCount: number;
};

export const serializeGameState = (state: OthelloGameState): string => JSON.stringify(state);
export const deserializeGameState = (json: string): OthelloGameState => JSON.parse(json);

export const createInitialGameState = (
  player1Name: string,
  player1HashId: string,
): OthelloGameState => {
  const board: number[][] = Array(8).fill(null).map(() => Array(8).fill(0));
  board[3][3] = 2;
  board[3][4] = 1;
  board[4][3] = 1;
  board[4][4] = 2;
  return {
    board,
    currentPlayer: 1,
    player1HashId,
    player2HashId: "",
    player1Name,
    player2Name: "",
    moveCount: 0,
    isComplete: false,
    winner: 0,
    passCount: 0,
  };
};
