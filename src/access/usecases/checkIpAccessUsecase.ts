import { err, ok } from "neverthrow";

import { ValidationError } from "../../shared/types/Error";
import { getIpRestrictionsRepository } from "../repositories/getIpRestrictionsRepository";
import { ipMatchesCidr } from "../services/ipMatcherService";

import type { VakContext } from "../../shared/types/VakContext";
import type { Result } from "neverthrow";

export const checkIpAccessUsecase = async (
  vakContext: VakContext,
  ipAddress: string
): Promise<Result<boolean, ValidationError>> => {
  const { logger } = vakContext;

  logger.info({
    operation: "checkIpAccess",
    ipAddress,
    message: "Checking IP access",
  });

  const denyResult = await getIpRestrictionsRepository(vakContext, "deny");
  if (denyResult.isErr()) return err(denyResult.error);

  const allowResult = await getIpRestrictionsRepository(vakContext, "allow");
  if (allowResult.isErr()) return err(allowResult.error);

  const denyRules = denyResult.value;
  const allowRules = allowResult.value;

  if (denyRules.length > 0) {
    for (const rule of denyRules) {
      if (ipMatchesCidr(ipAddress, rule.ipOrCidr)) {
        logger.warn({
          operation: "checkIpAccess",
          ipAddress,
          rule: rule.ipOrCidr,
          message: "IP address matched deny rule",
        });
        return err(new ValidationError("アクセスが拒否されました"));
      }
    }
  }

  if (allowRules.length > 0) {
    let allowed = false;
    for (const rule of allowRules) {
      if (ipMatchesCidr(ipAddress, rule.ipOrCidr)) {
        allowed = true;
        break;
      }
    }
    if (!allowed) {
      logger.warn({
        operation: "checkIpAccess",
        ipAddress,
        message: "IP address not in allow list",
      });
      return err(new ValidationError("許可されたIPアドレスではありません"));
    }
  }

  logger.info({
    operation: "checkIpAccess",
    ipAddress,
    message: "IP access granted",
  });

  return ok(true);
};
