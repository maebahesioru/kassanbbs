export const fixChMateEmoji = (text: string): string => {
  return text.replace(
    /((?:&#[0-9a-zA-Z]+?;)|[0-9\u2642\u2640*#])(?:\xFC)+/g,
    "$1&#65039;"
  );
};
