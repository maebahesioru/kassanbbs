import type { Plugin } from "../types/PluginTypes";
import { PluginHookType } from "../types/PluginTypes";
import {
  createInitialGameState,
  type OthelloGameState,
} from "./helpers/othelloGameState";

type OthelloPlayer = 1 | 2;

const STONE_SYMBOLS = ["・", "●", "○"];
const PLAYER_NAMES = ["", "黒", "白"];
const COLS = "abcdefgh";

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

const isValidMove = (board: number[][], player: OthelloPlayer, row: number, col: number): boolean => {
  if (board[row][col] !== 0) return false;
  const opponent: OthelloPlayer = player === 1 ? 2 : 1;
  for (const [dr, dc] of DIRECTIONS) {
    let r = row + dr;
    let c = col + dc;
    let foundOpponent = false;
    while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === opponent) {
      foundOpponent = true;
      r += dr;
      c += dc;
    }
    if (foundOpponent && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === player) return true;
  }
  return false;
};

const placePiece = (board: number[][], player: OthelloPlayer, row: number, col: number): number[][] => {
  const newBoard = board.map((r) => [...r]);
  newBoard[row][col] = player;
  const opponent: OthelloPlayer = player === 1 ? 2 : 1;
  for (const [dr, dc] of DIRECTIONS) {
    const toFlip: [number, number][] = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8 && newBoard[r][c] === opponent) {
      toFlip.push([r, c]);
      r += dr;
      c += dc;
    }
    if (toFlip.length > 0 && r >= 0 && r < 8 && c >= 0 && c < 8 && newBoard[r][c] === player) {
      for (const [fr, fc] of toFlip) newBoard[fr][fc] = player;
    }
  }
  return newBoard;
};

const hasAnyValidMove = (board: number[][], player: OthelloPlayer): boolean => {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (isValidMove(board, player, i, j)) return true;
    }
  }
  return false;
};

const getValidMoves = (board: number[][], player: OthelloPlayer): [number, number][] => {
  const moves: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (isValidMove(board, player, i, j)) moves.push([i, j]);
    }
  }
  return moves;
};

const renderBoard = (board: number[][], hintMoves?: [number, number][]): string => {
  const hintSet = new Set(hintMoves?.map(([r, c]) => `${r},${c}`));
  let output = "  ａｂｃｄｅｆｇｈ\n";
  for (let i = 0; i < 8; i++) {
    output += `${i + 1} `;
    for (let j = 0; j < 8; j++) {
      if (board[i][j] !== 0) {
        output += STONE_SYMBOLS[board[i][j]];
      } else if (hintSet?.has(`${i},${j}`)) {
        output += "＊";
      } else {
        output += "・";
      }
    }
    output += "\n";
  }
  const blackCount = board.flat().filter((c) => c === 1).length;
  const whiteCount = board.flat().filter((c) => c === 2).length;
  output += `\n●: ${blackCount}  ○: ${whiteCount}`;
  return output;
};

const getResultText = (state: OthelloGameState): string => {
  const blackCount = state.board.flat().filter((c) => c === 1).length;
  const whiteCount = state.board.flat().filter((c) => c === 2).length;
  if (blackCount > whiteCount) return `${state.player1Name}(●)の勝利！ ${blackCount}対${whiteCount}`;
  if (whiteCount > blackCount) return `${state.player2Name}(○)の勝利！ ${whiteCount}対${blackCount}`;
  return `引き分け！ ${blackCount}対${whiteCount}`;
};

const getStoneForPlayer = (state: OthelloGameState, authorName: string): string => {
  if (authorName === state.player1Name) return "●";
  if (authorName === state.player2Name) return "○";
  return "";
};

