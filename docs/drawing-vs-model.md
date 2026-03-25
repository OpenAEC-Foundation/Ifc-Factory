# IfcX: Tekening vs Model - Fundamenteel Onderscheid

## Het Probleem

In de huidige CAD/BIM wereld lopen twee concepten door elkaar:

- **Tekening** (Drawing): "Domme" 2D/3D geometrie. Een lijn is een lijn. Een cirkel
  is een cirkel. Geen semantische betekenis. Dit is wat DWG/DXF opslaat.

- **Model** (Building Information Model): "Slimme" objecten. Een IfcWall weet dat het
  een muur is, kent zijn materiaal, dikte, brandwerendheid. Dit is wat IFC opslaat.

IFC probeert alles als model op te slaan. DWG slaat alles als tekening op.
Geen van beide is compleet.

## De IfcX Oplossing

Elk IfcxNode krijgt een **verplicht** `ifcx::purpose` attribuut dat aangeeft
of het tekendata of modeldata is:

```json
{
  "path": "wall-line-001",
  "attributes": {
    "ifcx::purpose": "drawing",
    "ifcx::geom::line": {"points": [[0,0], [5000,0]]},
    "ifcx::style::curveStyle": {"colour": {"r":0,"g":0,"b":0}, "width": 0.35}
  }
}
```

Dit is een **lijn op een tekening**. Geen muur. Geen BIM-object. Gewoon een streep.

Vergelijk met een model-object:

```json
{
  "path": "wall-model-001",
  "attributes": {
    "ifcx::purpose": "model",
    "bsi::ifc::class": {"code": "IfcWall"},
    "bsi::ifc::prop::Height": 2800,
    "bsi::ifc::material": {"code": "Concrete C30/37"},
    "ifcx::geom::mesh": {"points": [...], "faceVertexIndices": [...]}
  }
}
```

Dit is een **muur in een model**. Het heeft eigenschappen, materiaal, een IFC-klasse.

## De Drie Domeinen

### 1. `"drawing"` - Tekendata

Alles wat je op papier tekent. Geometrie zonder semantische betekenis.

| Wat | Voorbeeld | Herkomst |
|-----|-----------|----------|
| Lijnen, bogen, cirkels | Constructielijnen, detaillijnen | DWG/DXF import |
| Tekst, maatvoering | Afmetingen op de tekening | Handmatig getekend |
| Arceringen | Materiaalarcering in doorsnede | Tekenconventie |
| Blokken / symbolen | Deursymbool, raamkruisje | Symbolenbibliotheek |
| Titelblok | Stempel met projectinfo | Template |
| Rasterafbeeldingen | Foto's, kaarten | Extern bestand |

Kenmerken:
- **Geen IFC-klasse** (`bsi::ifc::class` is afwezig of leeg)
- **Geen BIM-eigenschappen** (geen hoogte, materiaal, brandklasse)
- **Puur visueel** - wat je ziet is wat het is
- **Bewerkbaar als tekening** - verplaatsen, roteren, schalen van lijnen

### 2. `"model"` - BIM Modeldata

Objecten die deel uitmaken van een gebouwmodel.

| Wat | Voorbeeld | Herkomst |
|-----|-----------|----------|
| Muren, vloeren, daken | IfcWall, IfcSlab, IfcRoof | IFC/BIM model |
| Ramen, deuren | IfcWindow, IfcDoor | IFC/BIM model |
| Kolommen, balken | IfcColumn, IfcBeam | IFC/BIM model |
| Ruimtes | IfcSpace | IFC/BIM model |
| Installaties | IfcDistributionElement | MEP model |

Kenmerken:
- **Heeft IFC-klasse** (`bsi::ifc::class: {code: "IfcWall"}`)
- **Heeft BIM-eigenschappen** (materiaal, afmetingen, classificatie)
- **Geometrie is de 3D-vorm** van het object
- **Niet bedoeld om handmatig te bewerken** als lijnen

### 3. `"annotation"` - Annotatie op een model

