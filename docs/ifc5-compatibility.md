# IfcX als IFC5-extensie

## Uitgangspunt

**IfcX IS een IFC5-extensie.** Elk geldig IFC5-bestand is automatisch een geldig
IfcX-bestand. IfcX voegt alleen namespaces toe voor functionaliteit die IFC5
niet biedt: 2D tekeningen, maatvoering, arceringen, bladindelingen, en
SVG/CSS-compatibele styling.

## Relatie tot IFC5

```
┌─────────────────────────────────────────────────────┐
│                    IfcX (.ifcx)                     │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │              IFC5 (buildingSMART)              │  │
│  │                                               │  │
│  │  bsi::ifc::*      IFC classificatie/props     │  │
│  │  usd::*           USD geometrie/transforms    │  │
│  │  nlsfb::*         NL-SfB classificatie        │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  IfcX extensies (ifcx::* namespaces):               │
│                                                     │
│  ifcx::geom::*       2D geometrie (lijn, boog, ...) │
│  ifcx::annotation::* Maatvoering, tekst, leaders    │
│  ifcx::sheet::*      Bladindeling, viewports        │
│  ifcx::hatch::*      Arceringen (NEN47, SVG)        │
│  ifcx::style::*      Lijnstijlen, vulstijlen        │
│  ifcx::svg::*        SVG/CSS properties (Bonsai)    │
│  ifcx::layer::*      Lagen / layer assignments      │
│  ifcx::component::*  Blokken / herbruikbare defs    │
│  ifcx::image::*      Rasterafbeeldingen              │
│  ifcx::geo::*        GIS / CRS (EPSG, GeoJSON)      │
│  ifcx::connects::*   Verbindingen tussen nodes       │
│  ifcx::view::*       Tekenweergaven                  │
│  ifcx::purpose        drawing / model / annotation   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Wat IFC5 biedt (en wij hergebruiken)

| IFC5 Namespace | Functie | IfcX Gebruik |
|----------------|---------|--------------|
| `bsi::ifc::class` | BIM classificatie (IfcWall, IfcDoor, ...) | Model nodes (`purpose: "model"`) |
| `bsi::ifc::material` | Materiaal toewijzing | Model nodes + hatch koppeling |
| `bsi::ifc::prop::*` | BIM eigenschappen (hoogte, breedte, ...) | Model nodes |
| `bsi::ifc::guid` | IFC GlobalId | Round-trip naar IFC4x3 STEP |
| `usd::usdgeom::mesh` | 3D mesh geometrie | Model nodes (3D objecten) |
| `usd::xformop` | 4x4 transformatie matrix | Alle nodes met plaatsing |
| `usd::usdgeom::visibility` | Zichtbaarheid | Alle nodes |
| `usd::usdgeom::basiscurves` | Alignement-curves | Infra-objecten |

## Wat IfcX toevoegt (en IFC5 niet heeft)

### ifcx::geom::* — 2D Geometrie

IFC5 gebruikt USD meshes voor 3D. Voor 2D tekeningen zijn parametrische
curves nodig (niet getrianguleerd):

| Attribuut | IFC Equivalent | Beschrijving |
|-----------|----------------|--------------|
| `ifcx::geom::line` | IfcLine | Lijnsegment (2 punten) |
| `ifcx::geom::polyline` | IfcPolyline | Polylijn (N punten) |
| `ifcx::geom::compositeCurve` | IfcCompositeCurve | Lijn+boog segmenten |
| `ifcx::geom::circle` | IfcCircle | Volledige cirkel |
| `ifcx::geom::trimmedCurve` | IfcTrimmedCurve | Boog (getrimde curve) |
| `ifcx::geom::ellipse` | IfcEllipse | Ellips |
| `ifcx::geom::bspline` | IfcBSplineCurveWithKnots | NURBS/B-spline curve |
| `ifcx::geom::indexedPolyCurve` | IfcIndexedPolyCurve | Geindexeerde polycurve |
| `ifcx::geom::point` | IfcCartesianPoint | Punt |
| `ifcx::geom::mesh` | (usd::usdgeom::mesh) | 3D mesh (alias) |
| `ifcx::geom::solid` | — | ACIS/BRep solid data |

### ifcx::annotation::* — Annotatie

IFC4 verwijderde alle dimensie-entiteiten. IFC5 heeft ze niet teruggebracht.
IfcX voegt ze toe:

| Attribuut | DXF Equivalent | Beschrijving |
|-----------|----------------|--------------|
| `ifcx::annotation::text` | TEXT/MTEXT | Tekst annotatie |
| `ifcx::annotation::richText` | MTEXT formatting | Opgemaakte tekst |
| `ifcx::annotation::dimension` | DIMENSION | Maatvoering (alle types) |
| `ifcx::annotation::leader` | LEADER/MULTILEADER | Verwijslijn |
| `ifcx::annotation::tolerance` | TOLERANCE | GD&T tolerantie |
| `ifcx::annotation::table` | TABLE | Tabel |
| `ifcx::annotation::tag` | — | Element tag (INB/Bonsai) |
| `ifcx::annotation::symbol` | — | Symbool plaatsing |

### ifcx::sheet::* — Bladindeling

IFC heeft geen concept van papierruimte. IfcX voegt het toe:

| Attribuut | DXF Equivalent | Beschrijving |
|-----------|----------------|--------------|
| `ifcx::sheet::paper` | LAYOUT | Papierformaat + marges |
| `ifcx::sheet::viewport` | VIEWPORT | Venster naar model/tekening |
| `ifcx::sheet::titleBlock` | INSERT (titelblok) | Titelblok referentie |
| `ifcx::sheet::viewTitle` | — | Weergavetitel |
| `ifcx::sheet::plotSettings` | PLOTSETTINGS | Printconfiguratie |

### ifcx::hatch::* — Arcering

IFC heeft basale arcering (IfcFillAreaStyleHatching). IfcX breidt dit uit:

| Attribuut | Beschrijving |
|-----------|--------------|
| `ifcx::hatch::pattern` | Custom lijnpatroon |
| `ifcx::hatch::solid` | Effen kleurvulling |
| `ifcx::hatch::gradient` | Kleurverloop |
| `ifcx::hatch::svg` | SVG pattern referentie |
| `ifcx::hatch::nen47` | NEN 47 materiaalarceringen (NL standaard) |
| `ifcx::hatch::boundary` | Arceringsgrenzen |

### ifcx::svg::* — SVG/CSS Styling (Bonsai/INB)

Voor compatibiliteit met Bonsai (BlenderBIM) en het INB-template:

| Attribuut | CSS/SVG Property |
|-----------|------------------|
| `ifcx::svg::class` | CSS class (bijv. "cut IfcWall material-beton") |
| `ifcx::svg::stroke` | SVG stroke kleur |
| `ifcx::svg::strokeWidth` | SVG lijndikte |
| `ifcx::svg::fill` | SVG vulkleur/patroon |
| `ifcx::svg::fillRule` | SVG fill rule (evenodd/nonzero) |
| `ifcx::svg::fontFamily` | CSS font-family |
| `ifcx::svg::fontSize` | CSS font-size |
| `ifcx::svg::markerEnd` | SVG eindmarker (pijlen) |

### ifcx::geo::* — GIS / Coördinaatsysteem

IFC5 heeft geen expliciete CRS-ondersteuning. IfcX voegt het toe:

| Attribuut | Beschrijving |
|-----------|--------------|
| `ifcx::geo::crs` | EPSG code + WKT definitie |
| `ifcx::geo::position` | Geografische positie (lat/lon/alt) |
| `ifcx::geo::feature` | GeoJSON-compatibele geometrie |
| `ifcx::geo::mapConversion` | Conversie lokaal <-> CRS (zoals IfcMapConversion) |

## Imports in een IfcX Bestand

Een IfcX-bestand importeert de officiële IFC5-schemas:

```json
{
  "header": {
    "ifcxVersion": "2.0",
    "id": "project-uuid"
  },
  "imports": [
    {"uri": "https://ifcx.dev/@standards.buildingsmart.org/ifc/core/ifc@v5a.ifcx"},
    {"uri": "https://ifcx.dev/@standards.buildingsmart.org/ifc/core/prop@v5a.ifcx"},
    {"uri": "https://ifcx.dev/@openusd.org/usd@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/geom@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/annotation@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/sheet@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/hatch@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/svg@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/geo@v1.ifcx"}
  ],
  "data": [...]
}
```

De eerste drie imports zijn **standaard IFC5**. De laatste zes zijn **IfcX-extensies**.
Een IFC5-viewer die de IfcX-extensies niet kent, negeert ze simpelweg en toont
alleen de standaard IFC-data.

## Compatibiliteitsregels

1. **Een geldig IFC5-bestand is altijd een geldig IfcX-bestand.** Geen uitzonderingen.

2. **Een IfcX-bestand met alleen bsi:: en usd:: attributen is een geldig IFC5-bestand.**
   De ifcx:: namespaces zijn optioneel.

3. **IFC5-tools negeren onbekende namespaces.** Dit is by design in IFC5. Een IFC5-viewer
   die ifcx::geom::line niet kent, slaat het over. Dit is veilig.

4. **IfcX-tools MOETEN de IFC5-namespaces ondersteunen.** Als een node `bsi::ifc::class`
   heeft, moet een IfcX-tool dat correct interpreteren.

5. **De purpose-scheiding is een IfcX-conventie, geen IFC5-vereiste.** IFC5 heeft geen
   concept van "drawing vs model". IfcX voegt dit toe als best practice.

## Migratiepaden

| Van | Naar | Hoe |
|-----|------|-----|
| IFC4x3 STEP | IfcX | Converteer STEP -> JSON, map IfcRel* naar children/inherits |
| IFC5 | IfcX | Voeg ifcx::* attributen toe aan bestaande nodes |
| IfcX | IFC5 | Strip ifcx::* attributen, behoud bsi:: en usd:: |
| DWG/DXF | IfcX | Parser maakt nodes met purpose:"drawing" + ifcx::geom::* |
| IfcX | DWG/DXF | Exporteer ifcx::geom::* als DXF entities |
| Bonsai SVG | IfcX | Map SVG elementen naar ifcx::geom + ifcx::svg::class |
| IfcX | Bonsai SVG | Genereer SVG met ifcx::svg::* als CSS classes |
