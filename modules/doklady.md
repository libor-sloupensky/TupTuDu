# Modul: Doklady

## Co modul dělá
Účetní agenda převzatá z projektu office: nahrávání dokladů, rozpoznávání AI,
správa firem a klientů, příjem dokladů e-mailem, sync na Google Drive
a mobilní skener.

## Aktuální stav
✅ **Běží na produkci** — přehled dokladů i nastavení firmy fungují,
data z office naimportovaná (4 firmy, 147 dokladů, 342 položek, 100 dodavatelů).

## Architektura

Modul je záměrně oddělený od plánovací části aplikace:

| Vrstva | Umístění |
|--------|----------|
| Tabulky | prefix `office_` |
| Modely | `App\Models\Office\*` |
| Služby | `App\Services\Office\*` (AI zpracování, S3, Drive) |
| Controllery | `App\Http\Controllers\Office\*` |
| Routy | `routes/office.php`, prefix `/doklady`, jména `office.*` |
| Views | `resources/views/office/*` |
| Middleware | `office.firma`, `office.role` |

**Firmy si modul nese vlastní** (`office_firmy`, PK = IČO) — se `subjekty`
plánovací části zatím nijak nesouvisí. Jediná vazba ven vede přes
`office_user_firma.user_id` → `uzivatele.id`, zpřístupněná traitem
`App\Models\Office\MaPristupKFirmam` v modelu `Uzivatel`.

Aktivní firma se drží v session pod `office_firma_ico`, odděleně od
`aktivni_subjekt_id`.

## Role ve firmě

Dvě nezávislé osy:

- **`role`** (`firma` / `ucetni` / `dodavatel`) — vztah k firmě. Účetní vidí
  navíc sekci Klienti.
- **`interni_role`** (`superadmin` / `spravce`) — co smí uvnitř firmy.
  **Sekci „Uživatelé firmy" v nastavení vidí jen superadmin.** Správce ji nevidí,
  a to i když u jiné firmy superadmin je — role je per firma.

## E-maily

| Schránka | Role |
|----------|------|
| `info@tuptudu.com` | systémová pošta (secret `MAIL_PASSWORD_INFO`) |
| `doklady@tuptudu.com` | příjem dokladů + odpovědi (secret `MAIL_PASSWORD_DOKLADY`) |

Firmy posílají doklady na `{IČO}@doklady.tuptudu.com`. Tyhle adresy fyzicky
neexistují — schránka `doklady@` je nastavená jako koš a cron je rozřadí podle
příjemce. Doména je v konfiguraci (`DOKLADY_EMAIL_DOMENA`).

## Cron

Hosting umí volat jen URL, ne artisan. Token = `services.cron_token`.

```
/cron/doklady/email/{token}    příjem dokladů ze schránky
/cron/doklady/drive/{token}    sync na Google Drive firem
/cron/doklady/import/{token}   import dat z office (idempotentní)
/cron/doklady/chyby/{token}    výpis posledních chyb (ladění produkce)
```

## Import dat z office

`php artisan doklady:import-z-office` (nebo přes cron URL). Idempotentní —
existující záznamy přepíše, nové doplní. Zdroj: `database/import/office-data.json`.

Před ostrým spuštěním se dá pustit znovu a dotáhnout, co v office mezitím přibylo.

**Nepřenáší se** Google refresh token a hesla k mailům firem — jsou zašifrované
klíčem `APP_KEY` původního projektu.

## Mobilní aplikace

Capacitor obal, WebView na `www.tuptudu.com/mobile/prihlaseni`. APK ke stažení
na `/aplikace`. Podrobnosti v `capacitor.config.json` a `scripts/android-deeplink.mjs`;
build: `npm install && npx cap add android && npm run android:sync`.

Google login v appce jde přes Custom Tab + deep link `cz.tuptudu.office://auth/done`
(Google blokuje OAuth v embedded WebView) — viz `Auth\GoogleController::mobileAuthBridge`.

---

## Co zbývá dodělat

### Modul Doklady
- [ ] **Znovu připojit Google Drive** u firmy, která ho měla — token se přenést nedal
- [ ] **Zapnout cron** u Českého hostingu (URL výše)
- [ ] **Otestovat nahrání dokladu** — projde S3, Claude i DB najednou
- [ ] **Otestovat mobilní appku** proti nové doméně
- [ ] **Dotáhnout data** z office těsně před ostrým spuštěním
- [ ] Přístupy uživatelů, kteří tu ještě nemají účet (viz výpis importu):
      `libor@wormup.com`, `libor@tuptudu.cz`, `strych@tos-stavby.cz`,
      `sloupensky@grig.cz`, `sloupensky@e-kancelar.cz`

### Registrace, přihlášení, e-maily
- [ ] **Registrace neposílá ověřovací e-mail.** V office se posílal
      (`RegisterController` → `OvereniEmailu`), tady registrace mail neodesílá vůbec.
- [ ] **Reset hesla neposílá e-mail.** V office `PasswordResetController` → `ResetHesla`.
      Tady Fortify mail neposílá.
- [ ] **Projít i další podobné případy** — kde se v office něco odesílalo nebo
      notifikovalo a v tuptudu.com to zatím chybí. Kandidáti: ověření změny e-mailu,
      upozornění na žádost o přístup k firmě.

### Sjednocení projektů (další etapa)
- [ ] **Sjednotit identitu** — `office_firmy` (PK = IČO) vs `subjekty` (auto-increment).
      Dnes běží odděleně; cílem je jedna reprezentace firmy.
- [ ] **Přejmenovat zbylé tabulky** podle domluvených prefixů: `plan_` pro plánovací
      část, `core_` pro sdílené (uživatelé, subjekty). Tabulky `office_` už sedí.
- [ ] Sjednotit nastavení a profily uživatelů

---
*Vytvořeno: 2026-08-15*