const HELP_TEXT = [
  "【オセロゲーム ヘルプ】",
  "=== 開始 ===",
  "  !othello:start                     - ゲーム開始（黒）",
  "  !othello:opp:>>N                   - N番目の投稿者を対戦相手に指定（startと同時使用）",
  "  !othello:join <gameId>             - ゲームに参加",
  "=== 操作 ===",
  "  !othello a1                        - 指定位置に石を置く（例: a1, h8）",
  "  !othello:pass                      - パス",
  "=== 情報 ===",
  "  !othello:view                      - 現在の盤面を表示",
  "  !othello:hint                      - 置ける場所を＊で表示",
  "  !othello:result                    - 最終結果を表示",
  "=== 終了 ===",
  "  !othello:surrender                  - 投了",
  "  !othello:surrender <gameId>         - 指定ゲームで投了",
  "=== 備考 ===",
  "  64手で自動終了します。",
].join("\n");

const inMemoryGames = new Map<string, OthelloGameState>();

const findGameForPlayer = (authorName: string): { gameId: string; state: OthelloGameState } | null => {
  for (const [gameId, state] of inMemoryGames) {
    if (!state.isComplete && (state.player1Name === authorName || state.player2Name === authorName)) {
      return { gameId, state };
    }
  }
  return null;
};

const switchPlayerOrEnd = (state: OthelloGameState): boolean => {
  const nextPlayer: OthelloPlayer = state.currentPlayer === 1 ? 2 : 1;
  if (hasAnyValidMove(state.board, nextPlayer)) {
    state.currentPlayer = nextPlayer;
    state.passCount = 0;
    return false;
  }
  if (hasAnyValidMove(state.board, state.currentPlayer)) {
    state.passCount++;
    return false;
  }
  const blackCount = state.board.flat().filter((c) => c === 1).length;
  const whiteCount = state.board.flat().filter((c) => c === 2).length;
  state.isComplete = true;
  state.winner = blackCount > whiteCount ? 1 : whiteCount > blackCount ? 2 : 0;
  return true;
};

