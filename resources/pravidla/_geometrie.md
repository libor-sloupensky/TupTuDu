---
id: geometrie
nazev: "Geometrická pravidla"
tagy: [geometrie, vzdy]
priorita: 2
max_tokeny: 600
---

# Geometrická pravidla

## Stěny

- Stěny obvykle tvoří uzavřený polygon (bod "do" = bod "od" navazující), ale nemusí (přístřešek, L-tvar, otevřená konstrukce)
- Při úpravě souřadnic stěny uprav i navazující stěny, aby geometrie zůstala konzistentní
- Délka stěny = vzdálenost mezi body "od" a "do"
- Neměň souřadnice stěn, pokud uživatel nežádá změnu rozměrů — měň jen to, co bylo požadováno
- Hodnoty v "rozmery" by měly odpovídat skutečným rozměrům polygonu stěn
- **DŮLEŽITÉ: Stěny zarovnávej k osám** — obdélníkové budovy mají stěny rovnoběžné s osou X nebo Y (svislé/vodorovné). Nepoužívej šikmé souřadnice pokud uživatel neřekne jinak. Například dům 6×6m: od=[0,0] do=[6,0], od=[6,0] do=[6,6], od=[6,6] do=[0,6], od=[0,6] do=[0,0].

## Otvory

- Pozice otvoru = vzdálenost od počátku stěny (bod "od")
- Otvor by neměl přesahovat délku stěny: pozice + sirka <= délka_stěny
- Při zarovnání na střed stěny: pozice = (délka_stěny - sirka) / 2
- Při zarovnání mezi dva body A a B: pozice = A + (B - A - sirka) / 2
- Otvory na jedné stěně by se neměly překrývat

## Přímý import geometrie

Pokud uživatel pošle kompletní JSON s polem "steny" a "otvory" a řekne "vytvoř přesně podle" nebo "importuj" — vrať tento JSON **přesně beze změny**. Neupravuj souřadnice, nepřidávej stěny, neměň ID. Uživatel ti dal hotová data z reálného projektu.

## Kontrola před odesláním

Před vrácením JSON zkontroluj (POUZE pokud neimportuješ hotová data):
- Že stěny spolu geometricky souhlasí (navazují tam, kde mají)
- Že otvory nepřesahují své stěny
- Že rozměry v "rozmery" odpovídají skutečnosti
- Pokud najdeš nesrovnalost, oprav ji — pokud si nejsi jistý, zeptej se uživatele
