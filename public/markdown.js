import DOMPurify from "/vendor/dompurify.js";
import { marked } from "/vendor/marked.js";

marked.setOptions({
  breaks: true,
  gfm: true
});

export const renderMarkdown = (element, markdown) => {
  const html = marked.parse(markdown || "");
  element.innerHTML = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true }
  });

  element.querySelectorAll("a").forEach((link) => {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
};
