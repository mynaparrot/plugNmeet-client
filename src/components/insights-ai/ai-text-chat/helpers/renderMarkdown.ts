import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/**
 * Sanitizer for AI-generated markdown output
 */
const AI_MARKDOWN_SANITIZE_CONFIG: sanitizeHtml.IOptions = {
  // Markdown output only: no scripts, styles, event handlers or url-bearing
  // attributes beyond this list; img covers model-embedded images.
  // prettier-ignore
  allowedTags: ['b', 'i', 'strong', 'em', 'del', 'br', 'hr', 'a', 'span', 'div', 'p', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img'],
  allowedAttributes: {
    // target/rel are needed for the transformTags below to survive filtering
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    code: ['class', 'dir'],
    span: ['dir'],
    div: ['dir'],
    p: ['dir'],
    ul: ['dir'],
    ol: ['dir', 'start'],
    li: ['dir'],
    pre: ['dir'],
    blockquote: ['dir'],
    h1: ['dir'],
    h2: ['dir'],
    h3: ['dir'],
    h4: ['dir'],
    h5: ['dir'],
    h6: ['dir'],
    table: ['dir'],
    thead: ['dir'],
    tbody: ['dir'],
    tr: ['dir'],
    td: ['dir', 'align'],
    th: ['dir', 'align'],
  },
  // marked emits class="language-xxx" on fenced code blocks; only that shape
  // is whitelisted so arbitrary Tailwind classes can't be injected.
  allowedClasses: {
    code: [/^language-\S+$/],
  },
  // Images are restricted to http(s); links may additionally use mailto.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https'],
  },
  // keep scheme-relative (//host) urls out, they'd bypass the scheme lists
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
  },
};

/**
 * Renders raw markdown text (trusted model output) into sanitized HTML ready
 * for dangerouslySetInnerHTML. `breaks` is intentional: in the chat UX a
 * single newline becomes a <br>.
 */
export const renderMarkdown = (raw: string): string => {
  return sanitizeHtml(
    marked.parse(raw, { async: false, gfm: true, breaks: true }),
    AI_MARKDOWN_SANITIZE_CONFIG,
  );
};
