# QSIG — Project Context File
*Ostatnia aktualizacja: 2026-05-15. Wklej ten plik na początku każdego nowego czatu.*

---

## 1. Co to jest QSIG?

QSIG (Quantum Signature) to daily-mint ERC-20 token na Base, Arbitrum, Ink i MegaETH (Optimism wyrzucone). Mint jest gated przez **SPHINCS- post-quantum signature** — ten sam mechanizm co sphincs.fun. Każdego dnia użytkownik generuje świeży keypair SPHINCS-, podpisuje wiadomość zawierającą datę + adres walleta, backend weryfikuje podpis off-chain, buduje Merkle tree co 5 minut, postuje root on-chain, a użytkownik wywołuje `mint()` z Merkle proof + EIP-712 attestation.

**Dwa projekty:**
- **Projekt 1 (Bot):** Prywatny bot VPS który auto-mintuje codziennie do walletów Wojtka — **zatrzymany** (`pm2 stop qsig-bot`). Aby wznowić: `pm2 start qsig-bot && pm2 save`
- **Projekt 2 (Strona publiczna):** Strona gdzie każdy może połączyć MetaMask i mintować 500 QSIG za 0.0005 ETH.

Oba projekty współdzielą te same smart kontrakty.

---

## 2. Token Details

| Parametr | Wartość |
|---|---|
| Name | Quantum Signature |
| Symbol | QSIG |
| Hard cap | 21,000,000 QSIG |
| LP reserve | 10,000,000 QSIG (do LP_RECIPIENT wallet przy deploy) |
| Burned | 1,000,000 QSIG (do 0x...dEaD przy deploy) |
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
  - `QSIGToken.sol` — standard ERC-20, tylko MintGate może mintować
  - `QSIGMintGate.sol` — daily cooldown logic, Merkle proof + EIP-712 attestation verification

### Backend
- **Runtime:** Node.js v22
- **Framework:** Express.js
- **Port:** 3010 (3001 zajęty przez kurator-server)
- **Database/Queue:** Upstash Redis (REST API)
- **Python helpers:** `py/keygen.py`, `py/verify.py` (wywoływane przez execSync z Node)
- **Process manager:** PM2 (nazwa: `qsig-backend`)
- **Lokalizacja na VPS:** `/home/ubuntu/qsig-backend/`

### Cron (post-root)
- **Plik:** `post-root.js`
- **Language:** Node.js
- **Schedule:** co 5 minut via PM2 cron (`*/5 * * * *`)
- **Nazwa procesu:** `qsig-cron`
- **Lokalizacja:** `/home/ubuntu/qsig-cron/`
- **Co robi:** czyta pending minty z Redis, buduje Merkle tree, postuje root on-chain dla każdej sieci

### Bot (prywatny daily mint)
- **Plik:** `qsig_bot.py`
- **Language:** Python 3.12
- **Nazwa procesu:** `qsig-bot` — **ZATRZYMANY**
- **Lokalizacja:** `/home/ubuntu/qsig-bot/`
- **Launcher:** `/home/ubuntu/qsig-bot/start.sh` (ładuje .env, potem uruchamia python)
- **Schedule:** działa ciągle, mintuje o QSIG_MINT_HOUR:QSIG_MINT_MINUTE UTC każdego dnia

### Frontend
- **Framework:** Next.js 14.2.35 (Pages Router, NIE App Router RSC — unika CVE-2025-66478)
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Wallet:** ethers.js v6 + MetaMask (window.ethereum)
- **Hosting:** Vercel (auto-deploy z GitHub)
- **URL:** https://qsig-mint.vercel.app
- **Root dir na Vercel:** `frontend/`

### Tunnel (HTTPS dla VPS backend)
- **Tool:** Cloudflare Quick Tunnel (cloudflared)
- **Nazwa procesu:** `qsig-tunnel`
- **Command:** `pm2 start "cloudflared tunnel --url http://localhost:3010" --name qsig-tunnel`
- **⚠️ URL zmienia się przy każdym restarcie PM2**
- **Automatyzacja:** skrypt `qsig-tunnel-updater.sh` + cron co 5 minut wykrywa zmianę URL i automatycznie aktualizuje Vercel env + triggeruje redeploy (patrz sekcja 11)

