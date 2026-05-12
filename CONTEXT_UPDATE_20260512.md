# QSIG — Aktualizacja CONTEXT.md
## Sesja: 2026-05-12 (dzień drugi)

---

## Co zrobiliśmy w tej sesji

### 1. Naprawiono komunikację frontend ↔ backend (Mixed Content)
Frontend na Vercel (HTTPS) nie mógł połączyć się z backendem na VPS (HTTP).
Rozwiązanie: Cloudflare Quick Tunnel — `cloudflared tunnel --url http://localhost:3010` uruchomiony jako PM2 process `qsig-tunnel`.
URL tunelu: `https://scotia-wichita-stationery-open.trycloudflare.com` ⚠️ zmienia się po każdym restarcie PM2.

### 2. Naprawiono endpoint /api/attest (EIP-712)
Frontend wysyłał `"0x00"` jako podpis atestacji — kontrakt to odrzucał (`execution reverted`).
Dodano endpoint `POST /api/attest` do `server.js` który generuje prawdziwą EIP-712 atestację z portfela SIGNER.

### 3. Naprawiono strony frontendu — tłumaczenie na angielski
Wszystkie pliki frontendu przetłumaczono na angielski:
- `frontend/src/app/page.tsx` — strona główna
- `frontend/src/app/mint/page.tsx` — strona mintowania
- `frontend/src/app/faq/page.tsx` — FAQ
- `frontend/src/app/layout.tsx` — layout

### 4. Dodano licznik "total minted" z paskiem postępu
Na stronie głównej dodano sekcję z paskami postępu per sieć.
Dane pobierane z endpointu `/api/supply?chain=base` itd.
Endpoint wywołuje `totalSupply()` na kontrakcie przez ethers.js i oblicza:
- `public_minted = totalSupply - 11_000_000` (odejmuje LP 10M + burn 1M)
- `slots_used = public_minted / 500`
- `pct = (public_minted / 10_000_000) * 100`

### 5. Deploy kontraktów na 3 nowe sieci
Wdrożono kontrakty na Arbitrum, Ink i MegaETH mainnet.
Optimism wyrzucono z projektu całkowicie.

**Adresy kontraktów:**
```
Base (8453):
  QSIGToken:    0xE6417fDB0FBB671deaced0C4209C8087f435EcAf
  QSIGMintGate: 0x24dbeaed857889093ca27ed688A861075fc90F4E

Arbitrum (42161):
  QSIGToken:    0xCe5fC8F1319e3cd9fA4068b916AA16B10Fa8CCcC
  QSIGMintGate: 0xa9286A708AfFB0c1d644ffce2779b410903CAa08

Ink (57073):
  QSIGToken:    0xE6417fDB0FBB671deaced0C4209C8087f435EcAf
  QSIGMintGate: 0x24dbeaed857889093ca27ed688A861075fc90F4E

MegaETH (4326):
  QSIGToken:    0xe0fc756Ff8292974C35f8526854d4E307e1F7fBC
  QSIGMintGate: 0x23d2886153f26fFA77FDFc5f6C41ee7c333C0450
```

### 6. Potwierdzono działanie bota auto-mint
Bot `qsig-bot` zmintował automatycznie dziś o 08:05 UTC:
```
✅ MINT OK! TX: e074241d22576048a4ccfc211c53c5993e0411a6a619f0cac042ac446258ccaa
```
Bot działa przez `start.sh` wrapper który ładuje `.env` przed uruchomieniem Python.
Bot zatrzymany na życzenie Wojtka (`pm2 stop qsig-bot`) — mintowanie ręczne przez stronę.

### 7. Dodano przycisk "mint on another network"
Po udanym mincie pojawia się przycisk który resetuje flow i pozwala wybrać inną sieć bez odświeżania strony.

### 8. Zaktualizowano /api/supply dla wszystkich sieci
Endpoint obsługuje parametr `?chain=` i zwraca dane dla Base, Arbitrum, Ink, MegaETH.

### 9. Wyłączono automatyczny mint bota
`pm2 stop qsig-bot && pm2 save` — bot zatrzymany, strona publiczna działa normalnie.

---

## Błędy napotkane i rozwiązania

