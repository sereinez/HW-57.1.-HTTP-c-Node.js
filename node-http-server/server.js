'use strict';

const http = require('http');
const { URL } = require('url');
const { renderPage } = require('./src/html');
const { renderGetRoute } = require('./src/routes');
const { handleSubmit } = require('./src/postHandler');

const PORT = process.env.PORT || 3000;

/**
 * Writes an HTML response with the standard headers required by the
 * assignment: correct content type, Content-Length and the
 * X-Content-Type-Options anti-sniffing header.
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {string} html
 */
function sendHtml(res, status, html, { closeConnection = false } = {}) {
  const body = Buffer.from(html, 'utf8');
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
    'X-Content-Type-Options': 'nosniff',
  };
  if (closeConnection) {
    headers.Connection = 'close';
  }
  res.writeHead(status, headers);
  res.end(body);
}

function sendNotFound(res) {
  sendHtml(res, 404, renderPage('404 Not Found', '<p>Page Not Found</p>'));
}

function sendServerError(res) {
  sendHtml(res, 500, renderPage('Server Error', '<p>Server Error</p>'));
}

async function requestListener(req, res) {
  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET') {
      const html = renderGetRoute(pathname);
      if (html === null) {
        sendNotFound(res);
        return;
      }
      sendHtml(res, 200, html);
      return;
    }

    if (req.method === 'POST' && pathname === '/submit') {
      const result = await handleSubmit(req);
      sendHtml(res, result.status, result.html, { closeConnection: result.closeConnection });
      if (result.closeConnection) {
        // The oversized body was never fully drained; once the response
        // has flushed, drop the connection instead of reusing it.
        res.on('finish', () => req.destroy());
      }
      return;
    }

    sendNotFound(res);
  } catch (err) {
    // Unexpected failure: log for diagnostics, never leak internals to the client.
    console.error('Unhandled server error:', err);
    if (!res.headersSent) {
      sendServerError(res);
    } else {
      res.end();
    }
  }
}

const server = http.createServer((req, res) => {
  // requestListener is async; catch any promise rejection it doesn't
  // handle itself so the server never crashes on a bad request.
  requestListener(req, res).catch((err) => {
    console.error('Unhandled promise rejection in request listener:', err);
    if (!res.headersSent) {
      sendServerError(res);
    } else {
      res.end();
    }
  });
});

server.on('clientError', (err, socket) => {
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

module.exports = server;
