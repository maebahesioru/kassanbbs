import { err, ok } from "neverthrow";

import { ValidationError } from "../../shared/types/Error";
import { checkSpamUsecase } from "../../spam/usecases/checkSpamUsecase";
import { checkNgWordUsecase } from "../../ngword/usecases/checkNgWordUsecase";
import { checkTitleDuplicateUsecase } from "../../dedup/usecases/checkDuplicateUsecase";
import { hashContent } from "../../dedup/services/hashContentService";
import { parseMailCommand } from "../../commands/services/mailCommandService";
import { getDailyOmikuji } from "../../commands/services/userCommandService";
import { addAdminLogRepository } from "../../adminlog/repositories/addAdminLogRepository";
import { fetchBeProfile } from "../../be/services/beService";
import { getNinpochoRecordRepository } from "../../ninpocho/repositories/getNinpochoRecordRepository";
import { generateNinpochoHashId } from "../../ninpocho/utils/generateNinpochoHashId";
import { processNinpochoNameReplacements } from "../../ninpocho/usecases/ninpochoNameReplacementUsecase";
import { checkNinpochoForceMode } from "../../ninpocho/usecases/ninpochoForceModeUsecase";
import { appendThreadTitleId } from "../../utils/threadTitleIdAppender";
import { checkContentLimitsUsecase } from "../../validation/usecases/checkContentLimitsUsecase";
import { processTasukeruyo } from "../../identity/usecases/tasukeruyoUsecase";
import { logWriteUsecase } from "../../writelog/usecases/logWriteUsecase";
import { logTimelineUsecase } from "../../timeline/usecases/logTimelineUsecase";
import { extractCapPassword } from "../../cap/usecases/extractCapPasswordUsecase";
import { verifyCapPasswordUsecase } from "../../cap/usecases/verifyCapPasswordUsecase";

import { getDefaultAuthorNameRepository } from "../../config/repositories/getDefaultAuthorNameRepository";
import { getMaxContentLengthRepository } from "../../config/repositories/getMaxContentLengthRepository";
import { createWriteAuthorName } from "../domain/write/WriteAuthorName";
import { generateWriteHashId } from "../domain/write/WriteHashId";
import { createWriteMail } from "../domain/write/WriteMail";
import { generateCurrentPostedAt } from "../domain/write/WritePostedAt";
import { createWriteResponse } from "../domain/write/WriteResponse";
import { createWriteResponseContent } from "../domain/write/WriteResponseContent";
import { createWriteThread } from "../domain/write/WriteThread";
import { createWriteThreadTitle } from "../domain/write/WriteThreadTitle";
import { createResponseByThreadIdRepository } from "../repositories/createResponseByThreadIdRepository";
import { createThreadRepository } from "../repositories/createThreadRepository";

import type { VakContext } from "../../shared/types/VakContext";