### Nginx (pomocniczo)
- **Config:** `/etc/nginx/sites-available/qsig-backend`
- **Nasłuchuje na:** port 8080 (port 80 zajęty przez kurator-api)
- **Proxy do:** `http://127.0.0.1:3010`
- **Uwaga:** Nginx pomocniczy — Cloudflare Tunnel jest głównym rozwiązaniem HTTPS

---

## 4. Deployed Contracts

### Base Mainnet (chain_id: 8453) ✅
| Kontrakt | Adres |
|---|---|
| QSIGToken | `0xE6417fDB0FBB671deaced0C4209C8087f435EcAf` |
| QSIGMintGate | `0x24dbeaed857889093ca27ed688A861075fc90F4E` |

### Arbitrum (chain_id: 42161) ✅
| Kontrakt | Adres |
|---|---|
| QSIGToken | `0xCe5fC8F1319e3cd9fA4068b916AA16B10Fa8CCcC` |
| QSIGMintGate | `0xa9286A708AfFB0c1d644ffce2779b410903CAa08` |

### Ink (chain_id: 57073) ✅
| Kontrakt | Adres |
|---|---|
| QSIGToken | `0xE6417fDB0FBB671deaced0C4209C8087f435EcAf` |
| QSIGMintGate | `0x24dbeaed857889093ca27ed688A861075fc90F4E` |

*Uwaga: Ink ma te same adresy co Base — deployer miał ten sam nonce na obu sieciach (przypadkowa zbieżność, technicznie OK)*

### MegaETH (chain_id: 4326) ✅
| Kontrakt | Adres |
|---|---|
| QSIGToken | `0xe0fc756Ff8292974C35f8526854d4E307e1F7fBC` |
| QSIGMintGate | `0x23d2886153f26fFA77FDFc5f6C41ee7c333C0450` |

*Uwaga: MegaETH wymaga ETH na portfelu SIGNER do postowania Merkle rootów*

---

## 5. Chain IDs (zweryfikowane przez eth_chainId RPC)

```
Base:     8453
Arbitrum: 42161
Ink:      57073   ← NIE 763373 (to był testnet)
MegaETH:  4326    ← NIE 6342
```

---

## 6. Wallety

| Rola | Cel |
|---|---|
| DEPLOYER | Zapłacił za deploy kontraktów (jednorazowo). DEPLOYER_PRIVATE_KEY w contracts/.env |
| SIGNER | Podpisuje EIP-712 attestations i postuje Merkle rooty on-chain. Klucz prywatny w backend .env |
| DEV | Otrzymuje 0.0005 ETH z każdego mintu. Tylko adres, klucz nie potrzebny |
| LP | Otrzymał 10M QSIG przy deploy. Tylko adres, klucz nie potrzebny |

Wallet mintujący Wojtka: `0x4c8E881bEd49Ab7B13B3C22aBEC2D973AA630263`

**⚠️ SIGNER na Base ma bardzo mało ETH — wymaga doładowania żeby cron mógł regularnie postować Merkle rooty**

---

## 7. VPS Details

| Element | Wartość |
|---|---|
| IP | 185.202.239.239 |
| OS | Ubuntu 24 |
| Node | v22 |
| Python | 3.12 |
| PM2 | v5+ |

### PM2 procesy (QSIG)
| Nazwa | Status | Uwagi |
|---|---|---|
| qsig-backend | online | Express API na porcie 3010 |
| qsig-cron | online (cron) | post-root co 5 min |
| qsig-bot | **stopped** | daily mint bot — zatrzymany ręcznie |
| qsig-tunnel | online | cloudflared HTTPS tunnel |
| qsig-tunnel-watcher | online (no-autorestart) | uruchamiany ręcznie po restarcie tunelu |

### Inne PM2 procesy (nie ruszać)
signal-bot, kurator-server, market-regime, shadow-portfolio, channel-tester, vps-monitor-agent, onchaingm, onchaingm-testnet, crypto-news-scorer, crypto-narrative-detector, crypto-whale-tracker, fastsdcpu, nft-bot

---

## 8. Struktura plików

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
│   └── .env.example
└── frontend/
    ├── package.json           ← next@14.2.35
    ├── next.config.js
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/app/
        ├── globals.css
        ├── layout.tsx
        ├── page.tsx           ← strona główna
        ├── mint/
        │   └── page.tsx       ← główny flow mint
        └── faq/
            └── page.tsx
