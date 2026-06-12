import { err, ok } from "neverthrow";
import { uuidv7 } from "uuidv7";

import { DatabaseError } from "../../shared/types/Error";
import { parseCommands, getDailyOmikuji } from "../services/userCommandService";
import { updateThreadTitleRepository } from "../../conversation/repositories/updateThreadTitleRepository";
import { softDeleteResponseRepository } from "../../conversation/repositories/softDeleteResponseRepository";
import { updateResponseContentRepository } from "../../conversation/repositories/updateResponseContentRepository";
import { updateThreadAttrsRepository } from "../../conversation/repositories/updateThreadAttrsRepository";
import { upsertNinpochoRecordRepository } from "../../ninpocho/repositories/upsertNinpochoRecordRepository";
import { addAdminLogRepository } from "../../adminlog/repositories/addAdminLogRepository";
import { sendGoldUsecase, throwGoldUsecase } from "../../gold/usecases/goldTransferUsecase";
import {
  createThreadAttr,
} from "../../conversation/domain/read/ReadThreadAttr";
import { createWriteThreadId } from "../../conversation/domain/write/WriteThreadId";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

const VOTE_THRESHOLD = 5;

const getThreadResponsesForCommands = async (
  { sql, logger }: VakContext,
  threadId: string
): Promise<
  Result<Array<{ number: number; authorHashId: string }>, DatabaseError>
> => {
  logger.debug({
    operation: "processCommands_getThreadResponses",
    threadId,
    message: "Fetching thread responses for command processing",
  });

  try {
    const rows = await sql<
      { response_number: number; hash_id: string }[]
    >`
        SELECT response_number, hash_id
        FROM responses
        WHERE thread_id = ${threadId}::uuid
          AND is_deleted = FALSE
        ORDER BY response_number
      `;

    return ok(
      rows.map((r) => ({
        number: Number(r.response_number),
        authorHashId: String(r.hash_id),
      }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "processCommands_getThreadResponses",
      error,
      threadId,
      message: `Database error while fetching thread responses: ${message}`,
    });
    return err(
      new DatabaseError(`レスポンス取得中にエラーが発生しました: ${message}`, error)
    );
  }
};

const getThreadAttrsForCommands = async (
  { sql, logger }: VakContext,
  threadId: string
): Promise<Result<Record<string, unknown>, DatabaseError>> => {
  logger.debug({
    operation: "processCommands_getThreadAttrs",
    threadId,
    message: "Fetching thread attrs for command processing",
  });

  try {
    const rows = await sql<{ attrs: unknown }[]>`
        SELECT attrs FROM threads WHERE id = ${threadId}::uuid FOR UPDATE
      `;

    if (!rows || rows.length !== 1) {
      return err(new DatabaseError("スレッドが見つかりません"));
    }

    return ok((rows[0].attrs as Record<string, unknown>) ?? {});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "processCommands_getThreadAttrs",
      error,
      threadId,
      message: `Database error while fetching thread attrs: ${message}`,
    });
    return err(
      new DatabaseError(`属性取得中にエラーが発生しました: ${message}`, error)
    );
  }
};

const checkIsThreadCreator = (
  threadResponses: Array<{ number: number; authorHashId: string }>,
  currentHashId: string
): boolean => {
  const firstResponse = threadResponses.find((r) => r.number === 1);
  if (!firstResponse) return false;
  return firstResponse.authorHashId === currentHashId;
};

export const processCommandsUsecase = async (
  vakContext: VakContext,
  params: {
    content: string;
    threadId: string;
    authorHashId: string;
    ninpochoLevel: number;
    hasCapPermission: boolean;
    isNewThread: boolean;
    ipAddressRaw: string;
  }
): Promise<
  Result<{ processedContent: string; commandResponse?: string; nameOverride?: string }, Error>
