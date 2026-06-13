import type { ReadResponseContent } from "../../src/conversation/domain/read/ReadResponseContent";
import type { ReadThreadId } from "../../src/conversation/domain/read/ReadThreadId";
import type { ReadMail } from "../../src/conversation/domain/read/ReadMail";
import type { ReadAuthorName } from "../../src/conversation/domain/read/ReadAuthorName";
import type { Nominal } from "../../src/shared/types/Nominal";
import type { FC } from "hono/jsx";

import { parseMarkdown } from "../../src/markdown/markdownParser";
import { autoLinkUrls } from "../../src/linking/services/urlAutoLinkService";
import { getBeId } from "../../src/conversation/domain/read/ReadAuthorName";
import { convertAll } from "../../src/converter/contentConverterService";

const COLLAPSE_LINE_THRESHOLD = 30;

const sanitizeHtml = (html: string): string => {
  return html
    .replace(/javascript:/gi, "javascript-disabled:")
    .replace(/data:/gi, "data-disabled:")
    .replace(/vbscript:/gi, "vbscript-disabled:")
    .replace(/onclick/gi, "onclick-disabled")
    .replace(/onerror/gi, "onerror-disabled")
    .replace(/onload/gi, "onload-disabled")
    .replace(/onmouseover/gi, "onmouseover-disabled")
    .replace(/onfocus/gi, "onfocus-disabled")
    .replace(/onblur/gi, "onblur-disabled");
};

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ResponseContentComponent: FC<{
  threadId: ReadThreadId;
  responseContent: ReadResponseContent;
  mail: ReadMail;
  referrerCushion?: string;
  authorName?: ReadAuthorName;
  dailyId?: Nominal<string, "ReadDailyId">;
  noId?: boolean;
  isDeleted?: boolean;
  isOwner?: boolean;
  isSubOwner?: boolean;
  linkColor?: string;
  nameColor?: string;
  wattyoi?: string;
}> = ({ threadId, responseContent, mail, referrerCushion, authorName, dailyId, noId, isDeleted, isOwner, isSubOwner, linkColor, nameColor, wattyoi }) => {
  if (isDeleted) {
    return (
      <div>
        <span className="text-gray-500">あぼーん</span>
      </div>
    );
  }
  const isMarkdown = mail.val.toLowerCase().includes("!markdown");
  const beId = authorName ? getBeId(authorName) : null;

  const convertedContent = convertAll(responseContent.val, {
    server: "",
    cgiPath: "",
    bbs: "",
    key: threadId.val,
    usePathInfo: true,
    cushion: referrerCushion,
    isMobile: false,
  });

  if (isMarkdown) {
    const html = parseMarkdown(convertedContent, threadId.val);
    const htmlLineCount = (html.match(/<br>/g) || []).length + 1;
    const htmlShouldCollapse = htmlLineCount > COLLAPSE_LINE_THRESHOLD;

    return (
      <div className="post-content">
        {beId && (
          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded mr-1">
            <a
              href={`https://be.2ch.net/user/${beId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline"
              style={linkColor ? { color: linkColor } : undefined}
            >
              BE:{beId}
            </a>
          </span>
        )}
        {htmlShouldCollapse ? (
          <details>
            <summary className="cursor-pointer text-gray-500 text-sm">
              全て表示（残り{htmlLineCount - COLLAPSE_LINE_THRESHOLD}行）
            </summary>
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
          </details>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
        )}
      </div>
    );
  }

  const withBreaks = convertedContent.replace(/\n/g, "<br>");

  const lineCount = (withBreaks.match(/<br>/g) || []).length + 1;
  const shouldCollapse = lineCount > COLLAPSE_LINE_THRESHOLD;

  return (
    <div className="post-content">
      {shouldCollapse ? (
        <details>
          <summary className="cursor-pointer text-gray-500 text-sm">
            全て表示（残り{lineCount - COLLAPSE_LINE_THRESHOLD}行）
          </summary>
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(withBreaks) }} />
        </details>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(withBreaks) }} />
      )}
    </div>
  );
};
