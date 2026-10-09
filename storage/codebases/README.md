# CaleByte Technologies Secure Codebase Storage

This directory (`backend/storage/codebases/`) holds the production ZIP codebase archives for digital product delivery.

Files served here:
- `calebyte-ai.zip` (CaleByte AI Agent Source Code)
- `Browser Decryption.zip` (Browser Cookie & Key Decryption Engine)
- Any custom project ZIP archives configured in the marketplace.

Security:
- Files in this directory are **NEVER** exposed via public static web routes.
- Access is strictly governed by the cryptographically signed JWT token endpoint:
  `GET /api/download/source-code?token=...`
- Tokens expire automatically after 24 hours.
