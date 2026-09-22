'use strict';

const querystring = require('querystring');
const { renderPage, escapeHtml } = require('./html');

const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MB

class PayloadTooLargeError extends Error {}

/**
 * Reads and concatenates the request body, aborting once it exceeds
 * MAX_BODY_BYTES so a malicious client can't exhaust memory.
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<string>}
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let received = 0;
    let rejected = false;
    const chunks = [];

    req.on('data', (chunk) => {
      if (rejected) return;
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        rejected = true;
        // Stop consuming further chunks, but do NOT destroy the socket
        // here: destroying now would kill the connection before we get
        // a chance to write the 413 response back to the client.
        req.pause();
        reject(new PayloadTooLargeError('Request body exceeds 1 MB limit'));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (rejected) return;
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    req.on('error', (err) => {
      if (rejected) return;
      reject(err);
    });
  });
}

/**
 * Handles POST /submit: reads the urlencoded body, validates the
 * name and email fields, and builds the appropriate response payload.
 * The caller (server.js) is responsible for actually writing the
 * response so that status/header logic stays in one place.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<{status: number, title: string, html: string}>}
 */
async function handleSubmit(req) {
  let rawBody;
  try {
    rawBody = await readBody(req);
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      return {
        status: 413,
        title: 'Payload Too Large',
        html: renderPage('Payload Too Large', '<p>Request body exceeds the 1 MB limit.</p>'),
        // The remainder of the oversized body was never read, so the
        // connection can't safely be reused for a pipelined request.
        closeConnection: true,
      };
    }
    throw err;
  }

  const fields = querystring.parse(rawBody);
  const name = typeof fields.name === 'string' ? fields.name.trim() : '';
  const email = typeof fields.email === 'string' ? fields.email.trim() : '';

  if (!name || !email) {
    return {
      status: 400,
      title: 'Invalid form data',
      html: renderPage('Invalid form data', '<p>Both name and email are required.</p>'),
    };
  }

  const body = [
    '<h1>Form Submitted</h1>',
    `<p>Name: ${escapeHtml(name)}</p>`,
    `<p>Email: ${escapeHtml(email)}</p>`,
  ].join('\n');

  return {
    status: 200,
    title: 'Form Submitted',
    html: [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="UTF-8">',
      '<title>Form Submitted</title>',
      '</head>',
      '<body>',
      body,
      '</body>',
      '</html>',
    ].join('\n'),
  };
}

module.exports = { handleSubmit, MAX_BODY_BYTES, PayloadTooLargeError };
