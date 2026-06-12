export const calculateSpamScore = (content: string, authorName: string, mail: string): number => {
  let score = 0;

  const asciiCount = [...content].filter(c => c.charCodeAt(0) < 128).length;
  if (content.length > 0 && (asciiCount / content.length) > 0.7) score += 1;

  const urlMatches = content.match(/https?:\/\/\S+/g);
  if (urlMatches) score += Math.min(urlMatches.length, 3);

  if (/(.)\1{4,}/.test(content)) score += 2;

  const spamKeywords = ['casino', 'viagra', 'click here', 'buy now', 'free money', 'earn money', 'work from home', 'make money', 'million dollar', 'weight loss', 'act now', 'limited time', 'order now', 'call now', '$$$'];
  for (const kw of spamKeywords) {
    if (content.toLowerCase().includes(kw)) score += 2;
  }

  if (content.length < 5) score += 2;

  if (/https?:\/\//i.test(authorName)) score += 5;

  if (/@(gmail|yahoo|outlook|hotmail)\.com/i.test(mail) && score > 0) score += 1;

  return score;
};
