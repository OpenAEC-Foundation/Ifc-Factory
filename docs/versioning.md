# IfcX: Ingebouwde Versiebeheer (GitDiff by Design)

## OPTIONEEL

Versiebeheer is **volledig optioneel**. Een IfcX-bestand zonder `ifcx::revision::*`
attributen is gewoon een snapshot - geen extra overhead, geen extra bytes.

Versiebeheer wordt alleen geactiveerd als je er expliciet voor kiest. De meeste
bestanden zullen het NIET gebruiken. Het is bedoeld voor samenwerkingsscenario's
waar je de geschiedenis in het bestand wilt bewaren.

## Compact by Design

Minimale overhead:
- Alleen **gewijzigde attributen** worden opgeslagen, niet de hele node
- `previous` (undo data) is optioneel - laat het weg als je geen undo nodig hebt
- Zonder `previous`: een revisie-markering is 1 attribuut van ~20 bytes per node
- De revisie-metadata zelf is 1 node per revisie (~100 bytes)
- 100 revisies van een tekening met 500 nodes: **~5-15 KB extra** in IFCXB

### Minimale variant (alleen tracking, geen undo)

```json
{"path": "wall-001", "attributes": {
  "ifcx::geom::line": {"points": [[0,0],[6000,0]]},
  "ifcx::revision::at": "rev-002"
}}
```

Dat is alles. 1 extra attribuut van 25 bytes. Geen `previous`, geen stats.

### Volledige variant (met undo)

Alleen als je wilt kunnen terugdraaien:

```json
{"path": "wall-001", "attributes": {
  "ifcx::geom::line": {"points": [[0,0],[6000,0]]},
  "ifcx::revision::modified": {
    "at": "rev-002",
    "was": {"ifcx::geom::line": {"points": [[0,0],[5000,0]]}}
  }
}}
```

## Hoe Het Werkt

De IFC5 compositie-architectuur ondersteunt dit al:

1. **Meerdere nodes met hetzelfde pad** → later wint (override)
2. **Child op `null` zetten** → verwijdering
3. **Attribuut overschrijven** → wijziging

Een "diff" is dus simpelweg een set nodes die de vorige staat overschrijft.

## Schema: `ifcx::revision::*`