Tekst, maatvoering en symbolen die **verwijzen naar** modelobjecten
maar er geen deel van uitmaken.

| Wat | Voorbeeld | Herkomst |
|-----|-----------|----------|
| Maatvoering | Afmeting die naar 2 muren verwijst | Bonsai/Revit |
| Ruimtelabels | "Woonkamer 45 m²" | Automatisch uit model |
| Sectieaanduidingen | Snede-aanduiding A-A | Tekenconventie |
| Tags | Elementnummers, materiaaltags | BIM metadata |

Kenmerken:
- **Heeft verwijzingen** naar modelobjecten (`ifcx::annotation::associatedGeometry`)
- **Geen eigen BIM-betekenis** (een maatlijn is geen gebouwelement)
- **Kan automatisch gegenereerd zijn** uit het model (Bonsai doet dit)
- **Wordt getoond op tekeningen** maar leeft niet in het 3D model

## Hoe Dit Werkt in de Praktijk

### DWG/DXF Importeren

Alle entiteiten krijgen `ifcx::purpose: "drawing"`:

```json
[
  {"path": "line-001", "attributes": {
    "ifcx::purpose": "drawing",
    "ifcx::geom::line": {"points": [[0,0],[5000,0]]},
    "ifcx::layer::assignment": {"name": "Walls"}
  }},
  {"path": "dim-001", "attributes": {
    "ifcx::purpose": "drawing",
    "ifcx::annotation::dimension": {"subtype": "linear", "value": 5000, ...}
  }},
  {"path": "hatch-001", "attributes": {
    "ifcx::purpose": "drawing",
    "ifcx::hatch::material": {"standard": "NEN47", "code": "beton", "scale": 50}
  }}
]
```

### IFC Importeren

Gebouwelementen krijgen `ifcx::purpose: "model"`:

```json
[
  {"path": "wall-guid-123", "attributes": {
    "ifcx::purpose": "model",
    "bsi::ifc::class": {"code": "IfcWall"},
    "bsi::ifc::guid": "1abc2def3...",
    "bsi::ifc::prop::Height": 2800,
    "ifcx::geom::mesh": {"points": [...], "faceVertexIndices": [...]}
  }}
]
```

### Bonsai 2D Documentatie

Bonsai genereert tekeningen van een 3D model. Het resultaat bevat beide:

```json
[
  // Het modelobject (ongewijzigd)
  {"path": "wall-guid-123", "attributes": {
    "ifcx::purpose": "model",
    "bsi::ifc::class": {"code": "IfcWall"}
  }},

  // De 2D weergave ervan (gegenereerd door Bonsai)
  {"path": "wall-linework-001", "attributes": {
    "ifcx::purpose": "drawing",
    "ifcx::geom::compositeCurve": {"segments": [...]},
    "ifcx::svg::class": "cut IfcWall material-beton",
    "ifcx::style::curveStyle": {"width": 0.35}
  }},

  // Annotatie die naar het model verwijst
  {"path": "wall-dim-001", "attributes": {
    "ifcx::purpose": "annotation",
    "ifcx::annotation::dimension": {
      "subtype": "linear",
      "value": 5000,
      "associatedGeometry": [{"ref": "wall-guid-123"}]
    }
  }}
]
```

### Gemengd Bestand (Tekening + Model)

Een IfcX bestand kan beide bevatten. De viewer/applicatie kan filteren:

- **Tekening-modus**: Toon alleen `purpose: "drawing"` en `"annotation"` nodes
- **Model-modus**: Toon alleen `purpose: "model"` nodes (3D viewer)
- **Alles**: Toon alles (voor debugging of volledige weergave)

## Hiërarchie: Tekening hangt NIET aan het gebouwmodel

In IFC hangt alles aan de ruimtelijke hiërarchie:
`IfcProject > IfcSite > IfcBuilding > IfcBuildingStorey > IfcWall`

In IfcX staan tekeningen **naast** het model, niet eronder:

