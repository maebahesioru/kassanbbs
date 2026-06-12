import { ok } from "neverthrow";

import type { ReadAuthorName } from "./ReadAuthorName";
import type { ReadHashId } from "./ReadHashId";
import type { ReadMail } from "./ReadMail";
import type { ReadPostedAt } from "./ReadPostedAt";
import type { ReadResponseContent } from "./ReadResponseContent";
import type { ReadResponseId } from "./ReadResponseId";
import type { ReadResponseNumber } from "./ReadResponseNumber";
import type { ReadThreadId } from "./ReadThreadId";
import type { Nominal } from "../../../shared/types/Nominal";
import type { Result } from "neverthrow";

export type ReadResponse = {
  readonly _type: "ReadResponse";
  readonly responseId: ReadResponseId;
  readonly threadId: ReadThreadId;
  readonly responseNumber: ReadResponseNumber;
  readonly authorName: ReadAuthorName;
  readonly mail: ReadMail;
  readonly postedAt: ReadPostedAt;
  readonly responseContent: ReadResponseContent;
  readonly hashId: ReadHashId;
  readonly dailyId?: Nominal<string, "ReadDailyId">;
  readonly capcode?: Nominal<string, "ReadCapcode">;
  readonly isOwner?: boolean;
  readonly isSubOwner?: boolean;
  readonly wattyoi?: string;
};

export const createReadResponse = ({
  responseId,
  threadId,
  responseNumber,
  authorName,
  mail,
  postedAt,
  responseContent,
  hashId,
  dailyId,
  capcode,
  isOwner,
  isSubOwner,
  wattyoi,
}: {
  responseId: ReadResponseId;
  threadId: ReadThreadId;
  responseNumber: ReadResponseNumber;
  authorName: ReadAuthorName;
  mail: ReadMail;
  postedAt: ReadPostedAt;
  responseContent: ReadResponseContent;
  hashId: ReadHashId;
  dailyId?: string;
  capcode?: string;
  isOwner?: boolean;
  isSubOwner?: boolean;
  wattyoi?: string;
}): Result<ReadResponse, Error> => {
  return ok({
    _type: "ReadResponse",
    responseId,
    threadId,
    responseNumber,
    authorName,
    mail,
    postedAt,
    responseContent,
    hashId,
    dailyId: dailyId as Nominal<string, "ReadDailyId"> | undefined,
    capcode: capcode as Nominal<string, "ReadCapcode"> | undefined,
    isOwner,
    isSubOwner,
    wattyoi,
  });
};
