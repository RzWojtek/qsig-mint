# QSIG — Project Context File
*Generated after session on 2026-05-12. Paste this file at the start of every new chat.*

---

## 1. What is QSIG?

QSIG (Quantum Signature) is a daily-mint ERC-20 token on Base (and eventually Arbitrum, Optimism, Ink, MegaETH). The mint is gated by a **SPHINCS- post-quantum signature** — the same mechanism used by sphincs.fun. Every day a user generates a fresh SPHINCS- keypair, signs a message containing the date + their wallet address, the backend verifies the signature off-chain, builds a Merkle tree every 5 minutes, posts the root on-chain, and the user calls `mint()` with a Merkle proof + EIP-712 attestation.

There are **two projects**:
- **Project 1 (Bot):** Private VPS bot that auto-mints daily to Wojtek's wallets without clicking anything.
- **Project 2 (Public site):** Website where anyone can connect MetaMask and mint 500 QSIG for 0.0005 ETH.

Both projects share the same smart contracts.

---

## 2. Token Details

| Parameter | Value |
|---|---|
| Name | Quantum Signature |
| Symbol | QSIG |
| Hard cap | 21,000,000 QSIG |
| LP reserve | 10,000,000 QSIG (to LP_RECIPIENT wallet at deploy) |
| Burned | 1,000,000 QSIG (to 0x...dEaD at deploy) |
| Public mint slots | 20,000 per network |
| Tokens per mint | 500 QSIG |
| Mint price | 0.0005 ETH |
| Decimals | 18 |

---

## 3. Full Tech Stack

### Smart Contracts
- **Language:** Solidity 0.8.24
- **Framework:** Foundry (forge)
- **Libraries:** OpenZeppelin (ERC20, MerkleProof, ECDSA, EIP712)
- **Contracts:**
  - `QSIGToken.sol` — standard ERC-20, only MintGate can mint
  - `QSIGMintGate.sol` — daily cooldown logic, Merkle proof + EIP-712 attestation verification

### Backend
- **Runtime:** Node.js v22
- **Framework:** Express.js
- **Port:** 3010 (3001 was taken by kurator-server)
- **Database/Queue:** Upstash Redis (REST API)
- **Python helpers:** `py/keygen.py`, `py/verify.py` (called via execSync from Node)
- **Process manager:** PM2 (process name: `qsig-backend`)
- **Location on VPS:** `/home/ubuntu/qsig-backend/`

### Cron (post-root)
- **File:** `post-root.js`
- **Language:** Node.js
- **Schedule:** every 5 minutes via PM2 cron (`*/5 * * * *`)
- **Process name:** `qsig-cron`
- **Location:** `/home/ubuntu/qsig-cron/`
- **What it does:** reads pending mints from Redis, builds Merkle tree, posts root on-chain for each network

### Bot (private daily mint)
- **File:** `qsig_bot.py`
- **Language:** Python 3.12
- **Process name:** `qsig-bot`
- **Location:** `/home/ubuntu/qsig-bot/`
- **Launcher:** `/home/ubuntu/qsig-bot/start.sh` (loads .env then runs python)
- **Schedule:** runs continuously, mints at QSIG_MINT_HOUR:QSIG_MINT_MINUTE UTC daily

### Frontend
- **Framework:** Next.js 14.2.35 (Pages Router compatible, NOT App Router RSC — avoids CVE-2025-66478)
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Wallet:** ethers.js v6 + MetaMask (window.ethereum)
- **Hosting:** Vercel (auto-deploy from GitHub)
- **URL:** https://qsig-mint.vercel.app
- **Repo root dir on Vercel:** `frontend/`

### Tunnel (HTTPS for VPS backend)
- **Tool:** Cloudflare Tunnel (cloudflared)
- **Process name:** `qsig-tunnel`
- **Current URL:** `https://scotia-wichita-stationery-open.trycloudflare.com` ⚠️ CHANGES ON RESTART
- **Command:** `pm2 start "cloudflared tunnel --url http://localhost:3010" --name qsig-tunnel`
- **Note:** Quick tunnel URL changes every time PM2 restarts. If URL changes, update `NEXT_PUBLIC_BACKEND_URL` in Vercel env vars and redeploy.

