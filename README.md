# WoodSetup

Webová aplikace pro **DIY návrh dřevěných a kovových konstrukcí ve 3D**. Modeluješ z reálných hraníků, prken, latí, kovových jeklů a hliníkových profilů, lepíš je úhelníky, plotnami, botkami nebo vruty, a ve chvíli, kdy je hotovo, vypadne ti rozpis materiálu a IKEA-style návod na stavbu.

> ⚠️ **Nekomerční použití.** Projekt je licencován pod [PolyForm Noncommercial License 1.0.0](./LICENSE). Smíš s ním zdarma stavět cokoliv pro vlastní (i občanské) potřeby, ale **nesmíš ho komerčně využívat ani prodávat jako součást placeného produktu / služby**. Detaily viz [LICENSE](./LICENSE) a sekci [Licence](#licence) níže.

---

## Co umí

### Modelování
- 3D scéna se zemí definovanou **čtyřmi rohy** (libovolný čtyřúhelník, presety) a vlastním rastrem.
- Katalog **profilů**: hranoly, prkna, latě, fošny, OSB / překližka / MDF, kovové jekly, trubky, L/U profily a kompletní řada hliníkových profilů (jekl, T-drážka, trubky, L/U).
- Katalog **spojek**: vruty, hřebíky, závitové tyče, dřevěné čepy, hmoždinky a chemické kotvy, úhelníky (i vyztužené), plotny, trámové botky, patní kotvy, krokvové / pásové / T spony, vazníkové desky.
- Manipulace pomocí 3D gizma (`G` posun, `R` rotace) s rastrem a snapem rotace (15° / 45° / 90°). Výchozí 45° drží prvky osově zarovnané.

### Snapping a chytrá montáž
- **Magnet ⌖** přilepí prvek k nejbližšímu sousedovi (doraz / překrytí).
- **Spojky se samy zorientují podle svého tvaru** – plotny / úhelníky / spony / vazníkové desky dosednou plochou, botky a patky se posadí na čelo prvku.
- **Šroubování ✱** – vybereš vrut a klikneš na předvrtanou díru kovové spojky **nebo přímo do dřevěné plochy**. Vrut se sám natočí podle normály a varuje, pokud by vylezl ven, případně nabídne kratší typ z katalogu.
- **Přichycení bod k bodu** – vybereš zdrojový roh / hranu prvku a klikneš na cílový bod (jiný prvek, díru, plochu).
- **Pivot otáčení** – pivot ve středu nebo na libovolné hraně / rohu, prvek se otočí kolem zvolené kotvy.
- **Skupina ⛓** – sešroubované prvky se hýbou jako jeden rigid objekt (Ctrl+Z to vrátí v jednom kroku).
- **Varování o zanoření pod plochu** – nabízí prvek automaticky položit na povrch.

### Klonování a úpravy
- Pole klonování s počtem kusů, osou a odstupem.
- Tlačítko *Odstranit šrouby ze spoje / z prvku* hromadně smaže všechny vruty / hřebíky připojené k vybranému prvku nebo spojce.

### Výstupy
- **Cut list** – rozpis materiálu k nařezání včetně součtů podle materiálu (dřevo / kov / hliník).
- **Ukládání projektů** do `localStorage`, **export / import JSON**.
- **Export PNG** – snímek 3D scény.
- **Export STL** – binární (Shift+klik = ASCII), připravený pro CAD / slicer / 3D tisk.
- **Export návodu (PNG)** – IKEA-style „papírový" návod s rozpisem materiálu, soupisem spojek a postupem montáže krok-po-kroku s vyrenderovanými náhledy. Nový díl v každém kroku se podbarví červeným obrysem.

---

## Spuštění

Potřebuješ Node 18+.

```bash
npm install
npm run dev
```

Aplikace běží na <http://localhost:5173>.

### Produkční build

```bash
npm run build
npm run preview
```

---

## Klávesové zkratky

| Zkratka                 | Akce                                             |
| ----------------------- | ------------------------------------------------ |
| `G`                     | Režim posunu (translate)                         |
| `R`                     | Režim rotace                                     |
| `M`                     | Zapnout / vypnout magnet                         |
| `L`                     | Zapnout / vypnout skupinu (rigid link)           |
| `Del` / `Backspace`     | Smazat vybraný prvek                             |
| `Ctrl/⌘ + D`            | Duplikovat vybraný prvek                         |
| `Ctrl/⌘ + Z`            | Zpět                                             |
| `Ctrl/⌘ + Shift + Z`    | Vpřed                                            |
| `Ctrl/⌘ + S`            | Uložit projekt                                   |
| `Esc`                   | Zrušit výběr / přichycení / šroubování           |

---

## Struktura

- `src/scene/` – 3D komponenty (`Scene`, `Ground`, `WoodPiece`, `Joint`, `TransformGizmo`, `HoleMarker`, `PivotMarker`).
- `src/ui/` – UI panely (`Toolbar`, `CatalogPanel`, `PropertiesPanel`, `CutList`, `SceneSettings`, varovné bannery).
- `src/store/designStore.ts` – Zustand store s undo / redo historií a všemi akcemi.
- `src/data/` – katalog profilů (`lumber.ts`), spojek (`joints.ts`) a děr (`holes.ts`).
- `src/utils/` – geometrie, snap, anchor, kontroly průniku vrutů, persistence, export STL / PNG / JSON / IKEA návodu.

---

## Použité knihovny a nástroje (third-party)

Aplikace je postavená na open-source knihovnách. Každá z nich má svou vlastní licenci (uvedeno za odkazem), kterou je při použití WoodSetupu nutné dodržet.

### Runtime dependencies

| Knihovna                                                                | Použití                                       | Licence              |
| ----------------------------------------------------------------------- | --------------------------------------------- | -------------------- |
| [React](https://react.dev/)                                             | UI framework                                  | MIT                  |
| [React DOM](https://www.npmjs.com/package/react-dom)                    | Render Reactu do DOMu                         | MIT                  |
| [Three.js](https://threejs.org/)                                        | WebGL 3D engine + `STLExporter`               | MIT                  |
| [@react-three/fiber](https://github.com/pmndrs/react-three-fiber)       | React renderer pro Three.js                   | MIT                  |
| [@react-three/drei](https://github.com/pmndrs/drei)                     | Pomocné komponenty (`OrbitControls`, `TransformControls`, `Grid`, `Environment`, `Html`, `GizmoHelper`…) | MIT |
| [Zustand](https://github.com/pmndrs/zustand)                            | Stavový kontejner s undo / redo               | MIT                  |
| [uuid](https://github.com/uuidjs/uuid)                                  | Generování ID pro prvky a spojky              | MIT                  |

### Dev dependencies

| Knihovna                                                                | Použití                                       | Licence              |
| ----------------------------------------------------------------------- | --------------------------------------------- | -------------------- |
| [Vite](https://vitejs.dev/)                                             | Dev server + bundler                          | MIT                  |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)     | React plugin pro Vite                         | MIT                  |
| [TypeScript](https://www.typescriptlang.org/)                           | Statické typování                             | Apache-2.0           |
| [Tailwind CSS](https://tailwindcss.com/)                                | Utility-first CSS                             | MIT                  |
| [PostCSS](https://postcss.org/)                                         | CSS pipeline                                  | MIT                  |
| [Autoprefixer](https://github.com/postcss/autoprefixer)                 | Vendor prefixy                                | MIT                  |
| [@types/react](https://www.npmjs.com/package/@types/react), [@types/react-dom](https://www.npmjs.com/package/@types/react-dom), [@types/three](https://www.npmjs.com/package/@types/three), [@types/uuid](https://www.npmjs.com/package/@types/uuid) | TypeScript typy | MIT |

Aktuální verze a kompletní strom závislostí najdeš v [`package.json`](./package.json) a [`package-lock.json`](./package-lock.json).

Licence všech zmíněných knihoven jsou kompatibilní s nekomerčním použitím WoodSetupu – stačí ponechat copyright notice z `node_modules/*/LICENSE`. WoodSetup samotný však **rozšiřuje omezení o zákaz komerčního využití** (viz níže).

---

## Licence

Tento kód je distribuován pod **[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/)** – viz soubor [`LICENSE`](./LICENSE).

Stručně řečeno:
- ✅ **Smíš** ho stáhnout, používat, upravovat a sdílet pro **nekomerční účely** (osobní projekty, výuka, výzkum, neziskové komunitní stavby).
- ✅ **Smíš** výsledné konstrukce postavit a používat – výstupy z aplikace (návrh, cut list, STL, návod) **patří tobě** a nejsou licencí omezené.
- ❌ **Nesmíš** WoodSetup ani jeho fork používat jako součást placeného produktu, služby, předplatného, ani z něho generovat příjem.
- ❌ **Nesmíš** ho přebalit a prodávat.

Pokud bys měl zájem o **komerční licenci**, kontaktuj autora.

Použité open-source knihovny (Three.js, React, Zustand, Vite, Tailwind, …) si zachovávají své vlastní MIT / Apache-2.0 licence; ty mají s nekomerčností WoodSetupu nic společného a smíš je dál používat jakkoli povolí jejich licence – jen kompletní zabalený WoodSetup spadá pod PolyForm Noncommercial.

---

## Poznámka k autorovi

Aplikace vznikla jako rychlý DIY nástroj. Pokud najdeš bug nebo si tě napadne další funkce, neváhej založit issue nebo pull request – ale prosím respektuj nekomerční licenci.
