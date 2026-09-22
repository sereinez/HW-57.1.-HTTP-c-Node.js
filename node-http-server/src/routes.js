'use strict';

const { renderPage, escapeHtml } = require('./html');

/**
 * Static pages served for GET requests. Keyed by pathname.
 * Each entry describes the heading/title and the paragraph text.
 */
const GET_PAGES = {
  '/': {
    title: 'Home',
    text: 'Welcome to the Home Page',
  },
  '/about': {
    title: 'About',
    text: 'Learn more about us',
  },
  '/contact': {
    title: 'Contact',
    text: 'Get in touch',
  },
};

/**
 * Returns the rendered HTML for a static GET route, or null if the
 * pathname does not match a known route.
 * @param {string} pathname
 * @returns {string|null}
 */
function renderGetRoute(pathname) {
  const page = GET_PAGES[pathname];
  if (!page) return null;
  return renderPage(page.title, `<p>${escapeHtml(page.text)}</p>`);
}

module.exports = { GET_PAGES, renderGetRoute };
