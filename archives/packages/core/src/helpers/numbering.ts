/**
 * Numbering tool — automatically numbers IFC elements based on spatial position,
 * type, and storey. Ported from IfcOpenShell/Bonsai PR #7064 to pure TypeScript.
 */

import type { IfcModel } from '../model/ifc-model.js';
import type { IfcGenericEntity } from '@ifc-factory/schema';
import { generateIfcGuid } from '../guid/ifc-guid.js';
import { createPropertySet, assignPropertySet, getPropertySets } from './properties.js';

// ─── Public types ─────────────────────────────────────────

export type NumberingSystem = 'number' | 'number_padded' | 'lower_letter' | 'upper_letter';

export type SaveTarget =
  | { mode: 'attribute'; attribute: string }
  | { mode: 'pset'; psetName: string; propertyName: string };

export type LocationMode = 'center' | 'min_corner' | 'max_corner';

export interface NumberingSettings {
  /** IFC-types to number, e.g. ['IfcWall', 'IfcColumn'] — empty = all product types */
  types?: string[];
  /** Format string with tokens: {E}, {T}, {S}, [T], [TT], [TF] */
  format?: string;
  /** Numbering system for {E} and {T} tokens */
  numberingSystem?: NumberingSystem;
  /** Numbering system for {S} token */
  storeyNumberingSystem?: NumberingSystem;
  /** Start number for element counter */
  startNumber?: number;
  /** Start number for per-type counter */
  startTypeNumber?: number;
  /** Start number for storey counter */
  startStoreyNumber?: number;
  /** Axis order for sorting, e.g. 'ZYX' = first Z, then Y, then X */
  axisOrder?: string;
  /** Direction per axis: +1 = ascending, -1 = descending */
  directions?: [number, number, number];
  /** Precision per axis in model units — points within this distance on an axis
      are considered equal (same row/column) */
  precision?: [number, number, number];
  /** Location mode for bounding box */
  locationMode?: LocationMode;
  /** Where to save the number */
  saveTarget?: SaveTarget;
}

export interface NumberingResult {
  /** Numbered elements with their assigned number */
  assignments: { entity: IfcGenericEntity; number: string }[];
  /** Duplicates found (if any) */
  duplicates: Map<string, IfcGenericEntity[]>;
}

// ─── Defaults ─────────────────────────────────────────────

const DEFAULTS: Required<NumberingSettings> = {
  types: [],
  format: '{E}',
  numberingSystem: 'number_padded',
  storeyNumberingSystem: 'number',
  startNumber: 1,
  startTypeNumber: 1,
  startStoreyNumber: 0,
  axisOrder: 'XYZ',
  directions: [1, 1, 1],
  precision: [0.001, 0.001, 0.001],
  locationMode: 'center',
  saveTarget: { mode: 'attribute', attribute: 'Tag' },
};

// Known product base types that have ObjectPlacement
const PRODUCT_TYPES = [
  'IfcWall', 'IfcColumn', 'IfcBeam', 'IfcSlab', 'IfcPile', 'IfcMember',
  'IfcPlate', 'IfcFooting', 'IfcStairFlight', 'IfcRamp', 'IfcRampFlight',
  'IfcRoof', 'IfcDoor', 'IfcWindow', 'IfcCurtainWall', 'IfcRailing',
  'IfcStair', 'IfcBuildingElementProxy', 'IfcCovering', 'IfcChimney',
  'IfcBuiltElement', 'IfcEarthworksElement',
  'IfcDistributionElement', 'IfcDistributionFlowElement',
  'IfcFlowTerminal', 'IfcFlowSegment', 'IfcFlowFitting',
  'IfcFurnishingElement', 'IfcTransportElement',
  'IfcDiscreteAccessory', 'IfcMechanicalFastener', 'IfcReinforcingElement',
  'IfcGeotechnicalElement', 'IfcBorehole',
  'IfcCivilElement', 'IfcDeepFoundation', 'IfcCaissonFoundation',
];

// ─── Main functions ───────────────────────────────────────