```json
{
  "header": {
    "ifcxVersion": "2.0",
    "id": "project-001"
  },
  "data": [
    // === REVISIE METADATA ===
    {"path": "_revisions",
     "children": {
       "rev-001": "rev-001",
       "rev-002": "rev-002",
       "rev-003": "rev-003"
     }
    },

    {"path": "rev-001",
     "attributes": {
       "ifcx::revision::info": {
         "id": "rev-001",
         "parent": null,
         "timestamp": "2026-03-20T09:00:00Z",
         "author": "architect@bureau.nl",
         "message": "Eerste ontwerp plattegrond BG",
         "tag": "v0.1"
       },
       "ifcx::revision::stats": {
         "nodesAdded": 45,
         "nodesModified": 0,
         "nodesRemoved": 0
       }
     }
    },

    {"path": "rev-002",
     "attributes": {
       "ifcx::revision::info": {
         "id": "rev-002",
         "parent": "rev-001",
         "timestamp": "2026-03-21T14:30:00Z",
         "author": "constructeur@ingenieursbureau.nl",
         "message": "Draagmuur verplaatst, kolom toegevoegd",
         "tag": null
       }
     }
    },

    {"path": "rev-003",
     "attributes": {
       "ifcx::revision::info": {
         "id": "rev-003",
         "parent": "rev-002",
         "timestamp": "2026-03-22T10:15:00Z",
         "author": "architect@bureau.nl",
         "message": "Keuken vergroot, deur verplaatst",
         "tag": "v0.2-DO"
       }
     }
    },

    // === BASISSTAAT (rev-001): alle originele nodes ===
    {"path": "wall-001",
     "attributes": {
       "ifcx::purpose": "drawing",
       "ifcx::geom::line": {"points": [[0,0],[5000,0]]},
       "ifcx::revision::created": "rev-001"
     }
    },
    {"path": "wall-002",
     "attributes": {
       "ifcx::purpose": "drawing",
       "ifcx::geom::line": {"points": [[5000,0],[5000,4000]]},
       "ifcx::revision::created": "rev-001"
     }
    },
    {"path": "door-001",
     "attributes": {
       "ifcx::purpose": "drawing",
       "ifcx::geom::trimmedCurve": {"center": [2000,0], "radius": 900, "startAngle": 0, "endAngle": 1.5708},
       "ifcx::revision::created": "rev-001"
     }
    },

    // === DIFF rev-002: wijzigingen t.o.v. rev-001 ===

    // Muur verplaatst (override van bestaande node)
    {"path": "wall-001",
     "attributes": {
       "ifcx::geom::line": {"points": [[0,0],[6000,0]]},
       "ifcx::revision::modified": {
         "revision": "rev-002",
         "previous": {"ifcx::geom::line": {"points": [[0,0],[5000,0]]}}
       }
     }
    },

    // Kolom toegevoegd (nieuwe node)
    {"path": "column-001",
     "attributes": {
       "ifcx::purpose": "drawing",
       "ifcx::geom::circle": {"center": [3000,2000], "radius": 150},
       "ifcx::revision::created": "rev-002"
     }
    },

    // === DIFF rev-003: wijzigingen t.o.v. rev-002 ===

    // Deur verplaatst
    {"path": "door-001",
     "attributes": {
       "ifcx::geom::trimmedCurve": {"center": [3500,0], "radius": 900, "startAngle": 0, "endAngle": 1.5708},
       "ifcx::revision::modified": {
         "revision": "rev-003",
         "previous": {"ifcx::geom::trimmedCurve": {"center": [2000,0], "radius": 900, "startAngle": 0, "endAngle": 1.5708}}
       }
     }
    },

    // Binnenmuur verwijderd
    {"path": "wall-003",
     "attributes": {
       "ifcx::revision::deleted": {
         "revision": "rev-003",
         "previous": {
           "ifcx::geom::line": {"points": [[3000,0],[3000,4000]]}
         }
       }
     }
    }
  ]
}
```

## Revisie-attributen

| Attribuut | Type | Beschrijving |
|-----------|------|--------------|
| `ifcx::revision::info` | Object | Revisie metadata (id, parent, timestamp, author, message, tag) |
| `ifcx::revision::stats` | Object | Statistieken (nodesAdded, nodesModified, nodesRemoved) |
| `ifcx::revision::created` | String | Revisie-ID waarin deze node is aangemaakt |
| `ifcx::revision::modified` | Object | Revisie + vorige waarde van gewijzigde attributen |
| `ifcx::revision::deleted` | Object | Revisie + vorige waarde van verwijderde node |
| `ifcx::revision::branch` | String | Branch naam (voor parallelle ontwikkeling) |
| `ifcx::revision::merge` | Object | Merge informatie (source branch, resolved conflicts) |

## Operaties

### 1. Huidige staat opvragen (HEAD)

Neem alle nodes en pas de IFC5 compositie-regels toe:
- Laatste waarde wint per pad
- `deleted` nodes worden overgeslagen
- Resultaat = huidige tekening

### 2. Staat op een specifieke revisie (checkout)

Filter nodes: neem alleen nodes waar `revision::created <= target` en
geen `revision::deleted <= target`. Voor `modified` nodes: gebruik de
`previous` waarde als de modificatie na de target revisie valt.

### 3. Diff tussen twee revisies

Vergelijk nodes per pad:
- Node bestaat in B maar niet in A → **toegevoegd**
- Node bestaat in A maar niet in B → **verwijderd**
- Node bestaat in beide maar attributen verschillen → **gewijzigd**

