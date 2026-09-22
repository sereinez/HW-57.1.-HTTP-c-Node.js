'use strict';

/**
 * Escapes characters that could be used for XSS injection when
 * user-supplied data is embedded into an HTML response.
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds a minimal, well-formed HTML document.
 * @param {string} title - Value used in <title> and as the <h1> heading.
 * @param {string} bodyHtml - Raw HTML to place inside <body> below the heading.
 * @returns {string}
 */
function renderPage(title, bodyHtml) {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8">',
    `<title>${escapeHtml(title)}</title>`,
    '</head>',
    '<body>',
    `<h1>${escapeHtml(title)}</h1>`,
    bodyHtml,
    '</body>',
    '</html>',
  ].join('\n');
}

module.exports = { escapeHtml, renderPage };
