import type { ReadResponse } from "../../conversation/domain/read/ReadResponse";

export const markOwnerResponses = (
  responses: ReadResponse[],
  subOwnerHashId?: string
): ReadResponse[] => {
  const firstResponse = responses.find((r) => r.responseNumber.val === 1);
  const ownerHashId = firstResponse?.hashId.val ?? null;

  return responses.map((response) => {
    const isOwner = ownerHashId !== null && response.hashId.val === ownerHashId;
    const isSubOwner = subOwnerHashId !== undefined && response.hashId.val === subOwnerHashId;
    return {
      ...response,
      isOwner,
      isSubOwner,
    };
  });
};