export function assignNumbers(
  model: IfcModel,
  settings?: NumberingSettings,
): NumberingResult {
  const s = { ...DEFAULTS, ...settings };
  const elements = collectElements(model, s.types);
  const sorted = sortElements(model, elements, s);

  // Build storey list sorted by elevation
  const storeys = getStoreysSorted(model);
  const storeyMap = buildStoreyMap(model, storeys);

  // Per-type counters
  const typeCounters = new Map<string, number>();
  // Per-storey indices
  const storeyIndices = new Map<number, number>();
  for (let i = 0; i < storeys.length; i++) {
    storeyIndices.set(storeys[i]!.expressID, s.startStoreyNumber + i);
  }

  let globalCounter = s.startNumber;
  const assignments: { entity: IfcGenericEntity; number: string }[] = [];

  for (const entity of sorted) {
    const typeName = stripIfcPrefix(entity.type);

    // Type counter
    if (!typeCounters.has(entity.type)) {
      typeCounters.set(entity.type, s.startTypeNumber);
    }
    const typeCounter = typeCounters.get(entity.type)!;
    typeCounters.set(entity.type, typeCounter + 1);

    // Storey index
    const storeyId = storeyMap.get(entity.expressID);
    const storeyIndex = storeyId != null ? (storeyIndices.get(storeyId) ?? 0) : 0;

    const maxE = s.startNumber + sorted.length - 1;
    const maxT = Math.max(
      ...Array.from(typeCounters.values()).map((v) => v - 1),
      s.startTypeNumber,
    );
    const maxS = s.startStoreyNumber + Math.max(storeys.length - 1, 0);

    const formatted = formatString(s.format, {
      E: toNumberString(globalCounter, s.numberingSystem, maxE),
      T: toNumberString(typeCounter, s.numberingSystem, maxT),
      S: toNumberString(storeyIndex, s.storeyNumberingSystem, maxS),
      typeName,
    });

    saveNumber(model, entity, formatted, s.saveTarget);
    assignments.push({ entity, number: formatted });
    globalCounter++;
  }

  const duplicates = findDuplicatesInAssignments(assignments);
  return { assignments, duplicates };
}

export function removeNumbers(
  model: IfcModel,
  options?: { types?: string[]; saveTarget?: SaveTarget },
): void {
  const target = options?.saveTarget ?? DEFAULTS.saveTarget;
  const elements = collectElements(model, options?.types ?? []);

  for (const entity of elements) {
    removeNumber(model, entity, target);
  }
}

export function findDuplicateNumbers(
  model: IfcModel,
  options?: { types?: string[]; saveTarget?: SaveTarget },
): Map<string, IfcGenericEntity[]> {
  const target = options?.saveTarget ?? DEFAULTS.saveTarget;
  const elements = collectElements(model, options?.types ?? []);

  const seen = new Map<string, IfcGenericEntity[]>();
  for (const entity of elements) {
    const num = readNumber(model, entity, target);
    if (num != null && num !== '') {
      const list = seen.get(num);
      if (list) {
        list.push(entity);
      } else {
        seen.set(num, [entity]);
      }
    }
  }

  const duplicates = new Map<string, IfcGenericEntity[]>();
  for (const [num, entities] of seen) {
    if (entities.length > 1) {
      duplicates.set(num, entities);
    }
  }
  return duplicates;
}

// ─── Element collection ───────────────────────────────────

function collectElements(model: IfcModel, types: string[]): IfcGenericEntity[] {
  if (types.length > 0) {
    const result: IfcGenericEntity[] = [];
    for (const t of types) {
      result.push(...model.getAllOfType(t));
    }
    return result;
  }

  // Collect all product types that exist in the model
  const result: IfcGenericEntity[] = [];
  for (const t of PRODUCT_TYPES) {
    result.push(...model.getAllOfType(t));
  }
  return result;
}

// ─── Location & sorting ──────────────────────────────────

function getElementLocation(
  model: IfcModel,
  entity: IfcGenericEntity,
): [number, number, number] | null {
  const placementId = entity['ObjectPlacement'] as number | undefined;
  if (placementId == null) return null;

  return resolveAbsolutePosition(model, placementId);
}

function resolveAbsolutePosition(
  model: IfcModel,
  localPlacementId: number,
): [number, number, number] | null {
  const localPlacement = model.get(localPlacementId);
  if (!localPlacement) return null;

  // Get the relative placement (IfcAxis2Placement3D)
  const relPlacementId = localPlacement['RelativePlacement'] as number | undefined;
  if (relPlacementId == null) return null;

  const axis2 = model.get(relPlacementId);
  if (!axis2) return null;

  const locationId = axis2['Location'] as number | undefined;
  if (locationId == null) return null;

  const point = model.get(locationId);
  if (!point) return null;

  const coords = point['Coordinates'] as number[] | undefined;
  if (!coords) return null;

  const x = coords[0] ?? 0;
  const y = coords[1] ?? 0;
  const z = coords[2] ?? 0;

  // Check for parent placement
  const parentPlacementId = localPlacement['PlacementRelTo'] as number | undefined;
  if (parentPlacementId != null) {
    const parentPos = resolveAbsolutePosition(model, parentPlacementId);
    if (parentPos) {
      return [x + parentPos[0], y + parentPos[1], z + parentPos[2]];
    }
  }

  return [x, y, z];
}