```

### VPS struktura plików

```
/home/ubuntu/
├── qsig-backend/
│   ├── server.js              ← Express API
│   ├── package.json
│   ├── .env                   ← sekrety, nigdy w GitHub
│   ├── node_modules/
│   └── py/
│       ├── keygen.py          ← generuje keypair SPHINCS-
│       └── verify.py          ← weryfikuje podpis (tryb uproszczony)
├── qsig-cron/
│   ├── post-root.js           ← builder Merkle tree + poster on-chain
│   ├── package.json
│   ├── .env                   ← kopia backend .env
│   └── node_modules/
├── qsig-bot/
│   ├── qsig_bot.py            ← daily auto-mint bot
│   ├── start.sh               ← ładuje .env, uruchamia python
│   └── .env                   ← config bota + klucz prywatny walleta
├── qsig-tunnel-updater.sh     ← skrypt auto-update Vercel po zmianie URL tunelu
├── qsig-tunnel-updater.log    ← logi skryptu
└── qsig-tunnel-updater.state  ← ostatni znany URL tunelu (dla deduplikacji)
```

---

## 9. Environment Variables

### `/home/ubuntu/qsig-backend/.env` (i qsig-cron/.env — kopia)
```
UPSTASH_REDIS_REST_URL=https://native-doberman-121291.upstash.io
UPSTASH_REDIS_REST_TOKEN=<secret>
SIGNER_PRIVATE_KEY=0x<secret>
PORT=3010
RPC_URL_BASE=https://base-mainnet.g.alchemy.com/v2/<key>
RPC_URL_ARBITRUM=https://arb-mainnet.g.alchemy.com/v2/<key>
RPC_URL_INK=https://rpc-gel.inkonchain.com
RPC_URL_MEGAETH=https://mainnet.megaeth.com/rpc
MINTGATE_ADDRESS_BASE=0x24dbeaed857889093ca27ed688A861075fc90F4E
MINTGATE_ADDRESS_ARBITRUM=0xa9286A708AfFB0c1d644ffce2779b410903CAa08
MINTGATE_ADDRESS_INK=0x24dbeaed857889093ca27ed688A861075fc90F4E
MINTGATE_ADDRESS_MEGAETH=0x23d2886153f26fFA77FDFc5f6C41ee7c333C0450
```

### `/home/ubuntu/qsig-bot/.env`
```
QSIG_BACKEND_URL=http://localhost:3010
QSIG_MINT_HOUR=8
QSIG_MINT_MINUTE=5
QSIG_WALLETS=0x4c8E881bEd49Ab7B13B3C22aBEC2D973AA630263
QSIG_CHAINS=base,arbitrum,ink,megaeth
RPC_URL_BASE=https://base-mainnet.g.alchemy.com/v2/<key>
RPC_URL_ARBITRUM=https://arb-mainnet.g.alchemy.com/v2/<key>
RPC_URL_INK=https://rpc-gel.inkonchain.com
RPC_URL_MEGAETH=https://mainnet.megaeth.com/rpc
MINTGATE_ADDRESS_BASE=0x24dbeaed857889093ca27ed688A861075fc90F4E
MINTGATE_ADDRESS_ARBITRUM=0xa9286A708AfFB0c1d644ffce2779b410903CAa08
MINTGATE_ADDRESS_INK=0x24dbeaed857889093ca27ed688A861075fc90F4E
MINTGATE_ADDRESS_MEGAETH=0x23d2886153f26fFA77FDFc5f6C41ee7c333C0450
WALLET_PRIVATE_KEY_4c8e88=0x<secret>
```

### Vercel Environment Variables
```
NEXT_PUBLIC_BACKEND_URL=https://<aktualny-tunnel>.trycloudflare.com   ← aktualizowane automatycznie
NEXT_PUBLIC_GATE_BASE=0x24dbeaed857889093ca27ed688A861075fc90F4E
NEXT_PUBLIC_GATE_ARBITRUM=0xa9286A708AfFB0c1d644ffce2779b410903CAa08
NEXT_PUBLIC_GATE_INK=0x24dbeaed857889093ca27ed688A861075fc90F4E
NEXT_PUBLIC_GATE_MEGAETH=0x23d2886153f26fFA77FDFc5f6C41ee7c333C0450
```

**⚠️ NEXT_PUBLIC_BACKEND_URL NIE może być typu "Sensitive" w Vercel — inaczej API nie może go aktualizować**

---

## 10. API Endpoints

### `POST /api/keygen`
Generuje SPHINCS- keypair. Zwraca `{ pk, sk, pkHash }`.

### `POST /api/sign`
Weryfikuje podpis SPHINCS-. Body: `{ pk, signature, message }`. Zwraca `{ ok: true }` lub błąd.

### `POST /api/submit`
Zapisuje mint request do Redis. Body: `{ pkHash, wallet, chainId }`. Zwraca `{ ok: true }`.

### `POST /api/attest`
Generuje EIP-712 attestation od SIGNER. Body: `{ pkHash, recipient, dayEpoch, chainId }`. Zwraca `{ attestation }`.

### `GET /api/proof?pkHash=...&chainId=...`
Zwraca Merkle proof dla danego pkHash. Zwraca `{ proof, root }` lub `{ error: "not in tree" }`.

### `GET /api/supply?chain=base|arbitrum|ink|megaeth`
Zwraca stan supply z kontraktu. Zwraca `{ ok, chain, total_supply, public_minted, slots_used, pct, remaining }`.

---

## 11. Automatyzacja Tunnel URL (qsig-tunnel-updater)

### Problem
Cloudflare Quick Tunnel zmienia URL przy każdym restarcie PM2. Bez automatyzacji strona przestaje działać do czasu ręcznej aktualizacji Vercel.

### Rozwiązanie
Skrypt `/home/ubuntu/qsig-tunnel-updater.sh` + cron job co 5 minut.

### Jak działa
1. Cron co 5 minut uruchamia skrypt
2. Skrypt czyta aktualny URL z logu PM2 (`qsig-tunnel-error.log`)
3. Porównuje z ostatnim znanym URL (zapisanym w `qsig-tunnel-updater.state`)
4. Jeśli URL taki sam → exit 0 (kończy w ciągu sekundy, nic nie robi)
5. Jeśli URL się zmienił → aktualizuje `NEXT_PUBLIC_BACKEND_URL` przez Vercel API → triggeruje redeploy
6. Zapisuje nowy URL do pliku state

### Maksymalny przestój przy zmianie URL
~5 min (cron) + ~2 min (Vercel redeploy) = **~7 minut bez żadnej interwencji**

### Cron entry
```bash
*/5 * * * * /home/ubuntu/qsig-tunnel-updater.sh >> /home/ubuntu/qsig-tunnel-updater.log 2>&1
```

### Weryfikacja logów
```bash
cat /home/ubuntu/qsig-tunnel-updater.log
```

### Vercel API użyte przez skrypt
- `GET /v9/projects/{id}/env` — pobiera ENV ID dla NEXT_PUBLIC_BACKEND_URL
- `PATCH /v9/projects/{id}/env/{envId}` — aktualizuje wartość
- `GET /v6/deployments?projectId={id}&limit=1` — pobiera ID ostatniego deployu
- `POST /v13/deployments?forceNew=1` — triggeruje redeploy

---

## 12. Znane problemy i ograniczenia

| Problem | Status | Rozwiązanie |
|---|---|---|
| Tunnel URL zmienia się po restarcie | ✅ Zautomatyzowane | cron + qsig-tunnel-updater.sh |
| SIGNER na Base ma mało ETH | ⚠️ Wymaga doładowania | Przelać ETH na adres SIGNER na Base |
| verify.py w trybie uproszczonym | ⚠️ Development mode | Akceptuje każdy podpis odpowiedniej długości |
| Kontrakty nie zweryfikowane na explorerach | ⚠️ Kosmetyczne | Etherscan API V1 deprecated; użyć V2 w foundry.toml |
| qsig-bot zatrzymany | ✅ Celowo | `pm2 start qsig-bot && pm2 save` aby wznowić |

---

## 13. Mint Flow (jak działa krok po kroku)

```
1. Frontend: generuje SPHINCS- keypair (POST /api/keygen)
2. Frontend: user podpisuje wiadomość MetaMask (ECDSA, nie SPHINCS-)
3. Frontend: wysyła podpis do backendu (POST /api/sign) → weryfikacja SPHINCS-
4. Frontend: submit do Redis (POST /api/submit) z pkHash + wallet + chainId
5. Cron (co 5 min): czyta Redis → buduje Merkle tree → postuje root on-chain
6. Frontend: polling /api/proof aż proof dostępny
7. Frontend: pobiera EIP-712 attestation od SIGNER (POST /api/attest)
8. Frontend: wywołuje mint() na kontrakcie z proof + attestation + 0.0005 ETH
9. Kontrakt: weryfikuje proof + attestation → mintuje 500 QSIG do walleta
```

---

## 14. Kluczowe komendy VPS

```bash
# Status wszystkich procesów
pm2 status

