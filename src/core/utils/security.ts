import DOMPurify from 'dompurify';

/**
 * Sanitizes an HTML string to prevent XSS attacks.
 * @param html The raw HTML string to sanitize.
 * @returns A safe HTML string.
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'],
  });
};
