const SOH = "\x01";
const PLACEHOLDER = (name: string) => `${SOH}${name}${SOH}`;

const escapeMap: Readonly<Record<string, string>> = {
  "\\```": PLACEHOLDER("ESC_BACKTICK"),
  "\\***": PLACEHOLDER("ESC_BOLD"),
  "\\~~~": PLACEHOLDER("ESC_STRIKE"),
  "\\>>": PLACEHOLDER("ESC_ANCHOR_PREFIX"),
  "\\http://": PLACEHOLDER("ESC_HTTP"),
  "\\https://": PLACEHOLDER("ESC_HTTPS"),
  "\\*": PLACEHOLDER("ESC_ASTERISK"),
  "\\__": PLACEHOLDER("ESC_UNDERSCORE"),
  "\\`": PLACEHOLDER("ESC_CODE"),
  "\\##": PLACEHOLDER("ESC_HEADING"),
  "\\---": PLACEHOLDER("ESC_HR"),
  "\\-": PLACEHOLDER("ESC_DASH"),
  "\\>": PLACEHOLDER("ESC_BLOCKQUOTE"),
};

const escapeRegex = /(\\```|\\\*\*\*|\\~~~|\\>>|\\https?:\/\/|\\\*|\\__|\\`|\\##|\\---|\\-|\\>)/g;

const unescapeMap = Object.fromEntries(
  Object.entries(escapeMap).map(([key, value]) => [value, key.substring(1)])
);
const unescapeRegex = new RegExp(
  Object.keys(unescapeMap).join("|"),
  "g"
);

const PLACEHOLDER_BS = PLACEHOLDER("ESC_BACKSLASH");

const escapeText = (text: string): string => {
  let result = text.replace(/\\\\/g, PLACEHOLDER_BS);
  result = result.replace(escapeRegex, (match) => escapeMap[match] || match);
  return result;
};

const unescapeText = (text: string): string => {
  let result = text.replace(unescapeRegex, (match) => unescapeMap[match] || match);
  result = result.split(PLACEHOLDER_BS).join("\\");
  return result;
};

const processInlineElements = (text: string, threadId: string): string => {
  let result = text;

  // Bold (***text***) - process first to not conflict with italic
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-black">$1</strong>');

  // Strikethrough (~~~text~~~)
  result = result.replace(/~~~(.+?)~~~/g, "<s>$1</s>");

  // Underline (__text__)
  result = result.replace(/__(.+?)__/g, '<span class="underline">$1</span>');

  // Italic (*text*) - only single asterisk, not ** or *** (already processed)
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

  // Inline code (`text`)
  result = result.replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>');

  // Response anchors (>>number)
  result = result.replace(
    />>(\d+)/g,
    `<a class="text-blue-500 hover:underline" href="#${threadId}-$1">&gt;&gt;$1</a>`
  );

  // URLs
  result = result.replace(
    /(https?:\/\/[^\s<>"']+)/g,
    '<a class="text-blue-500 hover:underline" href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  return result;
};

const processBlockLine = (line: string, threadId: string): string => {
  const trimmed = line.trim();

  if (!trimmed) {
    return "<br>";
  }

  // Headings
  if (/^###\s/.test(trimmed)) {
    const content = processInlineElements(trimmed.replace(/^###\s+/, ""), threadId);
    return `<h4 class="text-lg font-bold mt-4 mb-2">${content}</h4>`;
  }
  if (/^##\s/.test(trimmed)) {
    const content = processInlineElements(trimmed.replace(/^##\s+/, ""), threadId);
    return `<h3 class="text-xl font-bold mt-4 mb-2">${content}</h3>`;
  }

  // Horizontal rule
  if (/^---$/.test(trimmed)) {
    return '<hr class="my-4 border-gray-300">';
  }

  // Blockquote
  if (/^>\s/.test(trimmed)) {
    const content = processInlineElements(trimmed.replace(/^>\s*/, ""), threadId);
    return `<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600">${content}</blockquote>`;
  }

  // List items
  if (/^[-*]\s/.test(trimmed)) {
    const content = processInlineElements(trimmed.replace(/^[-*]\s+/, ""), threadId);
    return `<li>${content}</li>`;
  }

  // Regular text
  const content = processInlineElements(trimmed, threadId);
  return `<div>${content}</div>`;
};

export const parseMarkdown = (content: string, threadId: string): string => {
  const lines = content.split("\n");
  const resultHtml: string[] = [];

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let listGroup: string[] = [];
  let quoteGroup: string[] = [];

  const flushListGroup = () => {
    if (listGroup.length > 0) {
      resultHtml.push(`<ul class="list-disc pl-6 my-2">${listGroup.join("")}</ul>`);
      listGroup = [];
    }
  };

  const flushQuoteGroup = () => {
    if (quoteGroup.length > 0) {
      resultHtml.push(`<div class="my-2">${quoteGroup.join("")}</div>`);
      quoteGroup = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const isCodeBlockFence =
      trimmedLine === "```" && !line.trimStart().startsWith("\\```");

    if (isCodeBlockFence) {
      if (inCodeBlock) {
        flushListGroup();
        flushQuoteGroup();

        const escapedContent = codeBlockLines
          .map(
            (l) =>
              l
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
          )
          .join("\n");
        resultHtml.push(
          `<pre class="bg-gray-200 p-2 rounded overflow-x-auto my-2"><code class="text-sm">${escapedContent}</code></pre>`
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        flushListGroup();
        flushQuoteGroup();
        inCodeBlock = true;
      }
    } else {
      if (inCodeBlock) {
        codeBlockLines.push(line);
      } else {
        const escapedLine = escapeText(line);
        const trimmed = escapedLine.trim();

        const isList = /^[-*]\s/.test(trimmed);
        const isQuote = /^>\s/.test(trimmed);

        if (!isList) {
          flushListGroup();
        }
        if (!isQuote) {
          flushQuoteGroup();
        }

        if (isList) {
          listGroup.push(processBlockLine(escapedLine, threadId));
        } else if (isQuote) {
          quoteGroup.push(processBlockLine(escapedLine, threadId));
        } else {
          resultHtml.push(processBlockLine(escapedLine, threadId));
        }
      }
    }
  }

  // Handle unclosed code block
  if (inCodeBlock) {
    const escapedContent = codeBlockLines
      .map(
        (l) =>
          l
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
      )
      .join("\n");
    resultHtml.push(
      `<pre class="bg-gray-200 p-2 rounded overflow-x-auto my-2"><code class="text-sm">${escapedContent}</code></pre>`
    );
  }

  flushListGroup();
  flushQuoteGroup();

  let html = resultHtml.join("\n");
  html = unescapeText(html);
  return html;
};
