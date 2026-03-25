# IfcX: Connecties en Meerdere Tekeningen

## Uitgangspunt

Een enkel `.ifcxb` bestand kan honderden 2D tekeningen bevatten. De structuur
moet **lichtgewicht** zijn: geen data dupliceren, maar **verbinden**.

## Principe: Definieer 1x, Verwijs Nx

```
┌─────────────────────────────────────────────────────────┐
│                     IfcX Bestand                        │
│                                                         │
│  Geometry Pool        Tekeningen refereren naar pool    │
│  ┌─────────────┐      ┌──────────┐  ┌──────────┐       │
│  │ geom_001    │◄─────│ View A   │  │ View C   │       │
│  │ geom_002    │◄──┐  │ (1:50)   │  │ (1:20)   │───┐   │
│  │ geom_003    │   │  └──────────┘  └──────────┘   │   │
│  │ geom_004    │◄──┼───────────────────────────────┘   │
│  │ ...         │   │  ┌──────────┐                     │
│  └─────────────┘   └──│ View B   │                     │
│                       │ (1:100)  │                     │
│  Style Pool           └──────────┘                     │
│  ┌─────────────┐                                       │
│  │ cut_wall    │◄──── Views verwijzen ook naar styles  │
│  │ proj_wall   │                                       │
│  │ dim_style   │      Sheets                           │
│  └─────────────┘      ┌──────────────────┐             │
│                       │ Sheet A1-001     │             │
│  Definitions          │  ┌────┐ ┌────┐  │             │
│  ┌─────────────┐      │  │Vp A│ │Vp B│  │             │
│  │ DoorSymbol  │◄─────│  └────┘ └────┘  │             │
│  │ TitleBlock  │◄─────│  [TitleBlock]   │             │
│  └─────────────┘      └──────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

## De Structuur

### Minimale Node

Een tekeningelement is extreem lichtgewicht - alleen een `path`, een geometrie-
verwijzing, en optioneel een stijlverwijzing:

```json
{"path": "e001", "attributes": {
  "ifcx::geom::line": {"points": [[0,0],[5000,0]]}
}}
```

Dat is alles. 1 regel. Geen `purpose`, geen `layer`, geen `color` als die
niet nodig zijn. De context komt van de parent die ernaar verwijst.

### Drawing View (tekenweergave)

Een view is een node die **verwijst** naar elementen en er context aan geeft:

```json
{"path": "view-bg-plattegrond",
 "attributes": {
   "ifcx::view::name": "Plattegrond Begane Grond",
   "ifcx::view::scale": 50,
   "ifcx::view::projection": "plan",
   "ifcx::view::cutHeight": 1200,
   "ifcx::view::extents": {"min": [-1000,-1000], "max": [15000,12000]}
 },
 "children": {
   "wall_north": "e001",
   "wall_east": "e002",
   "wall_south": "e003",
   "door_1": "e010",
   "dim_width": "d001",
   "hatch_floor": "h001",
   "room_label": "t001"
 }
}
```

De **kinderen** zijn de elementen die in deze view zitten. Dezelfde elementen
kunnen in meerdere views voorkomen.

### Connecties (links tussen nodes)

In plaats van data op elke node te kopiëren, gebruiken we **connecties**:

```json
// Connectie: tekeningelement -> modelobject
{"path": "e001", "attributes": {
  "ifcx::geom::line": {"points": [[0,0],[5000,0]]},
  "ifcx::connects::source": {"ref": "ifc-wall-guid-123"}
}}

// Connectie: element -> stijl
{"path": "e001", "attributes": {
  "ifcx::connects::style": {"ref": "style-cut-wall"}
}}

// Connectie: element -> laag
{"path": "e001", "attributes": {
  "ifcx::connects::layer": {"ref": "layer-walls"}
}}