```
IfcxProject (root node)
├── Model/                          purpose: "model"
│   ├── Site/
│   │   └── Building/
│   │       ├── Storey_0/
│   │       │   ├── Wall_001        bsi::ifc::class: IfcWall
│   │       │   ├── Door_001        bsi::ifc::class: IfcDoor
│   │       │   └── Space_001      bsi::ifc::class: IfcSpace
│   │       └── Storey_1/
│   │           └── ...
│   └── Installations/
│       └── ...
│
├── Drawings/                       purpose: "drawing"
│   ├── Plattegrond_BG/            Tekencontext (geen BuildingStorey!)
│   │   ├── line_001               ifcx::geom::line
│   │   ├── line_002               ifcx::geom::line
│   │   ├── arc_001                ifcx::geom::trimmedCurve
│   │   ├── hatch_001              ifcx::hatch::material
│   │   └── text_001               ifcx::annotation::text
│   ├── Doorsnede_AA/
│   │   ├── line_100               ifcx::geom::line
│   │   └── dim_100                ifcx::annotation::dimension
│   └── Detail_001/
│       └── ...
│
├── Annotations/                    purpose: "annotation"
│   ├── dim_wall_001               Verwijst naar Wall_001 (via ref)
│   ├── label_space_001            Verwijst naar Space_001
│   └── tag_door_001               Verwijst naar Door_001
│
├── Sheets/                         purpose: "sheet"
│   ├── A1_001/                    ifcx::sheet::paper: {841x594mm}
│   │   ├── viewport_1             ifcx::sheet::viewport (kijkt naar Drawing)
│   │   ├── viewport_2             ifcx::sheet::viewport
│   │   └── titleblock             ifcx::component::reference
│   └── A1_002/
│       └── ...
│
└── Definitions/                    purpose: "definition"
    ├── DoorType_A/                Herbruikbaar blok/component
    ├── TitleBlock_A1/             Titelblok template
    └── Styles/
        ├── CutStyle               ifcx::style::curveStyle
        └── ProjectionStyle        ifcx::style::curveStyle
```

### Waarom deze scheiding?

1. **DWG-import**: Alle entiteiten komen onder `Drawings/` met `purpose: "drawing"`.
   Ze hangen **niet** aan een IfcBuildingStorey. Het zijn gewoon lijnen.

2. **IFC-import**: Gebouwobjecten komen onder `Model/` met `purpose: "model"`.
   De ruimtelijke hiërarchie (Site > Building > Storey) wordt bewaard.

3. **Bonsai export**: Het model zit onder `Model/`, de gegenereerde 2D linework
   onder `Drawings/`, de maatvoering onder `Annotations/`, en de bladindeling
   onder `Sheets/`.

4. **Gemengd werken**: Een gebruiker kan in hetzelfde bestand een BIM-model
   hebben EN handgetekende details. De twee storen elkaar niet.

5. **Filteren**: Een viewer kan kiezen: toon alleen tekeningen, alleen model,
   of alles. Een 2D viewer toont `drawing` + `annotation` + `sheet`.
   Een 3D viewer toont `model`.

## Samenvatting

```
┌─────────────────────────────────────────────────────┐
│                    IfcX Bestand                     │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  purpose: "drawing"                          │   │
│  │  Domme geometrie. Lijnen, tekst, arcering.   │   │
│  │  Geen IFC-klasse. Puur visueel.              │   │
│  │  = Wat je op een DWG/DXF tekening ziet       │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  purpose: "annotation"                       │   │
│  │  Maatvoering, labels, tags.                  │   │
│  │  Verwijst naar modelobjecten.                │   │
│  │  = Wat Bonsai/Revit genereert als 2D docs    │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  purpose: "model"                            │   │
│  │  Slim BIM-object met IFC-klasse.             │   │
│  │  Materiaal, eigenschappen, classificatie.    │   │
│  │  = Wat in een IFC/BIM model zit              │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Dit is het fundamentele verschil met IFC (alleen model) en DWG (alleen tekening).
IfcX kan **allebei** opslaan, maar maakt **altijd duidelijk** wat het is.
