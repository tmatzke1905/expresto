

# Security

expRESTo provides built-in support for route-level security using:

- JSON Web Tokens (JWT)
- HTTP Basic Authentication
- Custom Security Providers

---

## Configuration

Security is configured globally in the main config file, with options for:

- Algorithm (e.g. HS256)
- Secret or key
- Token lifetime
- Optional custom provider

---

## Supported Modes

| Mode     | Description                             |
|----------|-----------------------------------------|
| `none`   | No authentication required              |
| `basic`  | HTTP Basic Auth (username + password)   |
| `jwt`    | JSON Web Token via `Authorization: Bearer` header |

You can define the required mode per route in your controller or using route metadata.

---

## JWT Support

JWT tokens are:

- Verified using `jose` (not `jsonwebtoken`)
- Parsed and validated by the built-in `JwtSecurityProvider`
- Automatically injected into `req.auth` if valid

---

## Basic Auth

Basic authentication is available out-of-the-box for simple use cases.

- Requires user/password to be provided
- Matching logic can be customized

---

## SecurityProvider

You can override the default behavior by providing a custom `SecurityProvider`.

A custom provider must implement:

```ts
interface SecurityProvider {
  check(req: Request, mode: 'jwt' | 'basic' | 'none'): Promise<void>;
}
```

This allows you to:

- Integrate external identity providers
- Add role-based access checks
- Log or audit access attempts

---

## Route Enforcement

All security checks are performed **before** the route handler is executed.

If authentication fails:

- A `401 Unauthorized` or `403 Forbidden` is returned
- A log entry is written to `application.log`

---

## Public Routes

You can explicitly mark routes as `secure: 'none'` to bypass security.

Examples include:

- Health checks
- Static asset endpoints
- Log file access

---

_Last updated: 2025-09-14_
