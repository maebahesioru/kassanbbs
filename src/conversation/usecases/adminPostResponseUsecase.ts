import { err, ok } from "neverthrow";

import { createWriteResponse } from "../domain/write/WriteResponse";
import { createWriteAuthorName } from "../domain/write/WriteAuthorName";
import { createWriteMail } from "../domain/write/WriteMail";
import { createWriteResponseContent } from "../domain/write/WriteResponseContent";
import { createWriteThreadId } from "../domain/write/WriteThreadId";
import { generateWriteHashId } from "../domain/write/WriteHashId";
import { generateCurrentPostedAt } from "../domain/write/WritePostedAt";
import { getDefaultAuthorNameRepository } from "../../config/repositories/getDefaultAuthorNameRepository";
import { getMaxContentLengthRepository } from "../../config/repositories/getMaxContentLengthRepository";
import { createResponseByThreadIdRepository } from "../repositories/createResponseByThreadIdRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { ReadResponseNumber } from "../domain/read/ReadResponseNumber";
import type { ReadThreadId } from "../domain/read/ReadThreadId";
import type { Result } from "neverthrow";

export const adminPostResponseUsecase = async (
  vakContext: VakContext,
  {
    threadIdRaw,
    authorNameRaw,
    mailRaw,
    responseContentRaw,
    ipAddressRaw,
    wattyoi,
  }: {
    threadIdRaw: string;
    authorNameRaw: string;
    mailRaw: string;
    responseContentRaw: string;
    ipAddressRaw: string;
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

  logger.info({
    operation: "adminPostResponse",
    threadId: threadIdRaw,
    message: "Admin posting response to thread",
  });

  const writeThreadIdResult = createWriteThreadId(threadIdRaw);
  if (writeThreadIdResult.isErr()) {
    logger.error({
      operation: "adminPostResponse",
      error: writeThreadIdResult.error,
      threadId: threadIdRaw,
      message: "Invalid thread ID format",
    });
    return err(writeThreadIdResult.error);
  }

  const authorNameResult = await createWriteAuthorName(
    authorNameRaw || null,
    async () => {
      const nanashiNameResult = await getDefaultAuthorNameRepository(vakContext);
      if (nanashiNameResult.isErr()) return err(nanashiNameResult.error);
      return ok(nanashiNameResult.value.val);
    }
  );
  if (authorNameResult.isErr()) {
    logger.error({
      operation: "adminPostResponse",
      error: authorNameResult.error,
      message: "Invalid author name",
    });
    return err(authorNameResult.error);
  }

  const mailResult = createWriteMail(mailRaw || null);
  if (mailResult.isErr()) {
    logger.error({
      operation: "adminPostResponse",
      error: mailResult.error,
      message: "Invalid mail",
    });
    return err(mailResult.error);
  }

  const postedAt = generateCurrentPostedAt();
  const hashIdResult = generateWriteHashId(ipAddressRaw, postedAt.val);
  if (hashIdResult.isErr()) {
    logger.error({
      operation: "adminPostResponse",
      error: hashIdResult.error,
      message: "Failed to generate hash ID",
    });
    return err(hashIdResult.error);
  }
  const hashId = hashIdResult.value;

  const responseContentResult = await createWriteResponseContent(
    responseContentRaw,
    async () => {
      const result = await getMaxContentLengthRepository(vakContext);
      if (result.isErr()) return err(result.error);
      return ok(result.value.val);
    }
  );
  if (responseContentResult.isErr()) {
    logger.error({
      operation: "adminPostResponse",
      error: responseContentResult.error,
      message: "Invalid response content",
    });
    return err(responseContentResult.error);
  }

  const response = await createWriteResponse({
    getThreadId: async () => ok(writeThreadIdResult.value.val),
    authorName: authorNameResult.value,
    mail: mailResult.value,
    responseContent: responseContentResult.value,
    hashId,
    postedAt,
    wattyoi,
  });
  if (response.isErr()) {
    logger.error({
      operation: "adminPostResponse",
      error: response.error,
      message: "Failed to create response object",
    });
    return err(response.error);
  }

  const responseResult = await createResponseByThreadIdRepository(
    vakContext,
    response.value
  );
  if (responseResult.isErr()) {
    logger.error({
      operation: "adminPostResponse",
      error: responseResult.error,
      threadId: threadIdRaw,
      message: "Failed to persist response",
    });
    return err(responseResult.error);
  }

  logger.info({
    operation: "adminPostResponse",
    threadId: threadIdRaw,
    responseNumber: responseResult.value.responseNumber.val,
    message: "Admin post successful",
  });

  return ok(responseResult.value);
};