export const createOthelloPlugin = (): Plugin => ({
  id: "builtin-othello",
  name: "オセロゲーム",
  description: "スレッド内でオセロが遊べます",
  hookTypes: [PluginHookType.THREAD_CREATE, PluginHookType.RESPONSE_POST, PluginHookType.READ_DISPLAY],
  isActive: false,

  async onThreadCreate(params) {
    const { title, content } = params;
    const combined = `${title}\n${content}`;
    if (combined.includes("!othello:start") || combined.includes("!othello start")) {
      return {
        ...params,
        content: `${params.content}\n\n【オセロ】このスレッドでオセロが開始されました。`,
      };
    }
    return params;
  },

  async onResponsePost(params) {
    const { authorName, content } = params;
    let resultContent = content;

    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("!othello")) continue;

      const parts = trimmed.split(/\s+/);
      const rawCommand = parts[0].toLowerCase();
      const arg = parts.slice(1).join(" ");

      // Full colon-based command parsing
      const colonMatch = rawCommand.match(/^!othello(?::(start|opp|pass|hint|view|result|surrender|join|help))?$/);
      const isLegacyStart = rawCommand === "!othello" && parts[1]?.toLowerCase() === "start";

      if (trimmed === "!othello:help") {
        resultContent = resultContent.replace(trimmed, HELP_TEXT);
        continue;
      }

      if (rawCommand === "!othello:start" || isLegacyStart) {
        const gameId = crypto.randomUUID();
        const state = createInitialGameState(authorName || "プレイヤー1", "");
        const oppMatch = content.match(/!othello:opp:>>(\d+)/);
        if (oppMatch) {
          state.targetOppPostNumber = parseInt(oppMatch[1], 10);
        }
        inMemoryGames.set(gameId, state);
        resultContent = resultContent.replace(
          trimmed,
          `【オセロゲーム開始】\nゲームID: ${gameId}\n${renderBoard(state.board)}\n現在: ●(${authorName})の番`
        );
        continue;
      }

      if (rawCommand === "!othello:join") {
        const gameId = arg;
        if (!gameId) {
          resultContent = resultContent.replace(trimmed, "エラー: ゲームIDを指定してください (例: !othello:join <gameId>)");
          continue;
        }
        const state = inMemoryGames.get(gameId);
        if (!state) {
          resultContent = resultContent.replace(trimmed, "エラー: 指定されたゲームが見つかりません");
          continue;
        }
        if (state.player2Name) {
          resultContent = resultContent.replace(trimmed, "エラー: 既に参加者がいます");
          continue;
        }
        state.player2Name = authorName || "プレイヤー2";
        state.player2HashId = params.authorName || "opponent";
        resultContent = resultContent.replace(
          trimmed,
          `【オセロ】${authorName}が参加しました\n${renderBoard(state.board)}\n現在: ●(${state.player1Name})の番`
        );
        continue;
      }

      if (rawCommand === "!othello:surrender") {
        const surrenderGameId = arg;
        const found = surrenderGameId
          ? inMemoryGames.get(surrenderGameId)
          : findGameForPlayer(authorName || "")?.state;

        if (!found) {
          resultContent = resultContent.replace(trimmed, "エラー: 参加中のゲームがありません");
          continue;
        }
        for (const [gid, st] of inMemoryGames) {
          if (st === found) {
            found.isComplete = true;
            const winnerName = st.currentPlayer === 1 ? st.player2Name : st.player1Name;
            resultContent = resultContent.replace(trimmed, `【オセロ】${authorName}が投了しました。${winnerName}の勝利です！`);
            inMemoryGames.delete(gid);
            break;
          }
        }
        continue;
      }

      if (rawCommand === "!othello:pass") {
        const game = findGameForPlayer(authorName || "");
        if (!game) {
          resultContent = resultContent.replace(trimmed, "エラー: 参加中のゲームがありません");
          continue;
        }
        if (
          (game.state.currentPlayer === 1 && game.state.player1Name !== authorName) ||
          (game.state.currentPlayer === 2 && game.state.player2Name !== authorName)
        ) {
          resultContent = resultContent.replace(trimmed, "相手の番です");
          continue;
        }
        if (hasAnyValidMove(game.state.board, game.state.currentPlayer)) {
          resultContent = resultContent.replace(trimmed, "置ける場所があります。パスできません");
          continue;
        }
        game.state.passCount++;
        game.state.currentPlayer = game.state.currentPlayer === 1 ? 2 : 1;
        const currentName = game.state.currentPlayer === 1 ? game.state.player1Name : game.state.player2Name;
        resultContent = resultContent.replace(
          trimmed,
          `【パス】${renderBoard(game.state.board)}\n現在: ${currentName}の番`
        );
        continue;
      }

      if (rawCommand === "!othello:hint") {
        const game = findGameForPlayer(authorName || "");
        if (!game) {
          resultContent = resultContent.replace(trimmed, "エラー: 参加中のゲームがありません");
          continue;
        }
        const moves = getValidMoves(game.state.board, game.state.currentPlayer);
        if (moves.length === 0) {
          resultContent = resultContent.replace(trimmed, `【ヒント】置ける場所がありません。!othello:pass でパスしてください`);
        } else {
          const moveStr = moves.map(([r, c]) => `${COLS[c]}${r + 1}`).join(", ");
          resultContent = resultContent.replace(
            trimmed,
            `【ヒント】置ける場所: ${moveStr}\n${renderBoard(game.state.board, moves)}`
          );
        }
        continue;
      }

      if (rawCommand === "!othello:view") {
        const game = findGameForPlayer(authorName || "");
        if (!game) {
          resultContent = resultContent.replace(trimmed, "エラー: 参加中のゲームがありません");
          continue;
        }
        const currentName = game.state.currentPlayer === 1 ? game.state.player1Name : game.state.player2Name;
        resultContent = resultContent.replace(
          trimmed,
          `${renderBoard(game.state.board)}\n現在: ${currentName}(${PLAYER_NAMES[game.state.currentPlayer]})の番`
        );
        continue;
      }

      if (rawCommand === "!othello:result") {
        const game = findGameForPlayer(authorName || "");
        if (!game) {
          resultContent = resultContent.replace(trimmed, "エラー: 参加中のゲームがありません");
          continue;
        }
        if (!game.state.isComplete) {
          resultContent = resultContent.replace(trimmed, "ゲームはまだ終了していません");
          continue;
        }
        resultContent = resultContent.replace(trimmed, `【オセロ結果】\n${renderBoard(game.state.board)}\n${getResultText(game.state)}`);
        continue;
      }

      // Coordinate move (e.g. "!othello a1")
      const coordMatch = rawCommand.match(/^!othello(?:[: ]([a-hA-H][1-8]))?$/);
      if (coordMatch && coordMatch[1]) {
        const coord = coordMatch[1].toLowerCase();
        const col = coord.charCodeAt(0) - "a".charCodeAt(0);
        const row = parseInt(coord[1]) - 1;

        const game = findGameForPlayer(authorName || "");
        if (!game) {
          resultContent = resultContent.replace(trimmed, "エラー: 参加中のゲームがありません。先に !othello:start で開始してください");
          continue;
        }

        if (!game.state.player2Name && game.state.targetOppPostNumber) {
          resultContent = resultContent.replace(trimmed, "エラー: 対戦相手がまだ参加していません");
          continue;
        }

        if (
          (game.state.currentPlayer === 1 && game.state.player1Name !== authorName) ||
          (game.state.currentPlayer === 2 && game.state.player2Name !== authorName)
        ) {
          resultContent = resultContent.replace(trimmed, "相手の番です");
          continue;
        }

        if (!isValidMove(game.state.board, game.state.currentPlayer, row, col)) {
          resultContent = resultContent.replace(trimmed, "そこには置けません");
          continue;
        }

        game.state.board = placePiece(game.state.board, game.state.currentPlayer, row, col);
        game.state.moveCount++;

        const gameEnded = switchPlayerOrEnd(game.state);

        if (game.state.moveCount >= 64 || gameEnded) {
          game.state.isComplete = true;
          const result = getResultText(game.state);
          resultContent = resultContent.replace(trimmed, `【オセロ終了】\n${renderBoard(game.state.board)}\n${result}`);
          inMemoryGames.delete(game.gameId);
          continue;
        }

        const currentName = game.state.currentPlayer === 1 ? game.state.player1Name : game.state.player2Name;
        resultContent = resultContent.replace(
          trimmed,
          `${renderBoard(game.state.board)}\n現在: ${currentName}(${PLAYER_NAMES[game.state.currentPlayer]})の番`
        );
        continue;
      }

      // Legacy format "!othello <move>" (e.g. "!othello a1")
      if (rawCommand === "!othello" && parts[1] && /^[a-hA-H][1-8]$/.test(parts[1])) {
        const coord = parts[1].toLowerCase();
        const col = coord.charCodeAt(0) - "a".charCodeAt(0);
        const row = parseInt(coord[1]) - 1;

        const game = findGameForPlayer(authorName || "");
        if (!game) {
          resultContent = resultContent.replace(trimmed, "エラー: 参加中のゲームがありません。先に !othello start で開始してください");
          continue;
        }

        if (
          (game.state.currentPlayer === 1 && game.state.player1Name !== authorName) ||
          (game.state.currentPlayer === 2 && game.state.player2Name !== authorName)
        ) {
          resultContent = resultContent.replace(trimmed, "相手の番です");
          continue;
        }

        if (!isValidMove(game.state.board, game.state.currentPlayer, row, col)) {
          resultContent = resultContent.replace(trimmed, "そこには置けません");
          continue;
        }

        game.state.board = placePiece(game.state.board, game.state.currentPlayer, row, col);
        game.state.moveCount++;

        const gameEnded = switchPlayerOrEnd(game.state);

        if (game.state.moveCount >= 64 || gameEnded) {
          game.state.isComplete = true;
          const result = getResultText(game.state);
          resultContent = resultContent.replace(trimmed, `【オセロ終了】\n${renderBoard(game.state.board)}\n${result}`);
          inMemoryGames.delete(game.gameId);
          continue;
        }

        const currentName = game.state.currentPlayer === 1 ? game.state.player1Name : game.state.player2Name;
        resultContent = resultContent.replace(
          trimmed,
          `${renderBoard(game.state.board)}\n現在: ${currentName}(${PLAYER_NAMES[game.state.currentPlayer]})の番`
        );
      }
    }

    return { ...params, content: resultContent };
  },

  async onReadDisplay(content: string) {
    return content;
  },
});
