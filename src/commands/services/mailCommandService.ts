export type MailCommand = {
  type:
    | "sage"
    | "age"
    | "markdown"
    | "force774"
    | "ninja"
    | "othello"
    | "font"
    | "down"
    | "bottom"
    | "up"
    | "downby"
    | "pass"
    | "none";
  value?: string;
};

export const parseMailCommand = (mail: string): MailCommand => {
  const lower = mail.toLowerCase().trim();

  if (lower === "sage") return { type: "sage" };
  if (lower === "age") return { type: "age" };
  if (lower === "!markdown") return { type: "markdown" };
  if (lower === "!force774") return { type: "force774" };
  if (lower === "!ninja") return { type: "ninja" };
  if (lower === "!othello") return { type: "othello" };
  if (lower === "!down" || lower === "down")
    return { type: "down" };
  if (lower === "!bottom" || lower === "bottom")
    return { type: "bottom" };

  const upMatch = lower.match(/^!?up:(\d+)$/);
  if (upMatch) {
    return { type: "up", value: upMatch[1] };
  }

  const downByMatch = lower.match(/^!?down:(\d+)$/);
  if (downByMatch) {
    return { type: "downby", value: downByMatch[1] };
  }

  if (lower.startsWith("font")) {
    return { type: "font", value: lower.substring(4).trim() };
  }
  if (lower.startsWith("!pass:")) {
    return { type: "pass", value: lower.substring(6).trim() };
  }

  return { type: "none" };
};