> => {
  const { logger } = vakContext;

  logger.info({
    operation: "processCommands",
    threadId: params.threadId,
    isNewThread: params.isNewThread,
    message: "Starting command processing",
  });

  if (params.isNewThread) {
    logger.debug({
      operation: "processCommands",
      message: "Skipping command processing for new thread",
    });
    return ok({ processedContent: params.content });
  }

  const threadResponsesResult = await getThreadResponsesForCommands(
    vakContext,
    params.threadId
  );
  if (threadResponsesResult.isErr()) {
    logger.error({
      operation: "processCommands",
      error: threadResponsesResult.error,
      threadId: params.threadId,
      message: "Failed to fetch thread responses for command processing",
    });
    return err(threadResponsesResult.error);
  }

  const attrsResult = await getThreadAttrsForCommands(
    vakContext,
    params.threadId
  );
  if (attrsResult.isErr()) {
    logger.error({
      operation: "processCommands",
      error: attrsResult.error,
      threadId: params.threadId,
      message: "Failed to fetch thread attrs for command processing",
    });
    return err(attrsResult.error);
  }

  const isThreadCreator = checkIsThreadCreator(
    threadResponsesResult.value,
    params.authorHashId
  );

  const commandResult = parseCommands(params.content, {
    threadId: params.threadId,
    isThreadCreator,
    hasCapPermission: params.hasCapPermission,
    ninpochoLevel: params.ninpochoLevel,
    existingAttrs: attrsResult.value,
    threadResponses: threadResponsesResult.value,
    currentHashId: params.authorHashId,
  });

  if (commandResult.commands.length === 0) {
    logger.debug({
      operation: "processCommands",
      threadId: params.threadId,
      message: "No commands found in content",
    });
    return ok({ processedContent: params.content });
  }

  const responseMessages: string[] = [];
  let nameOverride: string | undefined;

  for (const cmd of commandResult.commands) {
    logger.debug({
      operation: "processCommands",
      threadId: params.threadId,
      action: cmd.action,
      params: cmd.params,
      message: "Processing command",
    });

    if (cmd.response && cmd.response.type === "error") {
      responseMessages.push(`[${cmd.action}] エラー: ${cmd.response.message}`);
      continue;
    }

    if (cmd.action === "changetitle") {
      const titleResult = await updateThreadTitleRepository(vakContext, {
        threadId: params.threadId,
        title: cmd.params.title,
      });
      if (titleResult.isErr()) {
        logger.error({
          operation: "processCommands",
          error: titleResult.error,
          threadId: params.threadId,
          message: "Failed to update thread title",
        });
        responseMessages.push("[changetitle] タイトル変更に失敗しました");
      } else {
        responseMessages.push("[changetitle] タイトルを変更しました");
        await addAdminLogRepository(vakContext, {
          action: "スレッドタイトル変更",
          detail: `スレッドID: ${params.threadId}, 新タイトル: ${cmd.params.title}`,
          ipAddress: params.ipAddressRaw,
          logType: "ADMIN",
        });
      }
    } else if (cmd.action === "delete") {
      const target = cmd.params.target;
      if (target.startsWith(">>")) {
        const rangeMatch = target.match(/^>>(\d+)-(\d+)$/);
        const singleMatch = target.match(/^>>(\d+)$/);

        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          if (start <= 1) {
            responseMessages.push(`[delete] レス番号>>1は削除できません`);
            continue;
          }
          const effectiveStart = Math.max(start, 2);
          let deletedCount = 0;
          for (let i = effectiveStart; i <= end; i++) {
            const delResult = await softDeleteResponseRepository(vakContext, {
              threadId: params.threadId,
              responseNumber: i,
              deletedByHashId: params.authorHashId,
            });
            if (delResult.isOk()) {
              deletedCount++;
            }
          }
          if (deletedCount > 0) {
            responseMessages.push(`[delete] ${deletedCount}件のレスを削除しました`);
            await addAdminLogRepository(vakContext, {
              action: "レス削除",
              detail: `スレッドID: ${params.threadId}, レス番号: ${start}-${end}, 削除数: ${deletedCount}`,
              ipAddress: params.ipAddressRaw,
              logType: "ADMIN",
            });
          } else {
            responseMessages.push("[delete] 削除対象のレスが見つかりませんでした");
          }
        } else if (singleMatch) {
          const num = parseInt(singleMatch[1], 10);
          if (num === 1) {
            responseMessages.push("[delete] レス番号>>1は削除できません");
            continue;
          }
          const delResult = await softDeleteResponseRepository(vakContext, {
            threadId: params.threadId,
            responseNumber: num,
            deletedByHashId: params.authorHashId,
          });
          if (delResult.isErr()) {
            responseMessages.push(`[delete] >>${num}の削除に失敗しました`);
          } else {
            responseMessages.push(`[delete] >>${num}を削除しました`);
            await addAdminLogRepository(vakContext, {
              action: "レス削除",
              detail: `スレッドID: ${params.threadId}, レス番号: ${num}`,
              ipAddress: params.ipAddressRaw,
              logType: "ADMIN",
            });
          }
        }
      }
    } else if (cmd.action === "add") {
      const num = parseInt(cmd.params.number, 10);
      if (isNaN(num)) {
        responseMessages.push("[add] 無効なレス番号です");
        continue;
      }
      const addResult = await updateResponseContentRepository(vakContext, {
        threadId: params.threadId,
        responseNumber: num,
        appendText: cmd.params.text,
        updatedByHashId: params.authorHashId,
      });
      if (addResult.isErr()) {
        responseMessages.push(`[add] >>${num}への追記に失敗しました`);
      } else {
        responseMessages.push(`[add] >>${num}に追記しました`);
      }
    } else if (cmd.action === "vote") {
      const targetNum = parseInt(cmd.params.target, 10);
      if (cmd.params.selfVote === "true") {
        const ninpochoResult = await upsertNinpochoRecordRepository(
          vakContext,
          {
            id: null,
            hashId: params.authorHashId,
            ipAddress: params.ipAddressRaw,
            errorCount: 999,
            banLevel: 9999,
            banUntil: new Date("2099-12-31T23:59:59Z"),
          }
        );
        if (ninpochoResult.isErr()) {
          responseMessages.push("[vote] 自己投票BAN処理に失敗しました");
        } else {
          responseMessages.push("[vote] 自己投票によりBANされました");
        }
        continue;
      }

      const targetHashId = cmd.params.targetHashId;
      if (!targetHashId) {
        responseMessages.push("[vote] 対象の投稿者が見つかりません");
        continue;
      }

      try {
        const { sql } = vakContext;
        await sql`
            INSERT INTO thread_votes(id, thread_id, target_response_number, voter_hash_id)
            VALUES(${uuidv7()}, ${params.threadId}::uuid, ${targetNum}, ${params.authorHashId})
            ON CONFLICT (thread_id, target_response_number, voter_hash_id) DO NOTHING
          `;

        const voteCountResult = await sql<{ count: number }[]>`
            SELECT COUNT(*)::int as count
            FROM thread_votes
            WHERE thread_id = ${params.threadId}::uuid
              AND target_response_number = ${targetNum}
          `;
        const voteCount = Number(voteCountResult[0]?.count ?? 0);

        if (voteCount >= VOTE_THRESHOLD) {
          const banResult = await upsertNinpochoRecordRepository(
            vakContext,
            {
              id: null,
              hashId: targetHashId,
              ipAddress: "",
              errorCount: 999,
              banLevel: 9999,
              banUntil: new Date("2099-12-31T23:59:59Z"),
            }
          );
          if (banResult.isErr()) {
            responseMessages.push(`[vote] BAN処理に失敗しました (投票数: ${voteCount})`);
          } else {
            responseMessages.push(`[vote] 投票数が${VOTE_THRESHOLD}に達したためBANしました`);
            await addAdminLogRepository(vakContext, {
              action: "投票BAN",
              detail: `スレッドID: ${params.threadId}, 対象レス番号: ${targetNum}, 投票数: ${voteCount}`,
              ipAddress: params.ipAddressRaw,
              logType: "ADMIN",
            });
          }
        } else {
          responseMessages.push(`[vote] >>${targetNum}に投票しました (現在${voteCount}/${VOTE_THRESHOLD})`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        logger.error({
          operation: "processCommands_vote",
          error,
          threadId: params.threadId,
          message: `Database error while processing vote: ${message}`,
        });
        responseMessages.push("[vote] 投票処理中にエラーが発生しました");
      }
    } else if (cmd.action === "attr") {
      if (cmd.response) {
        responseMessages.push(cmd.response.message);
      }
    } else if (cmd.action === "omikuji") {
      const today = new Date().toISOString().split("T")[0];
      const seed = `${today}_${params.authorHashId}`;
      const omikujiResult = getDailyOmikuji(seed);
      if (cmd.response) {
        responseMessages.push(`[omikuji] ${omikujiResult.rank} ${omikujiResult.message}`);
      }
      nameOverride = omikujiResult.rank;
    } else if (cmd.action === "extend") {
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const newAttrs: Record<string, unknown> = {
          ...attrsResult.value,
          extendId: cmd.params.id,
          extendSlip: cmd.params.slip,
          extendLines: parseInt(cmd.params.lines, 10),
          extendSize: parseInt(cmd.params.size, 10),
        };
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[extend] 無効な属性値です: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[extend] 拡張設定に失敗しました");
          } else {
            responseMessages.push("[extend] 拡張設定を更新しました");
          }
        }
      }
    } else if (cmd.action === "delcmd") {
      const newAttrs: Record<string, unknown> = {};
      for (const key of Object.keys(attrsResult.value)) {
        if (
          key !== "noId" &&
          key !== "force774" &&
          key !== "custom774" &&
          key !== "ninpochoLevel" &&
          key !== "sageOnly" &&
          key !== "password" &&
          key !== "customMaxRes" &&
          key !== "threadPassword" &&
          key !== "stopped" &&
          key !== "pooled" &&
          key !== "live" &&
          key !== "slipLevel" &&
          key !== "bans" &&
          key !== "hideNushi" &&
          key !== "sticky" &&
          key !== "noPool"
        ) {
          (newAttrs as Record<string, unknown>)[key] = (
            attrsResult.value as Record<string, unknown>
          )[key];
        }
      }
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[delcmd] 属性のリセットに失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[delcmd] 属性のリセットに失敗しました");
          } else {
            responseMessages.push("[delcmd] コマンドによる属性をリセットしました");
          }
        }
      }
    } else if (cmd.action === "loadattr") {
      const sourceAttrsResult = await getThreadAttrsForCommands(
        vakContext,
        cmd.params.threadId
      );
      if (sourceAttrsResult.isErr()) {
        responseMessages.push("[loadattr] コピー元スレッドの属性取得に失敗しました");
      } else {
        const writeThreadIdResult = createWriteThreadId(params.threadId);
        if (writeThreadIdResult.isOk()) {
          const attrsValidated = createThreadAttr(sourceAttrsResult.value);
          if (attrsValidated.isErr()) {
            responseMessages.push(`[loadattr] 無効な属性値です: ${attrsValidated.error.message}`);
          } else {
            const updateResult = await updateThreadAttrsRepository(vakContext, {
              threadId: writeThreadIdResult.value,
              attrs: attrsValidated.value,
            });
            if (updateResult.isErr()) {
              responseMessages.push("[loadattr] 属性のコピーに失敗しました");
            } else {
              responseMessages.push("[loadattr] 属性をコピーしました");
            }
          }
        }
      }
    } else if (cmd.action === "noid") {
      const currentNoId = attrsResult.value.noId as boolean | undefined;
      const newNoId = !currentNoId;
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        noId: newNoId,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[noid] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[noid] ID表示設定の変更に失敗しました");
          } else {
            responseMessages.push(`[noid] ID表示を${newNoId ? "非表示" : "表示"}にしました`);
          }
        }
      }
    } else if (cmd.action === "changeid") {
      const currentNoId = attrsResult.value.noId as boolean | undefined;
      const newNoId = !currentNoId;
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        noId: newNoId,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[changeid] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[changeid] ID表示設定の変更に失敗しました");
          } else {
            responseMessages.push(`[changeid] ID表示を${newNoId ? "非表示" : "表示"}にしました`);
          }
        }
      }
    } else if (cmd.action === "ninlv") {
      const level = parseInt(cmd.params.level, 10);
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        ninpochoLevel: level,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[ninlv] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[ninlv] 忍法帖レベル設定の変更に失敗しました");
          } else {
            responseMessages.push(`[ninlv] 忍法帖レベルを${level}に設定しました`);
          }
        }
      }
    } else if (cmd.action === "password") {
      const password = cmd.params.password;
      if (!password) {
        responseMessages.push("[password] パスワードが指定されていません");
        continue;
      }
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        password,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[password] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[password] パスワード設定に失敗しました");
          } else {
            responseMessages.push("[password] スレッドパスワードを設定しました");
            await addAdminLogRepository(vakContext, {
              action: "パスワード設定",
              detail: `スレッドID: ${params.threadId}`,
              ipAddress: params.ipAddressRaw,
              logType: "ADMIN",
            });
          }
        }
      }
    } else if (cmd.action === "maxres") {
      const maxRes = parseInt(cmd.params.maxRes, 10);
      if (isNaN(maxRes) || maxRes < 1) {
        responseMessages.push("[maxres] 無効な値です");
        continue;
      }
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        customMaxRes: maxRes,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[maxres] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[maxres] 最大レス数設定に失敗しました");
          } else {
            responseMessages.push(`[maxres] 最大レス数を${maxRes}に設定しました`);
          }
        }
      }
    } else if (cmd.action === "forcesage") {
      const currentSageOnly = attrsResult.value.sageOnly as boolean | undefined;
      const newSageOnly = !currentSageOnly;
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        sageOnly: newSageOnly,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[sage] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[sage] sage設定の変更に失敗しました");
          } else {
            responseMessages.push(`[sage] sage進行を${newSageOnly ? "有効" : "無効"}にしました`);
          }
        }
      }
    } else if (cmd.action === "force774") {
      const currentForce774 = attrsResult.value.force774 as boolean | undefined;
      const newForce774 = !currentForce774;
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        force774: newForce774,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[force774] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[force774] 強制名無し設定の変更に失敗しました");
          } else {
            responseMessages.push(`[force774] 強制名無しを${newForce774 ? "有効" : "無効"}にしました`);
          }
        }
      }
    } else if (cmd.action === "stop") {
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        stopped: true,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[stop] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[stop] スレッド停止に失敗しました");
          } else {
            responseMessages.push("[stop] スレッドを停止しました");
            await addAdminLogRepository(vakContext, {
              action: "スレッド停止",
              detail: `スレッドID: ${params.threadId}`,
              ipAddress: params.ipAddressRaw,
              logType: "ADMIN",
            });
          }
        }
      }
    } else if (cmd.action === "pool") {
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        pooled: true,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[pool] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[pool] スレッド移動に失敗しました");
          } else {
            responseMessages.push("[pool] スレッドをプールに移動しました");
            await addAdminLogRepository(vakContext, {
              action: "プール移動",
              detail: `スレッドID: ${params.threadId}`,
              ipAddress: params.ipAddressRaw,
              logType: "ADMIN",
            });
          }
        }
      }
    } else if (cmd.action === "live") {
      const currentLive = attrsResult.value.live as boolean | undefined;
      const newLive = !currentLive;
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        live: newLive,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[live] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[live] ライブモード設定に失敗しました");
          } else {
            responseMessages.push(`[live] ライブモードを${newLive ? "有効" : "無効"}にしました`);
          }
        }
      }
    } else if (cmd.action === "slip") {
      const level = cmd.params.level;
      if (!level) {
        responseMessages.push("[slip] SLIPレベルが指定されていません");
        continue;
      }
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        slipLevel: level,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[slip] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[slip] SLIPレベル設定に失敗しました");
          } else {
            responseMessages.push(`[slip] SLIPレベルを${level}に設定しました`);
          }
        }
      }
    } else if (cmd.action === "ban") {
      const targetHashId = cmd.params.targetHashId;
      const resNum = parseInt(cmd.params.number, 10);
      if (!targetHashId || isNaN(resNum)) {
        responseMessages.push("[ban] 対象の投稿者が見つかりません");
        continue;
      }
      const currentBans = (attrsResult.value.bans as Record<string, string>) ?? {};
      currentBans[targetHashId] = `Banned from response >>${resNum}`;
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        bans: currentBans,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[ban] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[ban] BAN設定に失敗しました");
          } else {
            responseMessages.push(`[ban] >>${resNum}の投稿者をBANしました`);
            await addAdminLogRepository(vakContext, {
              action: "スレッドBAN",
              detail: `スレッドID: ${params.threadId}, レス番号: ${resNum}, ハッシュID: ${targetHashId}`,
              ipAddress: params.ipAddressRaw,
              logType: "ADMIN",
            });
          }
        }
      }
    } else if (cmd.action === "hidenushi") {
      const currentHideNushi = attrsResult.value.hideNushi as boolean | undefined;
      const newHideNushi = !currentHideNushi;
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        hideNushi: newHideNushi,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[hidenushi] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[hidenushi] OPマーカー表示設定の変更に失敗しました");
          } else {
            responseMessages.push(`[hidenushi] OPマーカーを${newHideNushi ? "非表示" : "表示"}にしました`);
          }
        }
      }
    } else if (cmd.action === "float") {
      const currentSticky = attrsResult.value.sticky as boolean | undefined;
      const newSticky = !currentSticky;
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        sticky: newSticky,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[float] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[float] スレッド固定設定に失敗しました");
          } else {
            responseMessages.push(`[float] スレッド固定を${newSticky ? "有効" : "無効"}にしました`);
          }
        }
      }
    } else if (cmd.action === "nopool") {
      const currentNoPool = attrsResult.value.noPool as boolean | undefined;
      const newNoPool = !currentNoPool;
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        noPool: newNoPool,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[nopool] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[nopool] 自動アーカイブ防止設定の変更に失敗しました");
          } else {
            responseMessages.push(`[nopool] 自動アーカイブ防止を${newNoPool ? "有効" : "無効"}にしました`);
          }
        }
      }
    } else if (cmd.action === "change774") {
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        custom774: cmd.params.name,
        force774: true,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[change774] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[change774] 名無し名の変更に失敗しました");
          } else {
            responseMessages.push(`[change774] 名無し名を「${cmd.params.name}」に変更しました`);
          }
        }
      }
    } else if (cmd.action === "sub") {
      const targetHashId = cmd.params.targetHashId;
      const resNum = parseInt(cmd.params.number, 10);
      if (!targetHashId || isNaN(resNum)) {
        responseMessages.push("[sub] 対象の投稿者が見つかりません");
        continue;
      }
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        subOwnerHashId: targetHashId,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[sub] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[sub] 副管理人の設定に失敗しました");
          } else {
            responseMessages.push(`[sub] >>${resNum}を副管理人に設定しました`);
            await addAdminLogRepository(vakContext, {
              action: "副管理人設定",
              detail: `スレッドID: ${params.threadId}, レス番号: ${resNum}, ハッシュID: ${targetHashId}`,
              ipAddress: params.ipAddressRaw,
              logType: "ADMIN",
            });
          }
        }
      }
    } else if (cmd.action === "cap") {
      const targetHashId = cmd.params.targetHashId;
      const displayName = cmd.params.displayName;
      const resNum = parseInt(cmd.params.number, 10);
      if (!targetHashId || isNaN(resNum) || !displayName) {
        responseMessages.push("[cap] 対象の投稿者または表示名が見つかりません");
        continue;
      }
      const caps = (attrsResult.value.caps as Record<string, string>) ?? {};
      caps[targetHashId] = displayName;
      const newAttrs: Record<string, unknown> = {
        ...attrsResult.value,
        caps,
      };
      const writeThreadIdResult = createWriteThreadId(params.threadId);
      if (writeThreadIdResult.isOk()) {
        const attrsValidated = createThreadAttr(newAttrs);
        if (attrsValidated.isErr()) {
          responseMessages.push(`[cap] 属性の更新に失敗しました: ${attrsValidated.error.message}`);
        } else {
          const updateResult = await updateThreadAttrsRepository(vakContext, {
            threadId: writeThreadIdResult.value,
            attrs: attrsValidated.value,
          });
          if (updateResult.isErr()) {
            responseMessages.push("[cap] CAP表示設定に失敗しました");
          } else {
            responseMessages.push(`[cap] >>${resNum}に「▲${displayName}」を設定しました`);
            await addAdminLogRepository(vakContext, {
              action: "CAP表示設定",
              detail: `スレッドID: ${params.threadId}, レス番号: ${resNum}, 表示名: ${displayName}`,
              ipAddress: params.ipAddressRaw,
              logType: "ADMIN",
            });
          }
        }
      }
    } else if (cmd.action === "send") {
      const toHashId = cmd.params.toHashId;
      const amount = parseInt(cmd.params.amount, 10);
      if (!toHashId || isNaN(amount)) {
        responseMessages.push("[send] パラメータが不正です");
        continue;
      }
      const sendResult = await sendGoldUsecase(vakContext, {
        fromHashId: params.authorHashId,
        toHashId,
        amount,
        ipAddress: params.ipAddressRaw,
      });
      if (sendResult.isErr()) {
        responseMessages.push(`[send] 送金に失敗しました: ${sendResult.error.message}`);
      } else {
        responseMessages.push(`[send] ${amount}ゴールドを送金しました`);
      }
    } else if (cmd.action === "throw") {
      const targetHashId = cmd.params.targetHashId;
      const amount = parseInt(cmd.params.amount, 10);
      if (!targetHashId || isNaN(amount)) {
        responseMessages.push("[throw] 対象が見つかりません");
        continue;
      }
      const throwResult = await throwGoldUsecase(vakContext, {
        fromHashId: params.authorHashId,
        toHashId: targetHashId,
        amount,
        threadId: params.threadId,
        ipAddress: params.ipAddressRaw,
      });
      if (throwResult.isErr()) {
        responseMessages.push(`[throw] 投げ銭に失敗しました: ${throwResult.error.message}`);
      } else {
        responseMessages.push(`[throw] ${amount}ゴールドを投げました`);
      }
    } else if (cmd.action === "calc" || cmd.action === "base" || cmd.action === "ver" ||
               cmd.action === "who" || cmd.action === "where" || cmd.action === "body" ||
               cmd.action === "power" || cmd.action === "year" || cmd.action === "mon" ||
               cmd.action === "day" || cmd.action === "hungry" || cmd.action === "food" ||
               cmd.action === "yakyu" || cmd.action === "poke" || cmd.action === "expo" ||
               cmd.action === "etc" || cmd.action === "iq" || cmd.action === "kote" ||
               cmd.action === "card" || cmd.action === "anime" || cmd.action === "mibun" ||
               cmd.action === "sute") {
      if (cmd.response) {
        responseMessages.push(cmd.response.message);
      }
    }
  }

  const commandResponse = responseMessages.length > 0
    ? responseMessages.join("\n")
    : undefined;

  logger.info({
    operation: "processCommands",
    threadId: params.threadId,
    commandCount: commandResult.commands.length,
    hasResponse: commandResponse !== undefined,
    message: "Command processing completed",
  });

  const result: { processedContent: string; commandResponse?: string; nameOverride?: string } = {
    processedContent: commandResult.processedContent,
    commandResponse,
  };
  if (nameOverride) {
    result.nameOverride = nameOverride;
  }

  return ok(result);
};
