import { createRoute } from "honox/factory";
import { setCookie } from "hono/cookie";

export default createRoute((c) => {
  setCookie(c, "jwt", "", { maxAge: 0, path: "/admin" });
  return c.redirect("/login/admin");
});