### Nginx
- **Config:** `/etc/nginx/sites-available/qsig-backend`
- **Listens on:** port 8080 (port 80 taken by kurator-api which also uses 185.202.239.239)
- **Proxies to:** `http://127.0.0.1:3010`
- **Note:** Nginx is secondary — Cloudflare Tunnel is the primary HTTPS solution

---

## 4. Deployed Contracts

### Base Mainnet (chain_id: 8453) — DEPLOYED ✅
| Contract | Address |
|---|---|
| QSIGToken | `0xE6417fDB0FBB671deaced0C4209C8087f435EcAf` |
| QSIGMintGate | `0x24dbeaed857889093ca27ed688A861075fc90F4E` |

### Other networks — NOT YET DEPLOYED
Arbitrum, Optimism, Ink, MegaETH — contracts not deployed yet. MINTGATE_ADDRESS_* in .env files are set to `0x0000000000000000000000000000000000000000`.

---

## 5. Wallets

| Role | Purpose |
|---|---|
| DEPLOYER | Paid for contract deployment (one-time). Has DEPLOYER_PRIVATE_KEY in contracts/.env |
| SIGNER | Signs EIP-712 attestations and posts Merkle roots on-chain. Private key in backend .env |
| DEV | Receives 0.0005 ETH from every mint. Address only, no key needed in config |
| LP | Received 10M QSIG at deploy. Address only, no key needed |

Wojtek's minting wallet: `0x4c8E881bEd49Ab7B13B3C22aBEC2D973AA630263`

---

## 6. VPS Details

| Item | Value |
|---|---|
| IP | 185.202.239.239 |
| OS | Ubuntu 24 |
| Node | v22 |
| Python | 3.12 |
| PM2 | v5+ |

### PM2 processes (QSIG-related)
| ID | Name | Status | Notes |
|---|---|---|---|
| 17 | qsig-backend | online | Express API on port 3010 |
| 18 | qsig-cron | online (cron) | post-root every 5 min |
| 19 | qsig-bot | online | daily mint bot |
| ? | qsig-tunnel | online | cloudflared HTTPS tunnel |

### Other PM2 processes (pre-existing, do not touch)
signal-bot (0), kurator-server (1), market-regime (2), shadow-portfolio (3), channel-tester (4), vps-monitor-agent (5), onchaingm (6), onchaingm-testnet (7), crypto-news-scorer (8), crypto-narrative-detector (9), crypto-whale-tracker (10), fastsdcpu (11), nft-bot (13)

---

## 7. File Structure

### GitHub repo: `qsig-mint` (github.com/RzWojtek/qsig-mint)

```
qsig-mint/
├── .gitignore
├── contracts/
│   ├── src/
│   │   ├── QSIGToken.sol
│   │   └── QSIGMintGate.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   ├── test/
│   │   └── QSIGTest.t.sol
│   ├── foundry.toml
│   └── .env.example          ← never commit .env
└── frontend/
    ├── package.json           ← next@14.2.35
    ├── next.config.js
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/app/
        ├── globals.css
        ├── layout.tsx
        ├── page.tsx           ← home page
        ├── mint/
        │   └── page.tsx       ← main mint flow
        └── faq/
            └── page.tsx
```

### VPS file structure

```
/home/ubuntu/
├── qsig-backend/
│   ├── server.js              ← Express API
│   ├── package.json
│   ├── .env                   ← secrets, never in GitHub
│   ├── node_modules/
│   └── py/
│       ├── keygen.py          ← generates SPHINCS- keypair
│       └── verify.py          ← verifies SPHINCS- signature
├── qsig-cron/
│   ├── post-root.js           ← Merkle tree builder + on-chain poster
│   ├── package.json
│   ├── .env                   ← copy of backend .env
│   └── node_modules/
├── qsig-bot/
│   ├── qsig_bot.py            ← daily auto-mint bot
│   ├── start.sh               ← loads .env then runs python
│   └── .env                   ← bot config + wallet private key
└── logs/
    └── qsig-bot.log
```

---

## 8. Environment Variables

