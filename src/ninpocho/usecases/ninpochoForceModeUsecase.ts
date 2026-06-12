import { err, ok } from "neverthrow";

import { getNinpochoConfigRepository } from "../repositories/getNinpochoConfigRepository";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const checkNinpochoForceMode = async (
  vakContext: VakContext,
  params: { ninpochoLevel: number; currentMail: string; currentName: string }
): Promise<Result<{ mail: string; name: string }, Error>> => {
  const { logger } = vakContext;

  logger.debug({
    operation: "checkNinpochoForceMode",
    ninpochoLevel: params.ninpochoLevel,
    currentMail: params.currentMail,
    message: "Checking ninpocho force mode",
  });

  const configResult = await getNinpochoConfigRepository(vakContext);
  if (configResult.isErr()) {
    logger.error({
      operation: "checkNinpochoForceMode",
      error: configResult.error,
      message: "Failed to fetch ninpocho configuration",
    });
    return err(configResult.error);
  }

  const config = configResult.value.val;

  let mail = params.currentMail;
  let name = params.currentName;

  if (
    config.forceSageLevel > 0 &&
    params.ninpochoLevel >= config.forceSageLevel
  ) {
    logger.info({
      operation: "checkNinpochoForceMode",
      ninpochoLevel: params.ninpochoLevel,
      forceSageLevel: config.forceSageLevel,
      message: "Forcing sage mail due to ninpocho level",
    });
    mail = "sage";
  }

  if (
    config.forceKoteName &&
    config.forceKoteName.length > 0 &&
    config.forceSageLevel > 0 &&
    params.ninpochoLevel >= config.forceSageLevel
  ) {
    logger.info({
      operation: "checkNinpochoForceMode",
      ninpochoLevel: params.ninpochoLevel,
      forceKoteName: config.forceKoteName,
      message: "Forcing kote name due to ninpocho level",
    });
    name = config.forceKoteName;
  }

  return ok({ mail, name });
};