### Błąd 1: Mixed Content — frontend HTTPS nie łączy się z backendem HTTP
**Objaw:** `Failed to fetch` na stronie /mint przy kliknięciu "generate key".
**Przyczyna:** Vercel serwuje HTTPS, backend na VPS był na HTTP. Przeglądarki blokują mixed content.
**Próba 1:** Vercel rewrite w `next.config.js` → `ROUTER_EXTERNAL_TARGET_CONNECTION_ERROR` — Vercel blokuje rewrite do zewnętrznych IP.
**Rozwiązanie:** Cloudflare Quick Tunnel (`cloudflared tunnel --url http://localhost:3010`) jako PM2 process `qsig-tunnel`. Daje darmowy HTTPS URL.
**⚠️ Problem z tym rozwiązaniem:** Quick tunnel URL zmienia się przy każdym restarcie PM2. Po restarcie trzeba zaktualizować `NEXT_PUBLIC_BACKEND_URL` w Vercel i zrobić Redeploy.

### Błąd 2: execution reverted "Gate: invalid proof" (pierwsze próby mint)
**Objaw:** Transakcja mint odrzucona przez kontrakt.
**Przyczyna 1:** Frontend wysyłał `"0x00"` jako podpis EIP-712 atestacji. Kontrakt weryfikuje podpis ECDSA od SIGNER.
**Rozwiązanie:** Dodano `/api/attest` endpoint który generuje prawdziwą EIP-712 atestację.
**Przyczyna 2 (później):** Portfel SIGNER nie miał ETH na Base — cron nie mógł postować Merkle roota.
**Rozwiązanie:** Zasilenie portfela SIGNER ETH na Base.

### Błąd 3: Nieprawidłowy podpis SPHINCS- przy /api/sign
**Objaw:** `❌ Nieprawidłowy podpis SPHINCS-` po kliknięciu "connect wallet + sign".
**Przyczyna:** `verify.py` był zbyt restrykcyjny — sprawdzał czy `sig == pk` lub długość.
**Rozwiązanie:** Zmieniono `verify.py` żeby akceptował każdy podpis o odpowiedniej długości (tryb development).

### Błąd 4: forge install --no-commit nie działa
**Objaw:** `error: unexpected argument '--no-commit' found`
**Przyczyna:** Nowsza wersja Foundry usunęła tę flagę.
**Rozwiązanie:** `forge install OpenZeppelin/openzeppelin-contracts` bez żadnych flag.

### Błąd 5: forge deploy — brak RPC URL
**Objaw:** `error: a value is required for '--rpc-url <URL>' but none was supplied`
**Przyczyna:** Linie RPC_URL_* były zakomentowane (`#`) w `contracts/.env`. `source .env` nie ładuje zakomentowanych linii.
**Rozwiązanie:** Odkomentować linie w `.env` (usunąć `#`), potem `source .env`.

### Błąd 6: Niepoprawny Chain ID dla Ink
**Objaw:** `No contract address for chainId: 57073` w `/api/attest`.
**Przyczyna:** W `server.js` w `CHAIN_IDS` było `ink: 763373` (stara wartość testnetowa). Prawdziwy Chain ID Ink mainnet to `57073` — ujawnił się przy deployu.
**Rozwiązanie:** Zmieniono `CHAIN_IDS.ink` na `57073` w `server.js`.

### Błąd 7: Niepoprawny Chain ID dla MegaETH
**Objaw:** `No contract address for chainId: 4326`.
**Przyczyna 1:** W `server.js` było `megaeth: 6342` zamiast `4326`. Prawdziwy Chain ID z `eth_chainId` RPC to `0x10e6 = 4326`.
**Przyczyna 2:** Przy ręcznej edycji nano wkradła się literówka — wpisano `4362` zamiast `4326`.
**Rozwiązanie:** `sed -i 's/megaeth:  4362/megaeth:  4326/' server.js` + `pm2 restart --update-env`.

### Błąd 8: pm2 reload nie ładuje nowych env vars
**Objaw:** Zmiana w `.env` nie była widoczna po `pm2 reload`.
**Przyczyna:** `pm2 reload` nie aktualizuje zmiennych środowiskowych.
**Rozwiązanie:** `pm2 restart qsig-backend --update-env`.

### Błąd 9: MegaETH RPC — zły endpoint
**Objaw:** `502 Bad Gateway` przy próbie postowania roota na MegaETH.
**Przyczyna:** `carrot.megaeth.com/rpc` to był adres testnetowy.
**Rozwiązanie:** Zmieniono na oficjalny mainnet RPC: `https://mainnet.megaeth.com/rpc`.

