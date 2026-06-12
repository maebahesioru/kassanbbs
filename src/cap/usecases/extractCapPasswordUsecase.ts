export const extractCapPassword = (mail: string): { password: string | null; cleanedMail: string } => {
  const match = mail.match(/(?:#|＃)(.+)/);
  if (match) {
    return { password: match[1], cleanedMail: mail.replace(match[0], "").trim() };
  }
  return { password: null, cleanedMail: mail };
};
