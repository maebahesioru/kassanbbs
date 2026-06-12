import { err, ok } from "neverthrow";

import { ValidationError } from "../../shared/types/Error";
import { ErrorCodes } from "../../error/completeErrorCodes";
import { checkSpamUsecase } from "../../spam/usecases/checkSpamUsecase";
import { checkNgWordUsecase } from "../../ngword/usecases/checkNgWordUsecase";
import { checkContentLimitsUsecase } from "../../validation/usecases/checkContentLimitsUsecase";
import { getNinpochoRecordRepository } from "../../ninpocho/repositories/getNinpochoRecordRepository";
import { generateNinpochoHashId } from "../../ninpocho/utils/generateNinpochoHashId";
import { processNinpochoNameReplacements } from "../../ninpocho/usecases/ninpochoNameReplacementUsecase";
import { checkNinpochoForceMode } from "../../ninpocho/usecases/ninpochoForceModeUsecase";
import { upsertNinpochoRecordRepository } from "../../ninpocho/repositories/upsertNinpochoRecordRepository";
import { getNinpochoConfigRepository } from "../../ninpocho/repositories/getNinpochoConfigRepository";
import { addAdminLogRepository } from "../../adminlog/repositories/addAdminLogRepository";
import { handleThreadOverflowUsecase } from "../../overflow/usecases/handleThreadOverflowUsecase";
import { fetchBeProfile } from "../../be/services/beService";
import { processCommandsUsecase } from "../../commands/usecases/processCommandsUsecase";
import { processTasukeruyo } from "../../identity/usecases/tasukeruyoUsecase";
import { logWriteUsecase } from "../../writelog/usecases/logWriteUsecase";
import { logTimelineUsecase } from "../../timeline/usecases/logTimelineUsecase";
import { parseMailCommand } from "../../commands/services/mailCommandService";
import { getDailyOmikuji } from "../../commands/services/userCommandService";
import { ageThreadUsecase } from "../../positioning/usecases/ageThreadUsecase";
import { dameThreadUsecase } from "../../positioning/usecases/dameThreadUsecase";
import { upThreadUsecase, downThreadUsecase } from "../../positioning/usecases/updownThreadUsecase";
import { extractCapPassword } from "../../cap/usecases/extractCapPasswordUsecase";
import { verifyCapPasswordUsecase } from "../../cap/usecases/verifyCapPasswordUsecase";
import { hashContent } from "../../dedup/services/hashContentService";
import { calculateGoldReward, calculatePostCost } from "../../gold/services/goldService";

import { getDefaultAuthorNameRepository } from "../../config/repositories/getDefaultAuthorNameRepository";
import { getMaxContentLengthRepository } from "../../config/repositories/getMaxContentLengthRepository";
import { type ReadThreadId } from "../domain/read/ReadThreadId";
import { createWriteAuthorName } from "../domain/write/WriteAuthorName";
import { generateWriteHashId } from "../domain/write/WriteHashId";
import { createWriteMail, isSage } from "../domain/write/WriteMail";
import { generateCurrentPostedAt } from "../domain/write/WritePostedAt";
import { createWriteResponse } from "../domain/write/WriteResponse";
import { createWriteResponseContent } from "../domain/write/WriteResponseContent";
import { createWriteThreadId } from "../domain/write/WriteThreadId";
import { createResponseByThreadIdRepository } from "../repositories/createResponseByThreadIdRepository";
import { getThreadManagementInfoRepository } from "../repositories/getThreadManagementInfoRepository";
import { updateThreadUpdatedAtRepository } from "../repositories/updateThreadUpdatedAtRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { ReadResponseNumber } from "../domain/read/ReadResponseNumber";
import type { Result } from "neverthrow";



