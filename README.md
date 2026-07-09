# QuantumChat — Frontend

React/Vite client for QuantumChat. All encryption happens here — key generation and `nacl.box` sealing/unsealing — the backend never receives a private key or plaintext.

Full architecture and crypto design: see the [root README](../README.md).

## Scripts

```bash
npm install
cp .env.example .env    # VITE_API_URL, defaults to http://localhost:5000
npm run dev               # http://localhost:5173
npm run build              # production build to dist/
npm run preview             # serve the production build locally
```

## Project structure

```
src/
  crypto/
    keys.js               # generateKeyPair/generateKeySet, sealMessage/unsealMessage,
                            # sealBytes/unsealBytes (binary variant for attachments), pickRandom
    keyStorage.js           # local keyring (localStorage, append-only), session (token/user) storage
  api/
    client.js                # axios instance, attaches the JWT to every request
    socket.js                 # socket.io-client connection (no-ops gracefully if the backend has none)
  context/
    AuthContext.jsx           # register/login/regenerateKeys/logout — owns all key-generation calls
  pages/
    Register.jsx, Login.jsx, Chat.jsx
  components/
    UserList.jsx, MessageBubble.jsx, AttachmentBubble.jsx, ProtectedRoute.jsx
```

## How the crypto module is used (quick orientation)

- **Register** (`AuthContext.jsx`): calls `generateKeySet()` to make 5 fresh keypairs, sends the 5 public keys to the backend once, and adds all 5 to the local keyring via `addKeySetToRing()`. This pool is fixed from then on — **login doesn't generate or send any keys**, it's plain `{ email, password }` auth.
- **Sending a message** (`Chat.jsx`): picks a random key from the recipient's 5 public keys and a random key from your own 5, calls `sealMessage()` twice (once per side) so both parties can read it later, and posts both envelopes to `/messages`.
- **Sending a file**: same idea via `sealBytes()`, but sealed once (to the recipient only) — see the root README for why.
- **Reading a message**: looks up which of your own public keys the relevant envelope was sealed to (`envelope.targetPublicKey`), finds the matching private key in your local keyring (`findSecretKeyForPublicKey`) — a direct lookup, not a "try all 5 until one works" — and calls `unsealMessage()`. If that key isn't in your keyring (different device, wiped storage), decryption fails and the UI shows "unable to decrypt."
- **Recovering a wiped device**: `regenerateKeys()` in `AuthContext.jsx` generates a brand-new 5-key pool and publishes it via `PATCH /users/me/public-keys`, replacing the old one. Manual only, triggered from the "Generate new keys for this device" button when no local keyring is found — never automatic.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5000` | Backend base URL (no trailing `/api`) |

## Deploying to Vercel

Static Vite build — Vercel's zero-config detection handles this natively, no `vercel.json` needed. Set `VITE_API_URL` in the project's Environment Variables to your deployed backend's URL. See the [root README](../README.md#deploying-to-vercel) for backend-side deployment notes (Socket.IO and attachments don't work the same way on a serverless backend).