# Logi
pm2 logs qsig-backend --lines 30 --nostream
pm2 logs qsig-cron --lines 30 --nostream
pm2 logs qsig-tunnel --lines 20 --nostream | grep trycloudflare
cat /home/ubuntu/qsig-tunnel-updater.log

# Reload po zmianie kodu (nie restart!)
pm2 reload qsig-backend
pm2 reload qsig-cron

# Restart z załadowaniem nowych env vars
pm2 restart qsig-backend --update-env

# Bot
pm2 start qsig-bot && pm2 save    # wznów bota
pm2 stop qsig-bot && pm2 save     # zatrzymaj bota

# Test backendu lokalnie
curl http://localhost:3010/api/supply?chain=base
curl http://localhost:3010/api/supply?chain=arbitrum
curl http://localhost:3010/api/supply?chain=ink
curl http://localhost:3010/api/supply?chain=megaeth

# Aktualny URL tunelu
pm2 logs qsig-tunnel --lines 20 --nostream | grep trycloudflare

# Ręczne uruchomienie updater skryptu
bash /home/ubuntu/qsig-tunnel-updater.sh

# Sprawdź cron
crontab -l

# MegaETH — sprawdzenie Chain ID
curl -X POST https://mainnet.megaeth.com/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Deploy kontraktu (z katalogu contracts/)
source .env
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL_BASE --broadcast -vvvv

