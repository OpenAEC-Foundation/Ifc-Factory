# Dutch Compliance

Ifc-Factory includes built-in support for Dutch building regulation property sets: **BBL** (Besluit bouwwerken leefomgeving), **BENG** (Bijna Energieneutrale Gebouwen), and **Aerius** (stikstof).

## BBL — Brandveiligheid

BBL (Besluit bouwwerken leefomgeving) property sets cover fire safety requirements.

```typescript
import { createBBLPropertySet } from '@ifc-factory/core';

createBBLPropertySet(model, [wallId1, wallId2], {
  brandklasse: 'A1',           // Fire reaction class (A1, A2, B, C, D, E, F)
  rookklasse: 's1',            // Smoke production class (s1, s2, s3)
  brandwerendheid: 60,         // Fire resistance in minutes
  wbdbo: 30,                   // WBDBO (weerstand tegen branddoorslag en brandoverslag) in minutes
});
```

### BBL Properties

| Property | Type | Description |
|----------|------|-------------|
| `brandklasse` | `string` | Fire reaction class per NEN-EN 13501-1 |
| `rookklasse` | `string` | Smoke production class per NEN-EN 13501-1 |
| `brandwerendheid` | `number` | Fire resistance duration in minutes |
| `wbdbo` | `number` | Resistance to fire spread in minutes |

### Applicable Elements

BBL property sets are typically assigned to:
- Walls (`IfcWall`)
- Floors/slabs (`IfcSlab`)
- Doors (`IfcDoor`)
- Windows (`IfcWindow`)
- Columns (`IfcColumn`)
- Beams (`IfcBeam`)

## BENG — Energieprestatie

BENG (Bijna Energieneutrale Gebouwen) property sets cover energy performance requirements for nearly zero-energy buildings.

```typescript
import { createBENGPropertySet } from '@ifc-factory/core';

createBENGPropertySet(model, [buildingId], {
  energieBehoefte: 25.0,                 // BENG 1: Energy demand in kWh/m2/year
  primairFossieleEnergie: 50.0,          // BENG 2: Primary fossil energy in kWh/m2/year
  aandeelHernieuwbareEnergie: 40.0,      // BENG 3: Renewable energy share in %
});
```

### BENG Properties

| Property | Type | Unit | Description |
|----------|------|------|-------------|
| `energieBehoefte` | `number` | kWh/m2/jaar | BENG 1 — Energy demand (heating + cooling) |
| `primairFossieleEnergie` | `number` | kWh/m2/jaar | BENG 2 — Primary fossil energy use |
| `aandeelHernieuwbareEnergie` | `number` | % | BENG 3 — Share of renewable energy |

### BENG Indicator Limits (Netherlands, 2025)

| Building Function | BENG 1 | BENG 2 | BENG 3 |
|-------------------|--------|--------|--------|
| Woonfunctie | 65 | 50 | 50 |
| Kantoor | 50 | 40 | 30 |
| Onderwijs | 50 | 60 | 30 |

### Applicable Elements

BENG property sets are typically assigned to:
- Buildings (`IfcBuilding`)
- Building storeys (`IfcBuildingStorey`)
- Spaces/zones (`IfcSpace`)

## Aerius — Stikstof

Aerius property sets cover nitrogen emissions data required for Dutch environmental permits.

```typescript
import { createAeriusPropertySet } from '@ifc-factory/core';

createAeriusPropertySet(model, [projectId], {
  stikstofEmissie: 1.5,                // NOx emission in kg/year
  stikstofDepositie: 0.05,             // Nitrogen deposition in mol/ha/year
  projectId: 'AERIUS-2024-001',        // Aerius project reference
  referentieSituatie: 'bestaand',       // Reference scenario
  berekeningsmethode: 'AERIUS Calculator 2024',
});
```

### Aerius Properties

| Property | Type | Unit | Description |
|----------|------|------|-------------|
| `stikstofEmissie` | `number` | kg/jaar | Total NOx emission |
| `stikstofDepositie` | `number` | mol/ha/jaar | Nitrogen deposition on Natura 2000 areas |
| `projectId` | `string` | — | Aerius Calculator project ID |
| `referentieSituatie` | `string` | — | Reference scenario (bestaand/vergund) |
| `berekeningsmethode` | `string` | — | Calculation method used |

### Applicable Elements

Aerius property sets are typically assigned to:
- Projects (`IfcProject`)
- Sites (`IfcSite`)

## Combined Example

```typescript
import { IfcModel, createSpatialStructure, createBBLPropertySet, createBENGPropertySet, createAeriusPropertySet } from '@ifc-factory/core';

const model = new IfcModel();
const { project, site, building, storeys } = createSpatialStructure(model, {
  projectName: 'Woningbouw De Straat',
  siteName: 'Locatie Amsterdam',
  buildingName: 'Blok A',
  storeyNames: ['Begane grond', '1e verdieping'],
});

// Add fire safety data to walls
const walls = model.getAllOfType('IfcWall');
const wallIds = walls.map(w => w.expressID);
createBBLPropertySet(model, wallIds, {
  brandklasse: 'A2',
  rookklasse: 's1',
  brandwerendheid: 90,
  wbdbo: 60,
});

// Add energy performance to building
createBENGPropertySet(model, [building.expressID], {
  energieBehoefte: 22.0,
  primairFossieleEnergie: 35.0,
  aandeelHernieuwbareEnergie: 55.0,
});

// Add nitrogen data to project
createAeriusPropertySet(model, [project.expressID], {
  stikstofEmissie: 0.8,
  projectId: 'AERIUS-2024-042',
});

const output = model.toStep();
```