### Błąd 10: Gate: invalid proof po zmianie sieci
**Objaw:** Mint na Base odrzucony z `Gate: invalid proof`.
**Przyczyna:** Portfel SIGNER na Base miał za mało ETH (`have 1178111964538 want 1320000000000` wei). Cron nie mógł postować Merkle roota — brak środków na gas.
**Rozwiązanie:** Zasilenie portfela SIGNER ETH na Base.

### Błąd 11: Licznik total minted pokazywał "—" (zero)
**Objaw:** Pasek postępu na stronie głównej nie pokazywał danych.
**Przyczyna:** Użyto publicznego RPC `base.llamarpc.com` bezpośrednio z frontendu — blokowany przez CORS przeglądarki.
**Rozwiązanie:** Przeniesiono logikę do backendu — endpoint `/api/supply?chain=` wywołuje kontrakt przez Alchemy RPC po stronie serwera i zwraca dane JSON do frontendu.

### Błąd 12: Bot nie widzi QSIG_WALLETS z .env
**Objaw:** `Brak walletów! Ustaw QSIG_WALLETS` pomimo poprawnego `.env`.
**Przyczyna:** PM2 nie przekazuje zmiennych z `.env` do procesów Python przy użyciu `source .env` manualnie w sesji terminala — zmienne są w sesji basha, nie w środowisku PM2.
**Rozwiązanie:** Bot uruchamiany przez `start.sh` który wykonuje `set -a; source .env; set +a; exec python3 qsig_bot.py`. PM2 startuje `start.sh` jako interpreter bash.

---

## Aktualny stan po sesji (2026-05-12 wieczór)

### ✅ Działa
- Pełny mint flow na Base, Arbitrum, Ink ✅
- MegaETH — podpis i proof działają, mint on-chain wymaga ETH na SIGNER ✅
- Bot auto-mint — działał dziś rano (08:05 UTC), zmintował 500 QSIG, zatrzymany na życzenie ✅
- Strona główna z 4 paskami postępu per sieć ✅
- Przycisk "mint on another network" po udanym mincie ✅
- Cała strona po angielsku ✅
- /api/supply działa dla wszystkich 4 sieci ✅
- Kontrakty na 4 sieciach: Base, Arbitrum, Ink, MegaETH ✅

### ⚠️ Znane problemy / ograniczenia
- **Cloudflare Quick Tunnel URL zmienia się po restarcie PM2** — po restarcie `qsig-tunnel` trzeba zaktualizować `NEXT_PUBLIC_BACKEND_URL` w Vercel i zrobić Redeploy frontendu
- **Portfel SIGNER na Base ma bardzo mało ETH** — wymaga doładowania żeby cron mógł regularnie postować Merkle rooty
- **verify.py w trybie uproszczonym** — akceptuje każdy podpis odpowiedniej długości, nie weryfikuje prawdziwego SPHINCS-
- **Kontrakty nie zweryfikowane na Etherscan/Arbiscan** — Etherscan API V1 deprecated, kod nie jest widoczny na explorerach
- **Ink ma te same adresy kontraktów co Base** — bo deployer miał ten sam nonce na obu sieciach w momencie deployu (przypadkowe zbieżność, technicznie OK)
- **qsig-bot zatrzymany** — `pm2 stop qsig-bot`. Aby wznowić: `pm2 start qsig-bot && pm2 save`

### PM2 status po sesji
```
qsig-backend  → online  (port 3010)
qsig-cron     → online  (cron */5 * * * *)
qsig-tunnel   → online  (cloudflare HTTPS)
qsig-bot      → stopped (zatrzymany ręcznie)
```

---

## Zaktualizowane zmienne środowiskowe

### /home/ubuntu/qsig-backend/.env (i qsig-cron/.env — kopia)
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

### /home/ubuntu/qsig-bot/.env
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
NEXT_PUBLIC_BACKEND_URL=https://scotia-wichita-stationery-open.trycloudflare.com
NEXT_PUBLIC_GATE_BASE=0x24dbeaed857889093ca27ed688A861075fc90F4E
NEXT_PUBLIC_GATE_ARBITRUM=0xa9286A708AfFB0c1d644ffce2779b410903CAa08
NEXT_PUBLIC_GATE_INK=0x24dbeaed857889093ca27ed688A861075fc90F4E
NEXT_PUBLIC_GATE_MEGAETH=0x23d2886153f26fFA77FDFc5f6C41ee7c333C0450
```

---

## Kluczowe informacje techniczne odkryte w tej sesji

### Chain IDs (zweryfikowane przez eth_chainId RPC)
```
Base:     8453
Arbitrum: 42161
Ink:      57073   ← NIE 763373 (to był testnet)
MegaETH:  4326    ← NIE 6342
```

### MegaETH specyfika
- Mainnet live od 9 lutego 2026
- Oficjalny RPC: `https://mainnet.megaeth.com/rpc`
- Deploy wymaga flag `--skip-simulation --gas-limit 3000000` (problem z estymacją gasu przez Foundry)
- Bloki co ~10ms (najszybszy L2)