// レスを投稿する際のユースケース
export const postResponseByThreadIdUsecase = async (
  vakContext: VakContext,
  {
    threadIdRaw,
    authorNameRaw,
    mailRaw,
    responseContentRaw,
    ipAddressRaw,
    passwordRaw,
    browserFpRaw,
    hasCapPermission,
    remoteHost,
    userAgent,
    bypassNgword,
    bypassSpam,
    bypassAttr,
    bypassCommand,
    wattyoi,
  }: {
    threadIdRaw: string;
    authorNameRaw: string | null;
    mailRaw: string | null;
    responseContentRaw: string;
    ipAddressRaw: string;
    passwordRaw?: string | null;
    browserFpRaw?: string | null;
    hasCapPermission?: boolean;
    remoteHost?: string;
    userAgent?: string;
    bypassNgword?: boolean;
    bypassSpam?: boolean;
    bypassAttr?: boolean;
    bypassCommand?: boolean;
    wattyoi?: string;
  }
): Promise<
  Result<
    {
      threadId: ReadThreadId;
      responseNumber: ReadResponseNumber;
    },
    Error
  >
> => {
  const { logger } = vakContext;

  let processedAuthorNameRaw = authorNameRaw;

  if (processedAuthorNameRaw && remoteHost && userAgent) {
    const tasukeruyoResult = processTasukeruyo(processedAuthorNameRaw, {
      ip: ipAddressRaw,
      host: remoteHost,
      userAgent,
    });
    processedAuthorNameRaw = tasukeruyoResult.name;
  }

  logger.info({
    operation: "postResponseByThreadId",
    threadId: threadIdRaw,
    message: "Starting response creation process",
  });

  // ThreadIdを生成
  logger.debug({
    operation: "postResponseByThreadId",
    threadId: threadIdRaw,
    message: "Validating thread ID",
  });

  const writeThreadIdResult = createWriteThreadId(threadIdRaw);
  if (writeThreadIdResult.isErr()) {
    logger.error({
      operation: "postResponseByThreadId",
      error: writeThreadIdResult.error,
      threadId: threadIdRaw,
      message: "Invalid thread ID format",
    });
    return err(writeThreadIdResult.error);
  }

  logger.debug({
    operation: "postResponseByThreadId",
    threadId: threadIdRaw,
    message: "Checking thread management constraints",
  });

  const threadInfoResult = await getThreadManagementInfoRepository(vakContext, {
    threadId: writeThreadIdResult.value,
  });
  if (threadInfoResult.isErr()) {
    logger.error({
      operation: "postResponseByThreadId",
      error: threadInfoResult.error,
      threadId: threadIdRaw,
      message: "Failed to fetch thread management info",
    });
    return err(threadInfoResult.error);
  }

  const initialIsStopped = threadInfoResult.value.isStopped;

  if (
    threadInfoResult.value.responseCount >= threadInfoResult.value.maxResponses
  ) {
    logger.warn({
      operation: "postResponseByThreadId",
      threadId: threadIdRaw,
      responseCount: threadInfoResult.value.responseCount,
      maxResponses: threadInfoResult.value.maxResponses,
      message: "Thread has reached max responses limit",
    });
    return err(new ValidationError("このスレッドはレス数が上限に達しています"));
  }

  // スレッド属性によるチェック
  const threadAttrs = threadInfoResult.value.attrs;

  if (!bypassAttr) {
    // stoppedチェック（attrからの拡張チェック）
    if (threadAttrs.stopped) {
      logger.warn({
        operation: "postResponseByThreadId",
        threadId: threadIdRaw,
        message: "Thread is stopped via attr, cannot post response",
      });
      return err(new ValidationError("このスレッドは停止されています"));
    }

    // pooledチェック
    if (threadAttrs.pooled) {
      logger.warn({
        operation: "postResponseByThreadId",
        threadId: threadIdRaw,
        message: "Thread is pooled, cannot post response",
      });
      return err(new ValidationError("このスレッドはプールに移動されています"));
    }

    // banチェック
    if (threadAttrs.bans && Object.keys(threadAttrs.bans).length > 0) {
      const ninpochoHashId = generateNinpochoHashId(ipAddressRaw);
      if (threadAttrs.bans[ninpochoHashId]) {
        logger.warn({
          operation: "postResponseByThreadId",
          threadId: threadIdRaw,
          hashId: ninpochoHashId,
          message: "User is banned from this thread",
        });
        return err(new ValidationError("このスレッドからBANされています"));
      }
    }

    // sageOnlyチェック
    if (threadAttrs.sageOnly) {
      const mailCheckResult = createWriteMail(mailRaw);
      if (mailCheckResult.isErr()) {
        return err(mailCheckResult.error);
      }
      if (!isSage(mailCheckResult.value)) {
        logger.warn({
          operation: "postResponseByThreadId",
          threadId: threadIdRaw,
          message: "Thread is sage-only, non-sage post rejected",
        });
        return err(new ValidationError("このスレッドはsage進行です"));
      }
    }

    // ninpochoLevelチェック
    if (
      threadAttrs.ninpochoLevel !== undefined &&
      threadAttrs.ninpochoLevel > 0
    ) {
      logger.debug({
        operation: "postResponseByThreadId",
        threadId: threadIdRaw,
        ninpochoLevel: threadAttrs.ninpochoLevel,
        message: "Checking user ninpocho level",
      });

      const ninpochoHashId = generateNinpochoHashId(ipAddressRaw);
      const ninpochoRecordResult = await getNinpochoRecordRepository(
        vakContext,
        { hashId: ninpochoHashId }
      );
      if (ninpochoRecordResult.isErr()) {
        logger.error({
          operation: "postResponseByThreadId",
          error: ninpochoRecordResult.error,
          threadId: threadIdRaw,
          message: "Failed to fetch ninpocho record",
        });
        return err(ninpochoRecordResult.error);
      }

      const ninpochoRecord = ninpochoRecordResult.value;
      if (
        ninpochoRecord &&
        ninpochoRecord.val.banLevel >= threadAttrs.ninpochoLevel
      ) {
        logger.warn({
          operation: "postResponseByThreadId",
          threadId: threadIdRaw,
          userBanLevel: ninpochoRecord.val.banLevel,
          requiredLevel: threadAttrs.ninpochoLevel,
          message: "User ninpocho level too low for this thread",
        });
        return err(new ValidationError(`[${ErrorCodes.NINPOCHO_LEVEL_LIMIT.code}] ${ErrorCodes.NINPOCHO_LEVEL_LIMIT.msg}`));
      }
    }

    // customMaxResチェック
    if (threadAttrs.customMaxRes !== undefined) {
      if (threadInfoResult.value.responseCount >= threadAttrs.customMaxRes) {
        logger.warn({
          operation: "postResponseByThreadId",
          threadId: threadIdRaw,
          responseCount: threadInfoResult.value.responseCount,
          customMaxRes: threadAttrs.customMaxRes,
          message: "Thread has reached custom max responses limit",
        });
        return err(new ValidationError("このスレッドはカスタムレス数上限に達しています"));
      }
    }

    // passwordチェック
    if (threadAttrs.password) {
      if (!passwordRaw || passwordRaw !== threadAttrs.password) {
        logger.warn({
          operation: "postResponseByThreadId",
          threadId: threadIdRaw,
          message: "Thread password required or incorrect",
        });
        return err(new ValidationError("スレッドのパスワードが正しくありません"));
      }
    }
  } else {
    logger.info({
      operation: "postResponseByThreadId",
      threadId: threadIdRaw,
      message: "Thread attribute restrictions bypassed by cap permission",
    });
  }

  let effectiveHasCapPermission = bypassCommand === true || hasCapPermission === true;
  let mailAfterCapExtraction = mailRaw;

  if (mailRaw) {
    const capExtractResult = extractCapPassword(mailRaw);
    if (capExtractResult.password) {
      logger.debug({
        operation: "postResponseByThreadId",
        threadId: threadIdRaw,
        message: "Cap password found in mail field, verifying",
      });
      const verifyResult = await verifyCapPasswordUsecase(vakContext, capExtractResult.password);
      if (verifyResult.isOk() && verifyResult.value.valid) {
        effectiveHasCapPermission = true;
        logger.info({
          operation: "postResponseByThreadId",
          threadId: threadIdRaw,
          displayName: verifyResult.value.displayName,
          message: "Cap password verified, granting cap permission",
        });
      }
      mailAfterCapExtraction = capExtractResult.cleanedMail;
    }

    const passMatch = mailAfterCapExtraction?.match(/!pass:(\S+)/i);
    if (passMatch && threadAttrs.password) {
      const mailPass = passMatch[1];
      if (mailPass === threadAttrs.password) {
        logger.info({
          operation: "postResponseByThreadId",
          threadId: threadIdRaw,
          message: "Thread password matched via mail field",
        });
        effectiveHasCapPermission = true;
      }
      mailAfterCapExtraction = mailAfterCapExtraction?.replace(passMatch[0], "").trim() ?? null;
    }
  }

  // 現在時刻とハッシュIDを早期生成（コマンド処理に必要）
  const postedAt = generateCurrentPostedAt();
  const hashIdResult = generateWriteHashId(ipAddressRaw, postedAt.val);
  if (hashIdResult.isErr()) {
    logger.error({
      operation: "postResponseByThreadId",
      error: hashIdResult.error,
      message: "Failed to generate hash ID",
    });
    return err(hashIdResult.error);
  }
  const hashId = hashIdResult.value;

  // ユーザの忍法帖レベルを取得
  const userNinpochoHashId = generateNinpochoHashId(ipAddressRaw);
  const userNinpochoRecordResult = await getNinpochoRecordRepository(
    vakContext,
    { hashId: userNinpochoHashId }
  );
  const userNinpochoLevel =
    userNinpochoRecordResult.isOk() && userNinpochoRecordResult.value
      ? userNinpochoRecordResult.value.val.banLevel
      : 0;

  // ユーザコマンドを処理（スパム/NGワードチェックより前に実行）
  logger.debug({
    operation: "postResponseByThreadId",
    threadId: threadIdRaw,
    message: "Processing user commands from content",
  });

  const commandResult = await processCommandsUsecase(vakContext, {
    content: responseContentRaw,
    threadId: threadIdRaw,
    authorHashId: hashId.val,
    ninpochoLevel: userNinpochoLevel,
    hasCapPermission: effectiveHasCapPermission,
    isNewThread: false,
    ipAddressRaw,
  });
  if (commandResult.isErr()) {
    logger.error({
      operation: "postResponseByThreadId",
      error: commandResult.error,
      threadId: threadIdRaw,
      message: "Failed to process commands",
    });
    return err(commandResult.error);
  }

  let processedContent = commandResult.value.processedContent;
  const commandResponse = commandResult.value.commandResponse;
  const nameOverride = commandResult.value.nameOverride;

  // !omikuji in name field
  if (processedAuthorNameRaw && processedAuthorNameRaw.startsWith("!omikuji")) {
    const today = new Date().toISOString().split("T")[0];
    const seed = `${today}_${hashId.val}`;
    const omikujiResult = getDailyOmikuji(seed);
    processedAuthorNameRaw = omikujiResult.rank;
  } else if (nameOverride) {
    // Name override from content command
    processedAuthorNameRaw = nameOverride;
  }

  // コマンド実行後のレスポンスがあれば本文に追加
  if (commandResponse) {
    processedContent = processedContent
      ? `${commandResponse}\n${processedContent}`
      : commandResponse;
  }

  // コマンド処理後の本文が空で、コマンド実行結果もない場合はエラー
  if (!processedContent && !commandResponse) {
    logger.warn({
      operation: "postResponseByThreadId",
      threadId: threadIdRaw,
      message: "Content is empty after command processing",
    });
    return err(new ValidationError("本文が空です"));
  }

  logger.debug({
    operation: "postResponseByThreadId",
    threadId: threadIdRaw,
    hasCommandResponse: commandResponse !== undefined,
    processedContentLength: processedContent.length,
    message: "Commands processed, continuing with validated content",
  });

  // ユーザ名を生成
  logger.debug({
    operation: "postResponseByThreadId",
    authorName: processedAuthorNameRaw,
    message: "Processing author name",
  });

  const authorNameResult = await createWriteAuthorName(
    processedAuthorNameRaw,
    async () => {
      logger.debug({
        operation: "postResponseByThreadId",
        message: "Fetching default author name from config",
      });

      const nanashiNameResult = await getDefaultAuthorNameRepository(
        vakContext
      );
      if (nanashiNameResult.isErr()) {
        logger.error({
          operation: "postResponseByThreadId",
          error: nanashiNameResult.error,
          message: "Failed to fetch default author name",
        });
        return err(nanashiNameResult.error);
      }
      return ok(nanashiNameResult.value.val);
    },
    async (beId: string) => {
      return await fetchBeProfile(beId);
    }
  );
  if (authorNameResult.isErr()) {
    logger.error({
      operation: "postResponseByThreadId",
      error: authorNameResult.error,
      authorName: authorNameRaw,
      message: "Invalid author name format",
    });
    return err(authorNameResult.error);
  }

  // メール生成
  logger.debug({
    operation: "postResponseByThreadId",
    mail: mailAfterCapExtraction,
    message: "Validating mail address",
  });

  const mailResult = createWriteMail(mailAfterCapExtraction);
  if (mailResult.isErr()) {
    logger.error({
      operation: "postResponseByThreadId",
      error: mailResult.error,
      mail: mailAfterCapExtraction,
      message: "Invalid mail format",
    });
    return err(mailResult.error);
  }

  // 忍法帖 name replacement + force mode
  logger.debug({
    operation: "postResponseByThreadId",
    message: "Processing ninpocho name replacements and force mode",
  });

  const responseNinpochoHashId = generateNinpochoHashId(ipAddressRaw);
  const responseNinpochoRecordResult = await getNinpochoRecordRepository(vakContext, {
    hashId: responseNinpochoHashId,
  });
  let authorName = authorNameResult.value.val.authorName;
  let mailValue = mailResult.value.val;

  if (responseNinpochoRecordResult.isOk() && responseNinpochoRecordResult.value) {
    const record = responseNinpochoRecordResult.value;
    const ninpochoData = {
      level: record.val.banLevel,
      totalPosts: 0,
      id: responseNinpochoHashId,
      errorCount: record.val.errorCount,
      hasCapPermission: effectiveHasCapPermission,
    };
    authorName = processNinpochoNameReplacements(authorName, ninpochoData);

    const forceModeResult = await checkNinpochoForceMode(vakContext, {
      ninpochoLevel: record.val.banLevel,
      currentMail: mailValue,
      currentName: authorName,
    });
    if (forceModeResult.isOk()) {
      mailValue = forceModeResult.value.mail;
      authorName = forceModeResult.value.name;
    }
  }

  // Update authorNameResult and mailResult with ninpocho-processed values
  const ninpochoProcessedNameResult = await createWriteAuthorName(authorName, async () => {
    const nanashiNameResult = await getDefaultAuthorNameRepository(vakContext);
    if (nanashiNameResult.isErr()) {
      return err(nanashiNameResult.error);
    }
    return ok(nanashiNameResult.value.val);
  });
  if (ninpochoProcessedNameResult.isErr()) {
    logger.error({
      operation: "postResponseByThreadId",
      error: ninpochoProcessedNameResult.error,
      message: "Failed to set ninpocho-processed author name",
    });
    return err(ninpochoProcessedNameResult.error);
  }

  const ninpochoMailResult = createWriteMail(mailValue);
  if (ninpochoMailResult.isErr()) {
    logger.error({
      operation: "postResponseByThreadId",
      error: ninpochoMailResult.error,
      mail: mailValue,
      message: "Invalid mail after ninpocho force mode",
    });
    return err(ninpochoMailResult.error);
  }

  // レス内容生成
  logger.debug({
    operation: "postResponseByThreadId",
    contentLength: responseContentRaw.length,
    message: "Validating response content",
  });

  const responseContentResult = await createWriteResponseContent(
    processedContent,
    async () => {
      logger.debug({
        operation: "postResponseByThreadId",
        message: "Fetching max content length from config",
      });

      const result = await getMaxContentLengthRepository(vakContext);
      if (result.isErr()) {
        logger.error({
          operation: "postResponseByThreadId",
          error: result.error,
          message: "Failed to fetch max content length",
        });
        return err(result.error);
      }
      return ok(result.value.val);
    }
  );
  if (responseContentResult.isErr()) {
    logger.error({
      operation: "postResponseByThreadId",
      error: responseContentResult.error,
      contentLength: responseContentRaw.length,
      message: "Invalid response content",
    });
    return err(responseContentResult.error);
  }

  logger.debug({
    operation: "postResponseByThreadId",
    message: "Checking content limits",
  });

  const contentLimitsResult = await checkContentLimitsUsecase(
    vakContext,
    processedContent
  );
  if (contentLimitsResult.isErr()) {
    logger.warn({
      operation: "postResponseByThreadId",
      error: contentLimitsResult.error,
      message: "Content exceeds limits",
    });
    return err(contentLimitsResult.error);
  }

  // マルチポスト検出
  const currentContentHash = await hashContent(processedContent);
  const recentPosts = await vakContext.sql`
    SELECT content_hash FROM responses 
    WHERE thread_id = ${writeThreadIdResult.value.val}::uuid 
    AND hash_id = ${hashId.val}
    AND posted_at > NOW() - INTERVAL '30 seconds'
  `;
  if (recentPosts.length > 0) {
    logger.warn({
      operation: "postResponseByThreadId",
      hashId: hashId.val,
      contentHash: currentContentHash,
      message: "Multi-post detected, blocking post",
    });
    return err(new ValidationError("連続投稿が検出されました。しばらく待ってから投稿してください"));
  }

  // NGワードチェック
  logger.debug({
    operation: "postResponseByThreadId",
    message: "Checking for NG words",
  });

  if (!bypassNgword) {
    const ngCheckResult = await checkNgWordUsecase(vakContext, [
      processedContent,
    ]);
    if (ngCheckResult.isErr()) {
      logger.error({
        operation: "postResponseByThreadId",
        error: ngCheckResult.error,
        message: "NG word detected",
      });
      return err(ngCheckResult.error);
    }
  } else {
    logger.info({
      operation: "postResponseByThreadId",
      message: "NG word check bypassed by cap permission",
    });
  }

  // スパムチェック
  logger.debug({
    operation: "postResponseByThreadId",
    message: "Checking for spam content",
  });

  if (!bypassSpam) {
    const spamResult = await checkSpamUsecase(vakContext, {
      content: processedContent,
      authorName: processedAuthorNameRaw ?? "",
      mail: mailRaw ?? "",
      browserFpRaw: browserFpRaw ?? null,
    });
    if (spamResult.isErr()) {
      logger.error({
        operation: "postResponseByThreadId",
        error: spamResult.error,
        message: "Spam check failed",
      });
      return err(spamResult.error);
    }
    if (!spamResult.value) {
      logger.warn({
        operation: "postResponseByThreadId",
        message: "Post blocked by spam detection",
      });
      return err(new ValidationError("スパムと判定されました"));
    }
  } else {
    logger.info({
      operation: "postResponseByThreadId",
      message: "Spam check bypassed by cap permission",
    });
  }

  // レスを作成
  logger.debug({
    operation: "postResponseByThreadId",
    message: "Creating response object",
  });

  const response = await createWriteResponse({
    getThreadId: async () => {
      return ok(writeThreadIdResult.value.val);
    },
    authorName: ninpochoProcessedNameResult.value,
    mail: ninpochoMailResult.value,
    responseContent: responseContentResult.value,
    hashId,
    postedAt,
    wattyoi,
  });
  if (response.isErr()) {
    logger.error({
      operation: "postResponseByThreadId",
      error: response.error,
      message: "Failed to create response object",
    });
    return err(response.error);
  }

  // ロック取得後に停止状態を再確認（TOCTOU対策）
  const [{ is_stopped: lockedIsStopped }] = await vakContext.sql`
    SELECT is_stopped FROM threads WHERE id = ${writeThreadIdResult.value.val}::uuid FOR UPDATE
  `;
  if (lockedIsStopped) {
    return err(new ValidationError("このスレッドは停止されています"));
  }

  // 最後に永続化
  logger.debug({
    operation: "postResponseByThreadId",
    threadId: threadIdRaw,
    message: "Persisting response to database",
  });

  const responseResult = await createResponseByThreadIdRepository(
    vakContext,
    response.value
  );
  if (responseResult.isErr()) {
    logger.error({
      operation: "postResponseByThreadId",
      error: responseResult.error,
      threadId: threadIdRaw,
      message: "Failed to persist response to database",
    });
    await addAdminLogRepository(vakContext, {
      action: "\u30EC\u30B9\u4F5C\u6210\u30A8\u30E9\u30FC",
      detail: `\u30EC\u30B9\u4FDD\u5B58\u5931\u6557: ${responseResult.error.message}`,
      ipAddress: ipAddressRaw,
      logType: "ERR",
    });
    return err(responseResult.error);
  }

  const { threadId, responseNumber } = responseResult.value;

  const originalMailCommand = parseMailCommand(mailRaw ?? "");

  if (originalMailCommand.type === "age") {
    logger.debug({
      operation: "postResponseByThreadId",
      threadId: threadIdRaw,
      message: "AGE command detected, bumping thread to top",
    });

    const ageResult = await ageThreadUsecase(vakContext, {
      threadId: threadIdRaw,
    });
    if (ageResult.isErr()) {
      logger.error({
        operation: "postResponseByThreadId",
        error: ageResult.error,
        threadId: threadIdRaw,
        message: "Failed to age thread",
      });
    }
  } else if (originalMailCommand.type === "down" || originalMailCommand.type === "bottom") {
    logger.debug({
      operation: "postResponseByThreadId",
      threadId: threadIdRaw,
      command: originalMailCommand.type,
      message: "Dame command detected, moving thread to bottom",
    });

    const dameResult = await dameThreadUsecase(vakContext, {
      threadId: threadIdRaw,
    });
    if (dameResult.isErr()) {
      logger.error({
        operation: "postResponseByThreadId",
        error: dameResult.error,
        threadId: threadIdRaw,
        message: "Failed to dame thread",
      });
    }
  } else if (originalMailCommand.type === "up") {
    const positions = parseInt(originalMailCommand.value ?? "1", 10);
    logger.debug({
      operation: "postResponseByThreadId",
      threadId: threadIdRaw,
      positions,
      message: "Up command detected, moving thread up",
    });

    const upResult = await upThreadUsecase(vakContext, {
      threadId: threadIdRaw,
      positions,
    });
    if (upResult.isErr()) {
      logger.error({
        operation: "postResponseByThreadId",
        error: upResult.error,
        threadId: threadIdRaw,
        message: "Failed to move thread up",
      });
    }
  } else if (originalMailCommand.type === "downby") {
    const positions = parseInt(originalMailCommand.value ?? "1", 10);
    logger.debug({
      operation: "postResponseByThreadId",
      threadId: threadIdRaw,
      positions,
      message: "Downby command detected, moving thread down",
    });

    const downResult = await downThreadUsecase(vakContext, {
      threadId: threadIdRaw,
      positions,
    });
    if (downResult.isErr()) {
      logger.error({
        operation: "postResponseByThreadId",
        error: downResult.error,
        threadId: threadIdRaw,
        message: "Failed to move thread down",
      });
    }
  } else if (!isSage(ninpochoMailResult.value)) {
    logger.debug({
      operation: "postResponseByThreadId",
      threadId: threadIdRaw,
      message: "Updating thread updated_at timestamp",
    });

    const threadResult = await updateThreadUpdatedAtRepository(vakContext, {
      threadId: writeThreadIdResult.value,
      updatedAt: postedAt,
    });
    if (threadResult.isErr()) {
      logger.error({
        operation: "postResponseByThreadId",
        error: threadResult.error,
        threadId: threadIdRaw,
        message: "Failed to update thread timestamp",
      });
      return err(threadResult.error);
    }

    logger.debug({
      operation: "postResponseByThreadId",
      threadId: threadIdRaw,
      message: "Successfully updated thread timestamp",
    });
  } else {
    logger.debug({
      operation: "postResponseByThreadId",
      threadId: threadIdRaw,
      message: "Sage mail detected, skipping thread timestamp update",
    });
  }

  await addAdminLogRepository(vakContext, {
    action: "\u30EC\u30B9\u4F5C\u6210",
    detail: `\u30B9\u30EC\u30C3\u30C9ID: ${threadIdRaw}, \u30EC\u30B9\u756A\u53F7: ${responseNumber.val}`,
    ipAddress: ipAddressRaw,
    logType: "WRT",
  });

  // XP/Gold更新（エラーは無視）- アトミック更新
  if (responseNinpochoRecordResult.isOk() && responseNinpochoRecordResult.value) {
    const record = responseNinpochoRecordResult.value;
    const xpGained = 1 + Math.floor(Math.random() * 3);
    const goldReward = calculateGoldReward(processedContent.length, false);
    const { sql } = vakContext;
    sql`
      UPDATE ninpocho_records
      SET xp = xp + ${xpGained}, gold = gold + ${goldReward}
      WHERE hash_id = ${responseNinpochoHashId}
    `.catch((xpErr: unknown) => {
      logger.error({
        operation: "postResponseByThreadId",
        error: xpErr,
        message: "Failed to update XP/Gold (non-blocking)",
      });
    });
  }

  logWriteUsecase(vakContext, {
    threadId: threadIdRaw,
    responseNumber: responseNumber.val,
    hashId: hashId.val,
    authorName: ninpochoProcessedNameResult.value.val.authorName,
    mail: ninpochoMailResult.value.val,
    contentLength: processedContent.length,
    postedAt: postedAt.val,
  }).catch((writeLogErr) => {
    logger.error({
      operation: "postResponseByThreadId",
      error: writeLogErr,
      threadId: threadIdRaw,
      message: "Failed to log write (non-blocking)",
    });
  });

  logTimelineUsecase(vakContext, {
    threadId: threadIdRaw,
    responseNumber: responseNumber.val,
    authorName: ninpochoProcessedNameResult.value.val.authorName,
    mail: ninpochoMailResult.value.val,
    responseContent: processedContent,
    hashId: hashId.val,
    postedAt: postedAt.val,
  }).catch((tlErr: unknown) => {
    logger.error({
      operation: "postResponseByThreadId",
      error: tlErr,
      threadId: threadIdRaw,
      message: "Failed to log timeline (non-blocking)",
    });
  });

  const newResponseCount = threadInfoResult.value.responseCount + 1;
  if (newResponseCount >= threadInfoResult.value.maxResponses) {
    logger.info({
      operation: "postResponseByThreadId",
      threadId: threadIdRaw,
      responseCount: newResponseCount,
      maxResponses: threadInfoResult.value.maxResponses,
      message: "Thread overflow detected, triggering overflow handling",
    });
    handleThreadOverflowUsecase(vakContext, {
      threadIdRaw,
      currentResponseCount: newResponseCount,
      maxResponses: threadInfoResult.value.maxResponses,
      ipAddressRaw,
    }).catch((overflowErr) => {
      logger.error({
        operation: "postResponseByThreadId",
        error: overflowErr,
        threadId: threadIdRaw,
        message: "Thread overflow handling failed (non-blocking)",
      });
    });
  }

  logger.info({
    operation: "postResponseByThreadId",
    threadId: threadIdRaw,
    responseId: response.value.id.val,
    message: "Successfully created response",
  });

  return ok({
    threadId,
    responseNumber,
  });
};