### `/home/ubuntu/qsig-backend/.env`
```
UPSTASH_REDIS_REST_URL=https://native-doberman-121291.upstash.io
UPSTASH_REDIS_REST_TOKEN=<secret>
SIGNER_PRIVATE_KEY=0x<signer_private_key>
PORT=3010
RPC_URL_BASE=https://base-mainnet.g.alchemy.com/v2/<key>
MINTGATE_ADDRESS_BASE=0x24dbeaed857889093ca27ed688A861075fc90F4E
# Other chains have 0x000... (not deployed yet)
```

### `/home/ubuntu/qsig-cron/.env`
Same as backend .env (copied with `cp`).

### `/home/ubuntu/qsig-bot/.env`
```
QSIG_BACKEND_URL=http://localhost:3001  # connects to local backend
QSIG_MINT_HOUR=8
QSIG_MINT_MINUTE=5
QSIG_WALLETS=0x4c8E881bEd49Ab7B13B3C22aBEC2D973AA630263
QSIG_CHAINS=base
RPC_URL_BASE=https://base-mainnet.g.alchemy.com/v2/<key>
MINTGATE_ADDRESS_BASE=0x24dbeaed857889093ca27ed688A861075fc90F4E
WALLET_PRIVATE_KEY_4c8e88=0x<wallet_private_key>
```

### Vercel Environment Variables (frontend)
```
NEXT_PUBLIC_BACKEND_URL=https://scotia-wichita-stationery-open.trycloudflare.com
NEXT_PUBLIC_GATE_BASE=0x24dbeaed857889093ca27ed688A861075fc90F4E
NEXT_PUBLIC_GATE_ARBITRUM=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_GATE_OPTIMISM=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_GATE_INK=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_GATE_MEGAETH=0x0000000000000000000000000000000000000000
```

---

## 9. API Endpoints

All endpoints are at `http://localhost:3010` (or via tunnel/nginx externally).

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/status` | Current day_epoch, pending mints per chain |
| POST | `/api/keygen` | Generate SPHINCS- keypair, returns `{pk, pk_hash}` |
| POST | `/api/sign` | Verify signature, queue mint in Redis, returns `{ok, day_epoch, pk_hash}` |
| POST | `/api/attest` | Generate EIP-712 attestation signature from SIGNER wallet |
| GET | `/api/proof?pkHash=&chain=&dayEpoch=` | Get Merkle proof for a given submission |

---

## 10. Full Mint Flow

```
User clicks "generate key"
    → frontend: POST /api/keygen
    → backend: py/keygen.py generates SPHINCS- keypair
    → returns {pk, pk_hash}

Frontend asks MetaMask for wallet address
    → switches to correct network (Base chain_id 8453)

Frontend: POST /api/sign {pk, sig, recipient, chain}
    → backend: py/verify.py verifies signature
    → backend: keccak256(pk) = pk_hash
    → backend: checks Redis for duplicate (slot:base:pkHash:epoch)
    → backend: saves to Redis queue (queue:base:20585)
    → returns {ok, day_epoch, pk_hash}

Frontend polls GET /api/proof every 30s for up to 10 min

Cron (every 5 min): post-root.js
    → reads Redis queue for current epoch
    → builds Merkle tree from leaves (keccak256(pk_hash || recipient))
    → saves Merkle proofs to Redis (merkle:base:pkHash:epoch)
    → calls MintGate.postRoot(epoch, root) on-chain via SIGNER wallet

Frontend: proof available → shows "mint now" button

User clicks "mint now"
    → frontend: POST /api/attest {pkHash, recipient, dayEpoch, chainId}
    → backend: SIGNER signs EIP-712 typed data
    → returns {ok, sig}

Frontend: calls MintGate.mint(dayEpoch, pkHash, proof, sig) with 0.0005 ETH
    → contract verifies: price OK, not already minted today, Merkle proof valid, EIP-712 sig valid
    → mints 500 QSIG to user
    → sends 0.0005 ETH to DEV address