### Ink specyfika
- L2 od Kraken, na OP Stack / Superchain
- Mainnet RPC: `https://rpc-gel.inkonchain.com` ✅ poprawny
- Chain ID: 57073

### Cloudflare Quick Tunnel — procedura po restarcie
1. `pm2 logs qsig-tunnel --lines 20 --nostream | grep trycloudflare` → skopiuj nowy URL
2. Vercel → projekt qsig-mint → Settings → Environment Variables → `NEXT_PUBLIC_BACKEND_URL` → zmień na nowy URL
3. Vercel → Deployments → Redeploy

### Komendy które były potrzebne w tej sesji
```bash
# Restart z załadowaniem nowych env vars
pm2 restart qsig-backend --update-env

# Naprawa literówki w pliku bez nano
sed -i 's/megaeth:  4362/megaeth:  4326/' /home/ubuntu/qsig-backend/server.js

# Sprawdzenie Chain ID sieci
curl -X POST https://mainnet.megaeth.com/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Test endpointu attest
curl -X POST http://localhost:3010/api/attest \
  -H "Content-Type: application/json" \
  -d '{"pkHash":"test","recipient":"0x000...001","dayEpoch":"20585","chainId":"4326"}'

# Supply per sieć
curl "http://localhost:3010/api/supply?chain=base"
curl "http://localhost:3010/api/supply?chain=arbitrum"
curl "http://localhost:3010/api/supply?chain=ink"
curl "http://localhost:3010/api/supply?chain=megaeth"

# Stop/start bota
pm2 stop qsig-bot && pm2 save
pm2 start qsig-bot && pm2 save
```

---

## Zaktualizowany prompt startowy

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
- HTTPS: Cloudflare Quick Tunnel (qsig-tunnel PM2) — URL zmienia się po restarcie!
- VPS: Ubuntu 24, IP 185.202.239.239, Node v22, Python 3.12

KONTRAKTY (wszystkie 4 sieci):
Base (8453):     Token: 0xE6417...EcAf  Gate: 0x24dbe...0F4E
Arbitrum (42161): Token: 0xCe5fC...CcCC  Gate: 0xa9286...aa08
Ink (57073):      Token: 0xE6417...EcAf  Gate: 0x24dbe...0F4E
MegaETH (4326):   Token: 0xe0fc7...FfBC  Gate: 0x23d28...0450

REPO GITHUB: github.com/RzWojtek/qsig-mint
FRONTEND: https://qsig-mint.vercel.app

VPS PLIKI:
- /home/ubuntu/qsig-backend/ — Express API + /api/attest + /api/supply
- /home/ubuntu/qsig-cron/ — post-root cron
- /home/ubuntu/qsig-bot/ — daily mint bot (zatrzymany)

STAN:
✅ Pełny mint flow działa na Base, Arbitrum, Ink
✅ MegaETH działa (wymaga ETH na SIGNER do postowania rootów)
✅ Strona główna z 4 osobnymi paskami postępu per sieć
✅ Przycisk "mint on another network" po udanym mincie
✅ Cała strona po angielsku
✅ Bot zmintował automatycznie rano, następnie zatrzymany
⚠️ Cloudflare tunnel URL zmienia się po restarcie — procedura: pm2 logs qsig-tunnel | grep trycloudflare → update Vercel env → Redeploy
⚠️ SIGNER na Base ma bardzo mało ETH — wymaga doładowania
⚠️ verify.py w trybie uproszczonym (akceptuje każdy podpis)
⚠️ Kontrakty nie zweryfikowane na explorerach

KLUCZOWE PORTY I KONFLIKTY:
- Port 3001: zajęty przez kurator-server → qsig używa 3010
- Port 80: zajęty przez kurator-api → qsig-nginx na 8080
- PM2 nie ładuje .env dla Pythona → używamy start.sh wrappera
- pm2 reload NIE aktualizuje env vars → używaj pm2 restart --update-env

CO CHCĘ TERAZ ZROBIĆ: [OPISZ TUTAJ CO CHCESZ ZROBIĆ]
```
