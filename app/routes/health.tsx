import { createRoute } from "honox/factory";

export default createRoute((c) => {
  const db = c.var.sql;
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});