# MegaETH deploy wymaga dodatkowych flag
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL_MEGAETH \
  --broadcast --skip-simulation --gas-limit 3000000 -vvvv
```

---

## 15. Specyfika sieci

### MegaETH
- Mainnet live od 9 lutego 2026
- Oficjalny RPC: `https://mainnet.megaeth.com/rpc`
- Deploy wymaga `--skip-simulation --gas-limit 3000000`
- Bloki co ~10ms (najszybszy L2)

### Ink
- L2 od Kraken, na OP Stack / Superchain
- Mainnet RPC: `https://rpc-gel.inkonchain.com`
- Chain ID: 57073 (NIE 763373 — to był testnet)

---

## 16. Konwencje deploymentu

- **GitHub:** Web UI tylko (bez terminal git). Tworzenie/edycja plików bezpośrednio w przeglądarce
- **Vercel:** Auto-deploy przy każdym commicie do main. Root directory: `frontend/`
- **VPS updates:** Edycja przez `nano`, reload przez `pm2 reload <name>` (nigdy `pm2 restart` bez --update-env)
- **pm2 reload** NIE aktualizuje env vars → używaj `pm2 restart <name> --update-env`
- **Python + PM2:** PM2 nie ładuje .env dla Pythona → używamy `start.sh` wrappera
- **Nigdy nie commituj:** `.env`, `node_modules/`, `contracts/out/`, `contracts/cache/`, `__pycache__/`
- **UI theme:** Ciemny — czarne tło (`bg-black`), cyan accent (`text-cyan-400`), zinc borders
- **Font:** `font-mono` wszędzie

---

## 17. Aktualny stan (2026-05-15)

### ✅ Działa
- Pełny mint flow na Base, Arbitrum, Ink ✅
- MegaETH działa (wymaga ETH na SIGNER do postowania rootów) ✅
- Strona główna z 4 osobnymi paskami postępu per sieć ✅
- Przycisk "mint on another network" po udanym mincie ✅
- Cała strona po angielsku ✅
- Bot zmintował automatycznie 2026-05-15 o 08:05 UTC (TX: e074241d...), następnie zatrzymany ✅
- /api/supply działa dla wszystkich 4 sieci ✅
- **Automatyczny update Vercel po zmianie URL tunelu (cron co 5 min)** ✅

