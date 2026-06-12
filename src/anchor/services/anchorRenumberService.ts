export const renumberResponses = (
  responses: Array<{ number: number; content: string; id: string }>,
  deletedNumber: number
): Array<{ number: number; content: string; id: string }> => {
  return responses.map((r) => {
    let newNumber = r.number;
    if (r.number > deletedNumber) newNumber = r.number - 1;

    let newContent = r.content;
    newContent = newContent.replace(/>>(\d+)/g, (match, num) => {
      const n = parseInt(num, 10);
      if (n === deletedNumber) return ">>[削除されました]";
      if (n > deletedNumber) return `>>${n - 1}`;
      return match;
    });

    return { number: newNumber, content: newContent, id: r.id };
  });
};