```

---

## 11. Redis Key Schema

| Key | TTL | Content |
|---|---|---|
| `queue:base:20585` | 48h | List of JSON entries (pk, sig, pk_hash, recipient, day_epoch, chain, ts) |
| `slot:base:pkHash:20585` | 48h | "1" — duplicate prevention |
| `proof:base:pkHash:20585` | 30d | Full JSON entry for public verification |
| `merkle:base:pkHash:20585` | 48h | {proof, root, leaf, day_epoch} |

`day_epoch = Math.floor(unix_timestamp / 86400)` — changes every 24h UTC.

---

## 12. Smart Contract Logic Summary

### QSIGToken.sol
- Standard ERC-20
- Constructor mints 10M to LP_RECIPIENT and 1M to 0x...dEaD
- Only `mintGate` address can call `mint()`
- Hard cap: 21M tokens

### QSIGMintGate.sol
- `postRoot(epoch, root)` — only SIGNER can call, stores Merkle root
- `mint(dayEpoch, pkHash, proof, sig)` — payable, 0.0005 ETH
  1. Checks price
  2. Checks MAX_MINTS (20,000)
  3. Checks `usedSlot[keccak256(wallet, dayEpoch)]` — one per day per wallet
  4. Verifies Merkle proof: leaf = keccak256(pkHash || recipient)
  5. Verifies EIP-712 attestation from SIGNER
  6. Marks slot as used, mints 500 QSIG, sends ETH to dev
- `hasMinedToday(address)` — view function
- `currentDayEpoch()` — view function

---

## 13. Problems Encountered & Solutions

### Problem 1: Port 3001 conflict
**Cause:** `kurator-server` was already using port 3001.
**Solution:** Changed `PORT=3010` in backend .env.

### Problem 2: PM2 not loading .env for Python bot
**Cause:** PM2 `--env-file` flag not supported for Python interpreters.
**Solution:** Created `/home/ubuntu/qsig-bot/start.sh` that runs `source .env` then `exec python3 qsig_bot.py`. PM2 starts `start.sh` instead.

### Problem 3: Mixed Content (http vs https)
**Cause:** Vercel serves `https://` but backend was on `http://185.202.239.239:8080`. Browsers block mixed content.
**Solution:** Used Cloudflare Quick Tunnel (`cloudflared tunnel --url http://localhost:3010`) running as PM2 process. Gives free HTTPS URL.
**Warning:** Quick tunnel URL changes on restart. Must update `NEXT_PUBLIC_BACKEND_URL` in Vercel and redeploy.

### Problem 4: Vercel rewrite ROUTER_EXTERNAL_TARGET_CONNECTION_ERROR
**Cause:** Vercel's edge network blocks rewrites to external IPs/ports.
**Solution:** Abandoned Vercel rewrite approach, used Cloudflare Tunnel instead.

### Problem 5: node_modules not found by PM2
**Cause:** `npm install` was run from wrong directory; also `next` package was installed in qsig-backend because package.json had it.
**Solution:** Ran `npm install express cors dotenv ethers @upstash/redis` explicitly from `/home/ubuntu/qsig-backend`.

### Problem 6: Next.js security vulnerability CVE-2025-66478
**Cause:** Vercel blocked deploy of Next.js 14.2.3, 15.3.2, 15.3.3 due to critical RCE vulnerability.
**Solution:** Used `next@14.2.35` — the patched version in the 14.x line. Pages Router (not App Router) is used, which avoids RSC vulnerabilities entirely.

### Problem 7: mint() execution reverted
**Cause:** Frontend was sending `"0x00"` as the EIP-712 attestation signature. Contract rejected it.
**Solution:** Added `/api/attest` endpoint to backend. Frontend calls it before `mint()` to get a real EIP-712 signature from the SIGNER wallet.

### Problem 8: Nginx conflicting server_name
**Cause:** `kurator-api` already had `server_name 185.202.239.239` on port 80.
**Solution:** Changed qsig-backend Nginx config to listen on port 8080 instead.

### Problem 9: Bot not reading QSIG_WALLETS from .env
**Cause:** PM2 doesn't pass .env variables to Python processes automatically.
**Solution:** Same as Problem 2 — start.sh wrapper with `source .env`.

### Problem 10: /root/logs directory missing for bot
**Cause:** qsig_bot.py tries to write to `~/logs/qsig-bot.log` but directory didn't exist.
**Solution:** `mkdir -p /root/logs && touch /root/logs/qsig-bot.log`

