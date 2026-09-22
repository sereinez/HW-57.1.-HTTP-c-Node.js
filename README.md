# Node.js HTTP Server 

A basic HTTP server built with only Node.js's built-in `http`, `url` and
`querystring` modules. It serves three static pages over GET and accepts
a form submission over POST — no Express, no third-party dependencies.

## Project structure

```
node-http-server/
├── server.js            # Entry point: creates the server, routes requests, sends responses
├── src/
│   ├── html.js           # HTML page template + HTML-escaping helper
│   ├── routes.js          # Static GET route definitions (/, /about, /contact)
│   └── postHandler.js    # Body reading, size limiting, parsing and validation for POST /submit
└── README.md
```


## Install and run

```bash
# no dependencies to install — just clone and run
node server.js

# or on a custom port
PORT=8080 node server.js
```

The server listens on port `3000` by default, or on `process.env.PORT`
if that environment variable is set.

## Routes

### `GET /`
Returns the Home page.

```
curl -i http://localhost:3000/
```
```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<h1>Home</h1>
<p>Welcome to the Home Page</p>
```

### `GET /about`
Returns the About page (`<h1>About</h1>`, "Learn more about us").

```
curl -i http://localhost:3000/about
```

### `GET /contact`
Returns the Contact page (`<h1>Contact</h1>`, "Get in touch").

```
curl -i http://localhost:3000/contact
```

### `GET <anything else>`
Returns `404 Not Found` with a "Page Not Found" HTML page.

```
curl -i http://localhost:3000/does-not-exist
```
```
HTTP/1.1 404 Not Found
...
<h1>404 Not Found</h1>
<p>Page Not Found</p>
```

### `POST /submit`
Accepts `application/x-www-form-urlencoded` data with `name` and `email`
fields and echoes them back in a confirmation page. Both fields are
HTML-escaped before being echoed to prevent XSS.

```
curl -i -X POST -d "name=Alice&email=alice@example.com" http://localhost:3000/submit
```
```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<h1>Form Submitted</h1>
<p>Name: Alice</p>
<p>Email: alice@example.com</p>
```

If `name` or `email` is missing or empty, the server responds with
`400 Bad Request`:

```
curl -i -X POST -d "name=&email=" http://localhost:3000/submit
```
```
HTTP/1.1 400 Bad Request
...
<h1>Invalid form data</h1>
```

If the request body exceeds 1 MB, the server responds with
`413 Payload Too Large` and closes the connection (the oversized body is
never fully read, so the connection can't safely be reused):

```
curl -i -X POST --data-binary @big-file.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  http://localhost:3000/submit
```
```
HTTP/1.1 413 Payload Too Large
Connection: close
...
```

## Response headers

Every response includes:

- `Content-Type: text/html; charset=utf-8`
- `Content-Length` — exact byte size of the response body
- `X-Content-Type-Options: nosniff`

## Error handling

| Status | When |
|---|---|
| `404 Not Found` | Unknown route, or a method/route combination that isn't defined |
| `400 Bad Request` | POST `/submit` with a missing/empty `name` or `email` |
| `413 Payload Too Large` | POST body larger than 1 MB |
| `500 Internal Server Error` | Any unexpected exception while handling a request |

## Implementation limits

- **Body size:** POST bodies are capped at 1 MB (`MAX_BODY_BYTES` in
  `src/postHandler.js`). Larger bodies are rejected with `413` before
  being fully parsed.
- **Content type:** Only `application/x-www-form-urlencoded` bodies are
  supported for `/submit`; JSON or multipart bodies are not parsed.
- **Routing:** Routing is hand-rolled (no router library). Adding a new
  static GET page means adding an entry to `GET_PAGES` in
  `src/routes.js`.
- **Sanitization:** User input is HTML-escaped (`&`, `<`, `>`, `"`, `'`)
  before being echoed back, which is sufficient for this text-only
  confirmation page but is not a general-purpose sanitizer.
- **No persistence:** Submitted form data is not stored anywhere; it's
  only echoed back in the response.

## Testing

Manual testing was done with `curl` (see examples above) and Postman,
covering all three GET routes, valid/invalid/oversized POST requests,
and an unknown route to confirm the 404 handler.
