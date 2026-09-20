import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "div",
  "span",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "img",
  "video",
  "source",
  "iframe",
];

export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      "*": ["class", "style"],
      a: ["href", "name", "target", "rel", "title"],
      img: ["src", "alt", "width", "height", "title"],
      video: ["src", "controls", "poster", "width", "height"],
      source: ["src", "type"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "title"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel", "data"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
      source: ["http", "https"],
    },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i, /^[a-z]+$/i],
        "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i, /^[a-z]+$/i],
        "text-align": [/^(left|right|center|justify)$/],
        "font-weight": [/^(normal|bold|[1-9]00)$/],
        "font-style": [/^(normal|italic)$/],
        "text-decoration": [/^(none|underline|line-through)$/],
      },
    },
    allowedIframeHostnames: [
      "www.youtube.com",
      "youtube.com",
      "player.vimeo.com",
    ],
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          rel: "noopener noreferrer",
          target: attribs.target === "_blank" ? "_blank" : attribs.target,
        },
      }),
    },
    disallowedTagsMode: "discard",
  });
}

export function htmlToPlainText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function containsPotentiallyUnsafeMarkup(html: string): boolean {
  return /<\s*(script|object|embed)|\bon\w+\s*=|javascript\s*:/i.test(html);
}