### ⚠️ Znane ograniczenia
- SIGNER na Base ma bardzo mało ETH — wymaga doładowania
- verify.py w trybie uproszczonym (akceptuje każdy podpis odpowiedniej długości)
- Kontrakty nie zweryfikowane na explorerach (Etherscan API V1 deprecated)
- qsig-bot zatrzymany (celowo)

### 🔜 Sugerowane kolejne kroki
1. Doładować ETH na portfel SIGNER na Base
2. Zweryfikować kontrakty na explorerach (zaktualizować foundry.toml do Etherscan API V2)
3. Zaimplementować prawdziwą weryfikację SPHINCS- w verify.py
4. Dodać QSIG do Uniswap/Aerodrome LP na Base

---

## 18. Prompt startowy

*Wklej poniższy blok jako pierwszą wiadomość w nowym czacie:*

```
Kontynuuję pracę nad projektem QSIG (Quantum Signature Daily Mint Token).

CZYM JEST:
Daily-mint ERC-20 token na Base, Arbitrum, Ink, MegaETH (Optimism wyrzucone).
Mint gated by SPHINCS- post-quantum signature — jak sphincs.fun.
500 QSIG za 0.0005 ETH, raz dziennie per wallet per sieć.
Projekt 1: prywatny bot VPS (zatrzymany) — można wznowić pm2 start qsig-bot.
Projekt 2: publiczna strona gdzie każdy może mintować.

STACK:
- Kontrakty: Solidity 0.8.24 + Foundry + OpenZeppelin
- Backend: Node.js/Express na VPS, port 3010, PM2 (qsig-backend)
- Cron: post-root.js co 5 min, PM2 (qsig-cron)
- Bot: Python qsig_bot.py, PM2 (qsig-bot) — ZATRZYMANY
- DB: Upstash Redis (REST)
- Frontend: Next.js 14.2.35 + Tailwind + ethers.js v6, Vercel
- HTTPS: Cloudflare Quick Tunnel (qsig-tunnel PM2) — URL auto-update przez cron!
- VPS: Ubuntu 24, IP 185.202.239.239, Node v22, Python 3.12

KONTRAKTY (wszystkie 4 sieci):
Base (8453):      Token: 0xE6417...EcAf  Gate: 0x24dbe...0F4E
Arbitrum (42161): Token: 0xCe5fC...CcCC  Gate: 0xa9286...aa08
Ink (57073):      Token: 0xE6417...EcAf  Gate: 0x24dbe...0F4E
MegaETH (4326):   Token: 0xe0fc7...FfBC  Gate: 0x23d28...0450

REPO GITHUB: github.com/RzWojtek/qsig-mint
FRONTEND: https://qsig-mint.vercel.app

VPS PLIKI:
- /home/ubuntu/qsig-backend/ — Express API + /api/attest + /api/supply
- /home/ubuntu/qsig-cron/ — post-root cron
- /home/ubuntu/qsig-bot/ — daily mint bot (zatrzymany)
- /home/ubuntu/qsig-tunnel-updater.sh — auto-update Vercel po zmianie URL tunelu

STAN:
✅ Pełny mint flow działa na Base, Arbitrum, Ink
✅ MegaETH działa (wymaga ETH na SIGNER do postowania rootów)
✅ Strona główna z 4 osobnymi paskami postępu per sieć
✅ Tunnel URL auto-update przez cron (qsig-tunnel-updater.sh co 5 min)
⚠️ SIGNER na Base ma bardzo mało ETH — wymaga doładowania
⚠️ verify.py w trybie uproszczonym (akceptuje każdy podpis)
⚠️ Kontrakty nie zweryfikowane na explorerach

KLUCZOWE PORTY I KONFLIKTY:
- Port 3001: zajęty przez kurator-server → qsig używa 3010
- Port 80: zajęty przez kurator-api → qsig-nginx na 8080
- PM2 nie ładuje .env dla Pythona → używamy start.sh wrappera
- pm2 reload NIE aktualizuje env vars → używaj pm2 restart --update-env
- NEXT_PUBLIC_BACKEND_URL NIE może być "Sensitive" w Vercel

CO CHCĘ TERAZ ZROBIĆ: [OPISZ TUTAJ CO CHCESZ ZROBIĆ]
```
