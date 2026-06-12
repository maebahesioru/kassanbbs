import { createMiddleware } from "hono/factory";

import { checkPermissionUsecase } from "../../src/cap/usecases/checkPermissionUsecase";
import { getPermissionValue } from "../../src/cap/services/permissionService";
import { ErrorMessage } from "../components/ErrorMessage";

export const requirePermission = (permissionName: string) => {
  return createMiddleware(async (c, next) => {
    const payload = c.get("jwtPayload");
    if (!payload) {
      return c.render(
        <ErrorMessage error={new Error("Unauthorized")} />
      );
    }

    const permission = getPermissionValue(permissionName);
    if (permission === undefined) {
      return c.render(
        <ErrorMessage error={new Error(`不明な権限: ${permissionName}`)} />
      );
    }

    const result = await checkPermissionUsecase(
      { sql: c.var.sql, logger: c.var.logger },
      { username: payload.username as string, requiredPermission: permission }
    );

    if (result.isErr() || !result.value) {
      return c.render(
        <ErrorMessage error={new Error("権限がありません")} />
      );
    }

    await next();
  });
};