function sortElements(
  model: IfcModel,
  elements: IfcGenericEntity[],
  settings: Required<NumberingSettings>,
): IfcGenericEntity[] {
  const locationCache = new Map<number, [number, number, number] | null>();

  // Pre-compute locations
  for (const el of elements) {
    locationCache.set(el.expressID, getElementLocation(model, el));
  }

  // Filter elements that have a location
  const withLocation = elements.filter((el) => locationCache.get(el.expressID) != null);

  const axisMap: Record<string, number> = { X: 0, Y: 1, Z: 2 };
  const axisIndices = settings.axisOrder
    .toUpperCase()
    .split('')
    .map((c) => axisMap[c] ?? 0);

  withLocation.sort((a, b) => {
    const posA = locationCache.get(a.expressID)!;
    const posB = locationCache.get(b.expressID)!;

    for (const axIdx of axisIndices) {
      const diff = (posA[axIdx]! - posB[axIdx]!) * settings.directions[axIdx]!;
      if (Math.abs(posA[axIdx]! - posB[axIdx]!) > settings.precision[axIdx]!) {
        return diff;
      }
    }

    // Stable sort: fall back to expressID
    return a.expressID - b.expressID;
  });

  return withLocation;
}

// ─── Storey helpers ───────────────────────────────────────

function getStoreysSorted(model: IfcModel): IfcGenericEntity[] {
  const storeys = model.getAllOfType('IfcBuildingStorey');

  // Sort by elevation (from Elevation attribute or placement Z)
  storeys.sort((a, b) => {
    const elA = getStoreyElevation(model, a);
    const elB = getStoreyElevation(model, b);
    return elA - elB;
  });

  return storeys;
}

function getStoreyElevation(model: IfcModel, storey: IfcGenericEntity): number {
  // Try Elevation attribute first
  const elevation = storey['Elevation'] as number | undefined;
  if (elevation != null) return elevation;

  // Fall back to placement Z
  const loc = getElementLocation(model, storey);
  if (loc) return loc[2];

  // Fall back to creation order
  return storey.expressID;
}

function buildStoreyMap(model: IfcModel, storeys: IfcGenericEntity[]): Map<number, number> {
  // Map element expressID → storey expressID
  const map = new Map<number, number>();

  for (const storey of storeys) {
    const contained = model.getContainedElements(storey.expressID);
    for (const el of contained) {
      map.set(el.expressID, storey.expressID);
    }
  }

  return map;
}

// ─── Number formatting ───────────────────────────────────

function formatString(
  format: string,
  ctx: { E: string; T: string; S: string; typeName: string },
): string {
  let result = format;
  result = result.replace(/\{E\}/g, ctx.E);
  result = result.replace(/\{T\}/g, ctx.T);
  result = result.replace(/\{S\}/g, ctx.S);
  result = result.replace(/\[TF\]/g, ctx.typeName);
  result = result.replace(/\[TT\]/g, getTypeAbbreviation(ctx.typeName, 'three'));
  result = result.replace(/\[T\]/g, getTypeAbbreviation(ctx.typeName, 'first'));
  return result;
}

function toNumberString(n: number, system: NumberingSystem, maxN: number): string {
  switch (system) {
    case 'number':
      return String(n);
    case 'number_padded': {
      const digits = Math.max(String(maxN).length, 2);
      return String(n).padStart(digits, '0');
    }
    case 'lower_letter':
      return toLetter(n, false);
    case 'upper_letter':
      return toLetter(n, true);
  }
}