```json
{
  "ifcx::diff": {
    "from": "rev-001",
    "to": "rev-003",
    "added": ["column-001"],
    "modified": ["wall-001", "door-001"],
    "removed": ["wall-003"],
    "changes": [
      {
        "path": "wall-001",
        "attribute": "ifcx::geom::line",
        "old": {"points": [[0,0],[5000,0]]},
        "new": {"points": [[0,0],[6000,0]]}
      },
      {
        "path": "door-001",
        "attribute": "ifcx::geom::trimmedCurve",
        "old": {"center": [2000,0]},
        "new": {"center": [3500,0]}
      }
    ]
  }
}
```

### 4. Branching

```json
{"path": "rev-004",
 "attributes": {
   "ifcx::revision::info": {
     "id": "rev-004",
     "parent": "rev-002",
     "timestamp": "2026-03-22T16:00:00Z",
     "author": "installateur@mep.nl",
     "message": "W-installatie leidingen BG"
   },
   "ifcx::revision::branch": "mep-installatie"
 }
}
```

### 5. Merging

```json
{"path": "rev-005",
 "attributes": {
   "ifcx::revision::info": {
     "id": "rev-005",
     "parent": "rev-003",
     "timestamp": "2026-03-25T09:00:00Z",
     "author": "architect@bureau.nl",
     "message": "Merge MEP installatie in hoofdontwerp"
   },
   "ifcx::revision::merge": {
     "source": "rev-004",
     "sourceBranch": "mep-installatie",
     "conflicts": [],
     "strategy": "theirs"
   }
 }
}
```

### 6. Conflictresolutie

Als twee branches dezelfde node wijzigen:

```json
{
  "ifcx::revision::merge": {
    "source": "rev-004",
    "conflicts": [
      {
        "path": "wall-001",
        "attribute": "ifcx::geom::line",
        "ours": {"points": [[0,0],[6000,0]]},
        "theirs": {"points": [[0,0],[5500,0]]},
        "resolved": {"points": [[0,0],[6000,0]]},
        "resolution": "ours"
      }
    ]
  }
}
```

## Visuele Diff in de Viewer

De viewer kan revisie-diffs tonen als een **markup overlay**:

| Kleur | Betekenis |
|-------|-----------|
| Groen | Toegevoegd in deze revisie |
| Rood (doorgestreept) | Verwijderd in deze revisie |
| Oranje | Gewijzigd (oude positie vaag, nieuwe positie helder) |
| Blauw | Ongewijzigd |

## Waarom Dit Beter Is Dan Git

| Aspect | Git + DXF/DWG | IfcX met revisies |
|--------|---------------|-------------------|
| Bestandsformaat | Binair (DWG) of enorm (DXF) | JSON nodes, compact als IFCXB |
| Diff kwaliteit | Tekst-diff op DXF (waardeloos) | Semantische diff per node/attribuut |
| Merge | Handmatig (kan niet automatisch) | Automatisch per node (pad-gebaseerd) |
| Branching | Hele bestanden kopiëren | Branches in hetzelfde bestand |
| Geschiedenis | Aparte .git map, groot | In het bestand zelf, compact |
| Offline | Ja | Ja (het IS het bestand) |
| Collaboratie | Git server nodig | Bestand delen = geschiedenis delen |
| Visuele diff | Niet mogelijk | In de viewer, met kleuren |

## Compact Opslaan

In IFCXB worden de revisie-diffs zeer compact opgeslagen:
- De `previous` waarden zijn alleen de gewijzigde attributen (niet de hele node)
- String table deduplicatie comprimeert herhaalde pad-namen
- Zstandard comprimeert de hele data-sectie
- Een bestand met 100 revisies van een tekening met 500 nodes is ~50-100KB groter dan zonder revisies

## Optioneel

Revisies zijn **optioneel**. Een IfcX-bestand zonder `ifcx::revision::*` attributen
is gewoon een snapshot zonder geschiedenis. Tools die geen versiebeheer ondersteunen
negeren de revisie-attributen.