### Problem 11: forge install --no-commit flag error
**Cause:** Newer version of Foundry removed `--no-commit` flag.
**Solution:** Used `forge install OpenZeppelin/openzeppelin-contracts` without the flag.

### Problem 12: Etherscan verification failed (deprecated V1 API)
**Cause:** foundry.toml pointed to old Etherscan V1 API.
**Solution:** Contracts are deployed and functional on-chain; verification is cosmetic. Can be fixed later by updating etherscan config in foundry.toml to V2 API.

---

## 14. UI Structure

### `/` — Home page
- Nav: QSIG logo, mint link, faq link
- Hero text: "quantum signature daily mint"
- Stats grid: token, networks, mint price, tokens/mint, hard cap, max slots
- CTA buttons: "mint now" → /mint, "how it works" → /faq

### `/mint` — Mint page
- Nav: QSIG, mint (active), faq
- Header: "daily mint", subtitle
- Network selector: Base, Arbitrum, Optimism, Ink, MegaETH (buttons, disabled after flow starts)
- Step tracker: 4 steps with visual done/active/pending states
- Action button: changes based on step (generate key → waiting → mint now → done)
- Log window: timestamped messages from the mint flow
- Error state: red box with "start over" link

### `/faq` — FAQ page
- 9 Q&A items in English
- Topics: SPHINCS-, daily key, private key safety, Merkle wait, mint frequency, contract safety, price, token, verification

---

## 15. Deployment Conventions

- **GitHub:** Web UI only (no terminal git). Create/edit files directly in browser.
- **Vercel:** Auto-deploys on every GitHub commit to main. Root directory: `frontend/`.
- **VPS updates:** Edit files with `nano`, reload with `pm2 reload <name>` (never `pm2 restart`).
- **Never commit:** `.env`, `node_modules/`, `contracts/out/`, `contracts/cache/`, `__pycache__/`
- **UI theme:** Dark — black background (`bg-black`), cyan accent (`text-cyan-400`, `bg-cyan-400`), zinc borders
- **Font:** `font-mono` everywhere
- **Code style:** TypeScript strict mode, async/await, no class components

---

## 16. Useful VPS Commands

```bash
# Check all processes
pm2 status

# Logs
pm2 logs qsig-backend --lines 30 --nostream
pm2 logs qsig-cron --lines 30 --nostream
pm2 logs qsig-bot --lines 30 --nostream
pm2 logs qsig-tunnel --lines 10 --nostream | grep trycloudflare

# Reload after code change
pm2 reload qsig-backend
pm2 reload qsig-cron

# Test backend locally
curl http://localhost:3010/api/status
curl -X POST http://localhost:3010/api/keygen

# Check which process uses port 3001
ss -tlnp | grep 3001

# Check tunnel URL
pm2 logs qsig-tunnel --lines 20 --nostream | grep trycloudflare

# Test bot manually (one run, one chain)
cd /home/ubuntu/qsig-bot
source .env
python3 qsig_bot.py --now --chain base

# Deploy new contract (from contracts/ folder)
source .env
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL_BASE --broadcast --verify -vvvv

# View .env files
find /home/ubuntu -name ".env" | sort
```

---

## 17. Current State (as of 2026-05-12)

### ✅ Working
- Smart contracts deployed on Base mainnet
- Backend API running on VPS port 3010 (PM2: qsig-backend)
- Cron posting Merkle roots every 5 min (PM2: qsig-cron)
- Cloudflare Tunnel giving HTTPS access (PM2: qsig-tunnel)
- Frontend deployed on Vercel at https://qsig-mint.vercel.app
- Full mint flow working end-to-end on Base:
  - SPHINCS- keygen ✅
  - Signature verification ✅
  - Merkle tree + root posting ✅
  - EIP-712 attestation ✅
  - on-chain mint() ✅
  - 500 QSIG delivered to wallet ✅
- All UI text in English ✅
- Bot structure in place (qsig-bot PM2 process running)