function toLetter(n: number, upper: boolean): string {
  // 1→a, 2→b, ..., 26→z, 27→aa, etc.
  if (n <= 0) n = 1;
  let result = '';
  let num = n;
  while (num > 0) {
    num--;
    result = String.fromCharCode((upper ? 65 : 97) + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
}

function getTypeAbbreviation(typeName: string, mode: 'first' | 'three'): string {
  if (mode === 'first') return typeName.charAt(0).toUpperCase();
  return typeName.substring(0, 3).toUpperCase();
}

function stripIfcPrefix(type: string): string {
  return type.startsWith('Ifc') ? type.substring(3) : type;
}

// ─── Save / read / remove ─────────────────────────────────

function saveNumber(
  model: IfcModel,
  entity: IfcGenericEntity,
  number: string,
  target: SaveTarget,
): void {
  if (target.mode === 'attribute') {
    model.update(entity.expressID, { [target.attribute]: number });
  } else {
    saveToPset(model, entity, target.psetName, target.propertyName, number);
  }
}

function readNumber(
  model: IfcModel,
  entity: IfcGenericEntity,
  target: SaveTarget,
): string | null {
  if (target.mode === 'attribute') {
    const val = entity[target.attribute];
    return val != null ? String(val) : null;
  }
  return readFromPset(model, entity, target.psetName, target.propertyName);
}

function removeNumber(
  model: IfcModel,
  entity: IfcGenericEntity,
  target: SaveTarget,
): void {
  if (target.mode === 'attribute') {
    model.update(entity.expressID, { [target.attribute]: null });
  } else {
    removePsetProperty(model, entity, target.psetName, target.propertyName);
  }
}

// ─── Pset helpers ─────────────────────────────────────────

function saveToPset(
  model: IfcModel,
  entity: IfcGenericEntity,
  psetName: string,
  propertyName: string,
  value: string,
): void {
  const psets = getPropertySets(model, entity.expressID);

  for (const pset of psets) {
    if (pset['Name'] === psetName) {
      // Try to update existing property
      const propIds = pset['HasProperties'] as number[] | undefined;
      if (propIds) {
        for (const propId of propIds) {
          const prop = model.get(propId);
          if (prop && prop['Name'] === propertyName) {
            model.update(propId, { NominalValue: value });
            return;
          }
        }
        // Property not found in existing pset — add it
        const newProp = model.create('IfcPropertySingleValue', {
          Name: propertyName,
          Description: null,
          NominalValue: value,
          Unit: null,
        });
        propIds.push(newProp.expressID);
        model.update(pset.expressID, { HasProperties: propIds });
        return;
      }
    }
  }

  // No matching pset found — create new one
  const pset = createPropertySet(model, psetName, [
    { name: propertyName, value },
  ]);
  assignPropertySet(model, pset.expressID, [entity.expressID]);
}

function readFromPset(
  model: IfcModel,
  entity: IfcGenericEntity,
  psetName: string,
  propertyName: string,
): string | null {
  const psets = getPropertySets(model, entity.expressID);

  for (const pset of psets) {
    if (pset['Name'] === psetName) {
      const propIds = pset['HasProperties'] as number[] | undefined;
      if (propIds) {
        for (const propId of propIds) {
          const prop = model.get(propId);
          if (prop && prop['Name'] === propertyName) {
            const val = prop['NominalValue'];
            return val != null ? String(val) : null;
          }
        }
      }
    }
  }

  return null;
}

function removePsetProperty(
  model: IfcModel,
  entity: IfcGenericEntity,
  psetName: string,
  propertyName: string,
): void {
  const psets = getPropertySets(model, entity.expressID);

  for (const pset of psets) {
    if (pset['Name'] === psetName) {
      const propIds = pset['HasProperties'] as number[] | undefined;
      if (propIds) {
        const filtered = propIds.filter((propId) => {
          const prop = model.get(propId);
          return !(prop && prop['Name'] === propertyName);
        });
        if (filtered.length !== propIds.length) {
          model.update(pset.expressID, { HasProperties: filtered });
        }
      }
    }
  }
}

// ─── Duplicate detection helper ───────────────────────────

function findDuplicatesInAssignments(
  assignments: { entity: IfcGenericEntity; number: string }[],
): Map<string, IfcGenericEntity[]> {
  const seen = new Map<string, IfcGenericEntity[]>();
  for (const a of assignments) {
    const list = seen.get(a.number);
    if (list) {
      list.push(a.entity);
    } else {
      seen.set(a.number, [a.entity]);
    }
  }

  const duplicates = new Map<string, IfcGenericEntity[]>();
  for (const [num, entities] of seen) {
    if (entities.length > 1) {
      duplicates.set(num, entities);
    }
  }
  return duplicates;
}