// Connectie: maatvoering -> gemeten objecten
{"path": "d001", "attributes": {
  "ifcx::annotation::dimension": {"subtype": "linear", "value": 5000},
  "ifcx::connects::measures": [{"ref": "e001"}, {"ref": "e003"}]
}}
```

### Eén bestand, 50 tekeningen

```json
{
  "header": {"ifcxVersion": "2.0", "id": "project-001"},
  "data": [
    // === STYLES (gedeeld door alle tekeningen) ===
    {"path": "s-cut-wall", "attributes": {
      "ifcx::style::curveStyle": {"colour": {"r":0,"g":0,"b":0}, "width": 0.35}
    }},
    {"path": "s-proj-wall", "attributes": {
      "ifcx::style::curveStyle": {"colour": {"r":0.5,"g":0.5,"b":0.5}, "width": 0.18}
    }},
    {"path": "s-dimension", "attributes": {
      "ifcx::style::curveStyle": {"colour": {"r":0,"g":0.4,"b":0}, "width": 0.18}
    }},
    {"path": "s-hatch-beton", "attributes": {
      "ifcx::hatch::material": {"standard": "NEN47", "code": "gewapend_beton_tpg"}
    }},

    // === LAYERS (gedeeld) ===
    {"path": "layer-walls", "attributes": {
      "ifcx::layer::style": {"colour": {"r":0,"g":0,"b":0}, "lineWeight": 0.35, "visible": true}
    }},
    {"path": "layer-dims", "attributes": {
      "ifcx::layer::style": {"colour": {"r":0,"g":0.4,"b":0}, "lineWeight": 0.18}
    }},

    // === DEFINITIONS (gedeeld) ===
    {"path": "def-door-symbol",
     "children": {"frame": "def-door-frame", "swing": "def-door-swing"},
     "attributes": {"ifcx::component::definition": {"name": "Door 90cm"}}
    },
    {"path": "def-door-frame", "attributes": {
      "ifcx::geom::line": {"points": [[0,0],[0,900]]}
    }},
    {"path": "def-door-swing", "attributes": {
      "ifcx::geom::trimmedCurve": {"center": [0,0], "radius": 900, "startAngle": 0, "endAngle": 1.5708}
    }},

    // === GEOMETRY ELEMENTS (gedeeld tussen views) ===
    {"path": "e001", "attributes": {
      "ifcx::geom::line": {"points": [[0,0],[5000,0]]},
      "ifcx::connects::style": {"ref": "s-cut-wall"},
      "ifcx::connects::layer": {"ref": "layer-walls"}
    }},
    {"path": "e002", "attributes": {
      "ifcx::geom::line": {"points": [[5000,0],[5000,4000]]},
      "ifcx::connects::style": {"ref": "s-cut-wall"},
      "ifcx::connects::layer": {"ref": "layer-walls"}
    }},
    // ... 100en meer elementen ...

    // === VIEW 1: Plattegrond BG 1:50 ===
    {"path": "view-bg-50",
     "attributes": {
       "ifcx::view::name": "Plattegrond BG",
       "ifcx::view::number": "A01",
       "ifcx::view::scale": 50,
       "ifcx::view::projection": "plan",
       "ifcx::view::cutHeight": 1200
     },
     "children": {"w1": "e001", "w2": "e002", "door1": "e010", "dim1": "d001"}
    },

    // === VIEW 2: Plattegrond BG 1:100 (zelfde elementen, andere schaal) ===
    {"path": "view-bg-100",
     "attributes": {
       "ifcx::view::name": "Plattegrond BG (overzicht)",
       "ifcx::view::number": "A02",
       "ifcx::view::scale": 100,
       "ifcx::view::projection": "plan"
     },
     "children": {"w1": "e001", "w2": "e002", "door1": "e010"}
    },

    // === VIEW 3: Doorsnede A-A ===
    {"path": "view-section-aa",
     "attributes": {
       "ifcx::view::name": "Doorsnede A-A",
       "ifcx::view::number": "B01",
       "ifcx::view::scale": 50,
       "ifcx::view::projection": "section",
       "ifcx::view::cutPlane": {"origin": [2500,0,0], "direction": [0,1,0]}
     },
     "children": {"w1": "e050", "floor1": "e051", "dim1": "d020"}
    },

    // ... 47 meer views ...

    // === SHEETS (bladindeling) ===
    {"path": "sheet-001",
     "attributes": {
       "ifcx::sheet::paper": {"width": 841, "height": 594, "orientation": "landscape"},
       "ifcx::sheet::name": "A1-001 Plattegronden",
       "ifcx::sheet::number": "001"
     },
     "children": {
       "viewport_1": "vp-001",
       "viewport_2": "vp-002",
       "titleblock": "tb-001"
     }
    },
    {"path": "vp-001", "attributes": {
      "ifcx::sheet::viewport": {
        "view": {"ref": "view-bg-50"},
        "position": [50, 50],
        "width": 350,
        "height": 450
      }
    }},
    {"path": "vp-002", "attributes": {
      "ifcx::sheet::viewport": {
        "view": {"ref": "view-section-aa"},
        "position": [450, 50],
        "width": 350,
        "height": 450
      }
    }},
    {"path": "tb-001", "attributes": {
      "ifcx::component::reference": {"definition": {"ref": "def-titleblock"}},
      "ifcx::xform::translate": [661, 0]
    }}
  ]
}
```

## Connectie-types

| Connectie | Betekenis | Voorbeeld |
|-----------|-----------|-----------|
| `ifcx::connects::style` | Element gebruikt deze stijl | Lijn -> snijstijl (0.35mm zwart) |
| `ifcx::connects::layer` | Element zit op deze laag | Lijn -> laag "Walls" |
| `ifcx::connects::source` | Element is afgeleid van dit modelobject | Snijlijn -> IfcWall |
| `ifcx::connects::measures` | Maatvoering meet tussen deze elementen | Dimensie -> 2 muurlijnen |
| `ifcx::connects::material` | Element heeft dit materiaal (voor arcering) | Vlak -> "beton" |
| `ifcx::connects::parent` | Element hoort bij dit parent-element | Deursymbool -> deuropening |

## Waarom Dit Efficiënt Is

### 1. Geen data-duplicatie
Een lijn wordt 1x gedefinieerd. Als dezelfde muurlijn op 5 tekeningen voorkomt
(plattegrond 1:50, 1:100, overzicht, bouwkundig, constructief), wordt de
geometrie maar 1x opgeslagen. Elke view verwijst ernaar.

### 2. Stijlen zijn gedeeld
Eén `s-cut-wall` stijl wordt door duizenden lijnen gebruikt via `connects::style`.
Verander de stijl, en alle lijnen veranderen mee.

### 3. Views zijn lichtgewicht
Een view is alleen een naam, schaal, en een lijst verwijzingen naar elementen.
Geen kopie van de geometrie. Een bestand met 50 views is nauwelijks groter
dan een bestand met 1 view.

### 4. Sheets verwijzen naar views
Een sheet bevat viewports die naar views verwijzen. Het titelblok is een
herbruikbare definitie. Alles is een verwijzing.

### 5. Compact in IFCXB
In het binaire IFCXB formaat worden alle herhaalde strings (pad-verwijzingen)
gecomprimeerd door de string table. Een `{"ref": "e001"}` wordt een paar bytes.
50 views met elk 200 verwijzingen = ~10KB extra in IFCXB.

## Vergelijking

| Aspect | DWG/DXF | IFC | IfcX |
|--------|---------|-----|------|
| Meerdere tekeningen | 1 model + N paper spaces | 1 model, geen tekeningen | N views + N sheets in 1 bestand |
| Gedeelde geometrie | Nee (kopie per space) | Ja (IfcRepresentationMap) | Ja (node referenties) |
| Gedeelde stijlen | LAYER table | IfcPresentationStyle | Stijl-nodes met connects |
| Connectie tekening->model | Niet mogelijk | Niet van toepassing | ifcx::connects::source |
| 100 tekeningen in 1 bestand | Onpraktisch | Niet ondersteund | Ontworpen hiervoor |