// スレッドを投稿する際のユースケース
export const postThreadUsecase = async (
  vakContext: VakContext,
  {
    // レスポンス番号は必ず1になるので必要ない
    threadTitleRaw,
    authorNameRaw,
    mailRaw,
    responseContentRaw,
    ipAddressRaw,
    browserFpRaw,
    remoteHost,
    userAgent,
    bypassNgword,
    bypassSpam,
    wattyoi,
    boardId,
  }: {
    threadTitleRaw: string;
    authorNameRaw: string | null;
    mailRaw: string | null;
    responseContentRaw: string;
    ipAddressRaw: string;
    browserFpRaw?: string | null;
    remoteHost?: string;
    userAgent?: string;
    bypassNgword?: boolean;
    bypassSpam?: boolean;
    wattyoi?: string;
    boardId?: string;
  }
) => {
  const { logger, sql } = vakContext;

  if (!boardId) {
    return err(new ValidationError("Board not specified"));
  }

  let processedAuthorNameRaw = authorNameRaw;

  if (processedAuthorNameRaw && remoteHost && userAgent) {
    const tasukeruyoResult = processTasukeruyo(processedAuthorNameRaw, {
      ip: ipAddressRaw,
      host: remoteHost,
      userAgent,
    });
    processedAuthorNameRaw = tasukeruyoResult.name;
  }

  // !omikuji in name field
  if (processedAuthorNameRaw && processedAuthorNameRaw.trim().startsWith("!omikuji")) {
    const today = new Date().toISOString().split("T")[0];
    const seed = `${today}_${ipAddressRaw}`;
    const omikujiResult = getDailyOmikuji(seed);
    processedAuthorNameRaw = omikujiResult.rank;
  }

  logger.info({
    operation: "postThread",
    threadTitle: threadTitleRaw,
    message: "Starting thread creation process",
  });

  // スレタイを生成
  logger.debug({
    operation: "postThread",
    threadTitle: threadTitleRaw,
    message: "Validating thread title",
  });

  const threadTitleResult = createWriteThreadTitle(threadTitleRaw);
  if (threadTitleResult.isErr()) {
    logger.error({
      operation: "postThread",
      error: threadTitleResult.error,
      threadTitle: threadTitleRaw,
      message: "Invalid thread title format",
    });
    return err(threadTitleResult.error);
  }

  // ユーザ名を生成
  logger.debug({
    operation: "postThread",
    authorName: processedAuthorNameRaw,
    message: "Processing author name",
  });

  let authorNameResult = await createWriteAuthorName(
    processedAuthorNameRaw,
    async () => {
      logger.debug({
        operation: "postThread",
        message: "Fetching default author name from config",
      });

      const nanashiNameResult = await getDefaultAuthorNameRepository(
        vakContext
      );
      if (nanashiNameResult.isErr()) {
        logger.error({
          operation: "postThread",
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
      operation: "postThread",
      error: authorNameResult.error,
      authorName: authorNameRaw,
      message: "Invalid author name format",
    });
    return err(authorNameResult.error);
  }

  // メール生成
  logger.debug({
    operation: "postThread",
    mail: mailRaw,
    message: "Validating mail address",
  });

  let mailAfterCapExtraction = mailRaw;
  let isCapUser = false;

  if (mailRaw) {
    const capExtractResult = extractCapPassword(mailRaw);
    if (capExtractResult.password) {
      logger.debug({
        operation: "postThread",
        message: "Cap password found in mail field, verifying",
      });
      const verifyResult = await verifyCapPasswordUsecase(vakContext, capExtractResult.password);
      if (verifyResult.isOk() && verifyResult.value.valid) {
        isCapUser = true;
        logger.info({
          operation: "postThread",
          displayName: verifyResult.value.displayName,
          message: "Cap password verified, granting cap permission",
        });
      }
      mailAfterCapExtraction = capExtractResult.cleanedMail;
    }
  }

  const mailResult = createWriteMail(mailAfterCapExtraction);
  if (mailResult.isErr()) {
    logger.error({
      operation: "postThread",
      error: mailResult.error,
      mail: mailAfterCapExtraction,
      message: "Invalid mail format",
    });
    return err(mailResult.error);
  }

  // レス内容生成
  logger.debug({
    operation: "postThread",
    contentLength: responseContentRaw.length,
    message: "Validating response content",
  });

  const responseContentResult = await createWriteResponseContent(
    responseContentRaw,
    async () => {
      logger.debug({
        operation: "postThread",
        message: "Fetching max content length from config",
      });

      const result = await getMaxContentLengthRepository(vakContext);
      if (result.isErr()) {
        logger.error({
          operation: "postThread",
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
      operation: "postThread",
      error: responseContentResult.error,
      contentLength: responseContentRaw.length,
      message: "Invalid response content",
    });
    return err(responseContentResult.error);
  }

  logger.debug({
    operation: "postThread",
    message: "Checking content limits",
  });

  const contentLimitsResult = await checkContentLimitsUsecase(
    vakContext,
    responseContentRaw
  );
  if (contentLimitsResult.isErr()) {
    logger.warn({
      operation: "postThread",
      error: contentLimitsResult.error,
      message: "Content exceeds limits",
    });
    return err(contentLimitsResult.error);
  }

  // NGワードチェック
  logger.debug({
    operation: "postThread",
    message: "Checking for NG words",
  });

  if (!bypassNgword) {
    const ngCheckResult = await checkNgWordUsecase(vakContext, [
      threadTitleRaw,
      responseContentRaw,
    ]);
    if (ngCheckResult.isErr()) {
      logger.error({
        operation: "postThread",
        error: ngCheckResult.error,
        message: "NG word detected",
      });
      return err(ngCheckResult.error);
    }
  } else {
    logger.info({
      operation: "postThread",
      message: "NG word check bypassed by cap permission",
    });
  }

  // タイトル重複チェック
  logger.debug({
    operation: "postThread",
    message: "Checking for duplicate thread title",
  });

  const titleDupResult = await checkTitleDuplicateUsecase(
    vakContext,
    threadTitleRaw
  );
  if (titleDupResult.isErr()) {
    logger.error({
      operation: "postThread",
      error: titleDupResult.error,
      threadTitle: threadTitleRaw,
      message: "Duplicate thread title detected",
    });
    return err(titleDupResult.error);
  }

  // スパムチェック
  logger.debug({
    operation: "postThread",
    message: "Checking for spam content",
  });

  if (!bypassSpam) {
    const spamResult = await checkSpamUsecase(vakContext, {
      content: responseContentRaw,
      authorName: processedAuthorNameRaw ?? "",
      mail: mailRaw ?? "",
      browserFpRaw: browserFpRaw ?? null,
    });
    if (spamResult.isErr()) {
      logger.error({
        operation: "postThread",
        error: spamResult.error,
        message: "Spam check failed",
      });
      return err(spamResult.error);
    }
    if (!spamResult.value) {
      logger.warn({
        operation: "postThread",
        message: "Post blocked by spam detection",
      });
      return err(new ValidationError("スパムと判定されました"));
    }
  } else {
    logger.info({
      operation: "postThread",
      message: "Spam check bypassed by cap permission",
    });
  }

  // メールコマンド処理
  const mailCommand = parseMailCommand(mailResult.value.val);
  if (mailCommand.type === "force774") {
    logger.debug({
      operation: "postThread",
      command: "force774",
      message: "Forcing default author name via mail command",
    });

    const forceNameResult = await createWriteAuthorName(null, async () => {
      const nanashiNameResult = await getDefaultAuthorNameRepository(
        vakContext
      );
      if (nanashiNameResult.isErr()) {
        return err(nanashiNameResult.error);
      }
      return ok(nanashiNameResult.value.val);
    });
    if (forceNameResult.isErr()) {
      logger.error({
        operation: "postThread",
        error: forceNameResult.error,
        message: "Failed to set forced author name",
      });
      return err(forceNameResult.error);
    }
    authorNameResult = forceNameResult;
  }

  // 忍法帖 name replacement + force mode
  logger.debug({
    operation: "postThread",
    message: "Processing ninpocho name replacements and force mode",
  });

  const ninpochoHashId = generateNinpochoHashId(ipAddressRaw);
  const ninpochoRecordResult = await getNinpochoRecordRepository(vakContext, {
    hashId: ninpochoHashId,
  });
  let authorName = authorNameResult.value.val.authorName;
  let mailValue = mailResult.value.val;

  if (ninpochoRecordResult.isOk() && ninpochoRecordResult.value) {
    const record = ninpochoRecordResult.value;
    const ninpochoData = {
      level: record.val.banLevel,
      totalPosts: 0,
      id: ninpochoHashId,
      errorCount: record.val.errorCount,
      hasCapPermission: isCapUser,
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

  // Update authorName and mail with ninpocho-processed values
  authorNameResult = await createWriteAuthorName(authorName, async () => {
    const nanashiNameResult = await getDefaultAuthorNameRepository(vakContext);
    if (nanashiNameResult.isErr()) {
      return err(nanashiNameResult.error);
    }
    return ok(nanashiNameResult.value.val);
  });
  if (authorNameResult.isErr()) {
    logger.error({
      operation: "postThread",
      error: authorNameResult.error,
      message: "Failed to set ninpocho-processed author name",
    });
    return err(authorNameResult.error);
  }

  const ninpochoMailResult = createWriteMail(mailValue);
  if (ninpochoMailResult.isErr()) {
    logger.error({
      operation: "postThread",
      error: ninpochoMailResult.error,
      mail: mailValue,
      message: "Invalid mail after ninpocho force mode",
    });
    return err(ninpochoMailResult.error);
  }

  // コンテンツハッシュ計算
  const contentHash = await hashContent(responseContentRaw);

  // 現在時刻を生成
  const postedAt = generateCurrentPostedAt();

  // ハッシュ値作成
  logger.debug({
    operation: "postThread",
    message: "Generating hash ID",
  });

  const hashId = generateWriteHashId(ipAddressRaw, postedAt.val);
  if (hashId.isErr()) {
    logger.error({
      operation: "postThread",
      error: hashId.error,
      message: "Failed to generate hash ID",
    });
    return err(hashId.error);
  }

  // スレッドタイトルにIDを付与
  const titleWithId = appendThreadTitleId(threadTitleResult.value.val, {
    hashId: hashId.value.val,
    isCapUser: false,
  });
  const threadTitleWithIdResult = createWriteThreadTitle(titleWithId);
  const finalTitle = threadTitleWithIdResult.isOk()
    ? threadTitleWithIdResult.value
    : threadTitleResult.value;

  // まずスレッド作成
  logger.debug({
    operation: "postThread",
    threadTitle: titleWithId,
    message: "Creating thread object",
  });

  const thread = createWriteThread({
    title: finalTitle,
    postedAt,
  });
  if (thread.isErr()) {
    logger.error({
      operation: "postThread",
      error: thread.error,
      threadTitle: threadTitleRaw,
      message: "Failed to create thread object",
    });
    return err(thread.error);
  }

  // 一番目のレスも作成
  logger.debug({
    operation: "postThread",
    threadId: thread.value.id.val,
    message: "Creating first response object for thread",
  });

  const response = await createWriteResponse({
    getThreadId: async () => {
      return ok(thread.value.id.val);
    },
    authorName: authorNameResult.value,
    mail: ninpochoMailResult.value,
    responseContent: responseContentResult.value,
    hashId: hashId.value,
    postedAt,
    contentHash,
    wattyoi,
  });
  if (response.isErr()) {
    logger.error({
      operation: "postThread",
      error: response.error,
      threadId: thread.value.id.val,
      message: "Failed to create response object",
    });
    return err(response.error);
  }

  // 最後に永続化（共有トランザクション内で実行）
  // 先にレスを作成したほうが安全側に倒せそう
  logger.debug({
    operation: "postThread",
    threadId: thread.value.id.val,
    message: "Persisting response to database",
  });

  const responseResult = await createResponseByThreadIdRepository(
    vakContext,
    response.value
  );
  if (responseResult.isErr()) {
    logger.error({
      operation: "postThread",
      error: responseResult.error,
      threadId: thread.value.id.val,
      message: "Failed to persist response to database",
    });
    await addAdminLogRepository(vakContext, {
      action: "\u30B9\u30EC\u30C3\u30C9\u4F5C\u6210\u30A8\u30E9\u30FC",
      detail: `\u30EC\u30B9\u4FDD\u5B58\u5931\u6557: ${responseResult.error.message}`,
      ipAddress: ipAddressRaw,
      logType: "ERR",
    });
    return err(responseResult.error);
  }

  logger.debug({
    operation: "postThread",
    threadId: thread.value.id.val,
    threadTitle: threadTitleRaw,
    message: "Persisting thread to database",
  });

  const threadResult = await createThreadRepository(vakContext, thread.value, boardId);
  if (threadResult.isErr()) {
    // Clean up orphaned response
    await sql`DELETE FROM responses WHERE id = ${response.value.id.val}::uuid`.catch(() => {});
    logger.error({
      operation: "postThread",
      error: threadResult.error,
      threadId: thread.value.id.val,
      message: "Failed to persist thread to database",
    });
    await addAdminLogRepository(vakContext, {
      action: "\u30B9\u30EC\u30C3\u30C9\u4F5C\u6210\u30A8\u30E9\u30FC",
      detail: `\u30B9\u30EC\u30C3\u30C9\u4FDD\u5B58\u5931\u6557: ${threadResult.error.message}`,
      ipAddress: ipAddressRaw,
      logType: "ERR",
    });
    return err(threadResult.error);
  }

  await addAdminLogRepository(vakContext, {
    action: "\u30B9\u30EC\u30C3\u30C9\u4F5C\u6210",
    detail: `\u30B9\u30EC\u30C3\u30C9ID: ${thread.value.id.val}, \u30BF\u30A4\u30C8\u30EB: ${threadTitleRaw}`,
    ipAddress: ipAddressRaw,
    logType: "THR",
  });

  logWriteUsecase(vakContext, {
    threadId: thread.value.id.val,
    responseNumber: 1,
    hashId: hashId.value.val,
    authorName: authorNameResult.value.val.authorName,
    mail: ninpochoMailResult.value.val,
    contentLength: responseContentResult.value.val.length,
    postedAt: postedAt.val,
  }).catch((writeLogErr: unknown) => {
    logger.error({
      operation: "postThread",
      error: writeLogErr,
      threadId: thread.value.id.val,
      message: "Failed to log write (non-blocking)",
    });
  });

  logTimelineUsecase(vakContext, {
    threadId: thread.value.id.val,
    responseNumber: 1,
    authorName: authorNameResult.value.val.authorName,
    mail: ninpochoMailResult.value.val,
    responseContent: responseContentResult.value.val,
    hashId: hashId.value.val,
    postedAt: postedAt.val,
  }).catch((tlErr: unknown) => {
    logger.error({
      operation: "postThread",
      error: tlErr,
      threadId: thread.value.id.val,
      message: "Failed to log timeline (non-blocking)",
    });
  });

  logger.info({
    operation: "postThread",
    threadId: thread.value.id.val,
    threadTitle: threadTitleRaw,
    responseId: response.value.id.val,
    message: "Successfully created thread with first response",
  });

  return ok(threadResult.value);
};
