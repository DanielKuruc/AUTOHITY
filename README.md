# AUTOHITY — Výkup

Aplikace pro evidenci výkupu vozidel. Výkupčí v ní zakládá nové výkupy přímo
v terénu — načte VIN, vyfotí vůz, zaznamená stav součástí a tloušťky laku —
a sleduje, jak se obchod posouvá od prvního kontaktu až po vykoupení.

Běží na iOSu, Androidu i ve webovém prohlížeči ze společné kódové základny.

## Co aplikace umí

- **Výkupy** — seznam s fotkami, filtry a fulltextovým vyhledáváním; detail
  vozidla s údaji z registru, stavem součástí a měřením tloušťky laku
- **Načtení VIN** — z fotky pomocí rozpoznávání textu přímo na zařízení,
  s dohledáním údajů o vozidle a doplněním firemních dat z ARESu podle IČO
- **Statistiky a reporty** — přehledy za období, po výkupčích a dodavatelích,
  s exportem do PDF
- **Notifikace** — push o novém výkupu a o změně stavu; klepnutí otevře
  konkrétní vozidlo
- **Správa číselníků** — značky a modely vozidel (jen pro administrátory)

## Technologie

| | |
|---|---|
| Expo SDK | 57 |
| React Native | 0.86 (React 19) |
| Navigace | expo-router (file-based, typed routes) |
| Stav a data | Zustand, TanStack Query |
| Jazyk | TypeScript |
| Backend | PHP + MySQL (složka `php-api/`) |

## Struktura

```
app/              obrazovky a routy
  (tabs)/         Výkupy, Statistiky, Notifikace, Reporty, Profil
  purchase/       detail a editace výkupu
  new-purchase/   průvodce založením
  admin/          číselník značek a modelů
components/       sdílené komponenty
contexts/         Auth, Theme, Purchases, Notifications, Toast, Users
services/         volání API, export do PDF, push notifikace
hooks/  utils/  constants/
assets/           obrázky a fonty
php-api/          REST API a databázové schéma
```

## Spuštění

Potřebujete Node.js a npm.

```bash
npm install
npm start          # vývojový server, pak `i` pro iOS, `a` pro Android
npm run web        # rovnou ve webovém prohlížeči
```

Pro běh na telefonu je kvůli nativním modulům (fotoaparát, push notifikace)
potřeba development build, ne Expo Go.

Další skripty:

```bash
npm run typecheck  # kontrola typů
npm run lint
```

## Konfigurace

Proměnné prostředí se načítají ze souboru `.env` v kořeni projektu. Ten do
repozitáře nepatří — každý si ho drží lokálně, na hostingu se hodnoty zadávají
v nastavení projektu.

| Proměnná | K čemu |
|---|---|
| `EXPO_PUBLIC_VEHICLE_DATA_API_KEY` | dohledání údajů o vozidle podle VIN |
| `EXPO_PUBLIC_BASE44_API_KEY` | katalog vozidel nabízených na protiúčet |
| `EXPO_PUBLIC_DEMO_USERNAME`, `EXPO_PUBLIC_DEMO_PASSWORD` | demo přihlášení bez volání na server |
| `EXPO_PUBLIC_PHP_API_BASE` | jiná adresa API než výchozí `https://autohity.cz` |
| `EXPO_PUBLIC_AUTH_PROXY_URL` | jiná adresa přihlašovací proxy |

Vše s předponou `EXPO_PUBLIC_` se zapéká do aplikačního balíčku a je z něj
čitelné — nepatří sem nic, co má zůstat tajné.

## Backend

REST API ve složce `php-api/` běží na `autohity.cz` a nasazuje se ručně
nahráním souborů. Přihlašování obstarává samostatný server `app.autohity.cz`.

Ten neposílá hlavičky CORS, takže webová verze na něj nemůže volat přímo —
požadavky proto vede přes `php-api/auth-proxy.php`, který je přeposílá a
hlavičky doplní. Nativní aplikace volá přihlašovací server napřímo.

Pro vývoj webu bez nasazené proxy:

```bash
npm run auth-proxy        # lokální PHP proxy na portu 8099
npm run web:local-auth    # web nasměrovaný na ni
```

## Build webu

```bash
npx expo export --platform web
```

Výsledné statické soubory ve složce `dist/` stačí nahrát na libovolný hosting.

## Poznámky k rozhraní

Na tabletu a v prohlížeči se rozhraní přepíná do širokého rozvržení s postranním
panelem a mřížkou výkupů; na telefonu se používají spodní záložky. Hranicí je
šířka okna, takže na webu se rozvržení mění spolu s velikostí okna.