### ⚠️ Issues / Known Limitations
- **Cloudflare Quick Tunnel URL changes on restart** — must update Vercel env var `NEXT_PUBLIC_BACKEND_URL` and redeploy frontend every time PM2 restarts qsig-tunnel. Consider upgrading to named Cloudflare Tunnel (requires Cloudflare account).
- **Contracts only on Base** — Arbitrum, Optimism, Ink, MegaETH not deployed yet. Network selector shows all 5 but only Base works.
- **Bot auto-mint on-chain not tested** — bot sends keygen+sign to backend but the on-chain `mint()` call from bot hasn't been verified end-to-end. Manual minting via website works.
- **Contract not verified on Basescan** — Etherscan API V1 deprecated. Contracts work but code isn't visible on Basescan explorer.
- **SPHINCS- verification is simplified** — `verify.py` accepts any signature of correct length (development mode). Full cryptographic SPHINCS- verification not yet implemented.

### 🔜 Next Steps (suggested)
1. Fix Cloudflare Tunnel permanence (named tunnel or get a domain)
2. Deploy contracts on remaining 4 networks
3. Test bot auto-mint end-to-end
4. Implement proper SPHINCS- verification in verify.py
5. Verify contracts on Basescan (fix Etherscan V2 API in foundry.toml)
6. Add QSIG to Uniswap/Aerodrome LP on Base

---

## 18. Prompt Startowy

*Wklej poniższy blok jako pierwszą wiadomość w nowym czacie:*

---

```
Kontynuuję pracę nad projektem QSIG (Quantum Signature Daily Mint Token).

CZYM JEST:
Daily-mint ERC-20 token na Base (i docelowo Arbitrum, Optimism, Ink, MegaETH). 
Mint gated by SPHINCS- post-quantum signature — jak sphincs.fun.
500 QSIG za 0.0005 ETH, raz dziennie per wallet.
Projekt 1: prywatny bot VPS auto-mintuje na moje wallety.
Projekt 2: publiczna strona gdzie każdy może mintować.

STACK:
- Kontrakty: Solidity 0.8.24 + Foundry + OpenZeppelin
- Backend: Node.js/Express na VPS, port 3010, PM2 (qsig-backend)
- Cron: post-root.js co 5 min, PM2 (qsig-cron)  
- Bot: Python qsig_bot.py, PM2 (qsig-bot), start przez start.sh
- DB: Upstash Redis (REST)
- Frontend: Next.js 14.2.35 + Tailwind + ethers.js v6, Vercel
- HTTPS: Cloudflare Quick Tunnel (qsig-tunnel PM2), URL zmienia się po restarcie
- VPS: Ubuntu 24, IP 185.202.239.239, Node v22, Python 3.12

KONTRAKTY NA BASE (jedyna wdrożona sieć):
- QSIGToken: 0xE6417fDB0FBB671deaced0C4209C8087f435EcAf
- QSIGMintGate: 0x24dbeaed857889093ca27ed688A861075fc90F4E

REPO GITHUB: github.com/RzWojtek/qsig-mint
- contracts/ — Solidity
- frontend/ — Next.js (Vercel root dir)
FRONTEND: https://qsig-mint.vercel.app

VPS PLIKI:
- /home/ubuntu/qsig-backend/ — Express API
- /home/ubuntu/qsig-cron/ — post-root cron
- /home/ubuntu/qsig-bot/ — daily mint bot

STAN:
✅ Pełny mint flow działa na Base end-to-end (keygen → sign → Merkle → attest → mint)
✅ 500 QSIG dostarczone do walleta po mint
✅ UI w całości po angielsku
⚠️ Cloudflare tunnel URL zmienia się po restarcie PM2 — trzeba aktualizować NEXT_PUBLIC_BACKEND_URL w Vercel
⚠️ Pozostałe 4 sieci nie mają wdrożonych kontraktów
⚠️ verify.py w trybie uproszczonym (akceptuje każdy podpis odpowiedniej długości)
⚠️ Kontrakty nie zweryfikowane na Basescan

KLUCZOWE PORTY I KONFLIKTY:
- Port 3001: zajęty przez kurator-server → qsig używa 3010
- Port 80: zajęty przez kurator-api → qsig-nginx na 8080
- PM2 nie ładuje .env dla Pythona → używamy start.sh wrappera

CO CHCĘ TERAZ ZROBIĆ: [OPISZ TUTAJ CO CHCESZ ZROBIĆ]
```
