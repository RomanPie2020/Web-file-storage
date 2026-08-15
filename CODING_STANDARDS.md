# Coding standards

These rules apply to both `backend` and `frontend` unless a framework-specific rule says otherwise.

## Readability first

- Prefer clear, descriptive names over abbreviations.
- Keep one logical operation per statement.
- Use braces for every `if`, `else`, loop, and function body.
- Avoid dense one-line conditions and nested ternaries.
- Extract non-trivial logic into named functions with one responsibility.
- Add comments only when they explain intent, security constraints, or a non-obvious trade-off.

## TypeScript

- Use strict TypeScript settings; do not use `any` unless there is a documented boundary reason.
- Add explicit types to public methods, service methods, and exported functions.
- Use named interfaces or type aliases for request, response, and domain shapes.
- Pass request types through framework generics, such as `getRequest<AuthenticatedRequest>()`.
- Validate external input at the boundary; do not trust values from requests, tokens, or storage.
- Prefer immutable values and `const`; use `let` only when reassignment is required.

## Backend rules

- Organize NestJS code by feature module, not by a single global technical layer.
- Use constructor injection for dependencies.
- Keep controllers thin; put business logic in services.
- Use DTOs and validation pipes for request bodies and parameters.
- Throw appropriate NestJS HTTP exceptions rather than returning ad-hoc error objects.
- Scope every database and Storage query by authenticated ownership or share authorization.
- Never return service-role credentials or permanent private Storage URLs.
- Keep authentication and authorization checks centralized and reusable.

## Frontend rules

- Keep pages and components focused on presentation and user interaction.
- Keep API calls in dedicated client functions or hooks.
- Represent loading, empty, error, unauthorized, and not-found states explicitly.
- Do not place secrets in `NEXT_PUBLIC_*` variables or browser bundles.
- Use stable UUIDs for resource routes; never use display names as identifiers.

## Error handling and logging

- Handle expected failures at the boundary where they can be explained to the user.
- Log diagnostic context on the server, but never log tokens, passwords, API keys, or file contents.
- Return safe, actionable error messages without exposing internal implementation details.

## Tests and verification

- Add tests for authentication, authorization, input validation, naming collisions, uploads, and deletion boundaries.
- Run the relevant build, lint, and test commands before creating a checkpoint.
- Manually verify the primary workflow after changes affecting both applications.

## Git checkpoints

- Keep commits small and focused on one logical change.
- Use descriptive commit messages such as `feat: add folder listing endpoint` or `fix: reject expired share links`.
- Never commit `.env` files, credentials, tokens, generated output, or `plans/creds.md`.
- Create a checkpoint after each verified phase or meaningful milestone.
