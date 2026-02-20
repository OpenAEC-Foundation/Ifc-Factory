/**
 * Mega-demo — exercises ALL geometry helpers, profiles, elements, property sets,
 * classifications, quantities, materials, geotechnical (GEF + BRO), annotations,
 * and writes the result to a single IFC file.
 *
 * Run:  npx tsx examples/mega-demo.ts
 * Open: output/mega-demo.ifc in any IFC viewer (BIMcollab ZOOM, xBIM, BlenderBIM)
 */

import {
  IfcModel,
  writeIfcFile,
  generateIfcGuid,
  createSpatialStructure,

  // Geometry primitives
  createCartesianPoint,
  createDirection,
  createAxis2Placement3D,
  createLocalPlacement,
  createExtrudedAreaSolid,
  createShapeRepresentation,
  createProductDefinitionShape,
  getOrCreateGeometricRepresentationContext,

  // Profiles
  createRectangleProfile,
  createCircleProfile,
  createHollowRectangleProfile,
  createHollowCircleProfile,
  createIProfile,
  createLProfile,
  createTProfile,
  createUProfile,
  createCProfile,
  createZProfile,
  createArbitraryProfile,
  createArbitraryProfileWithVoids,
  createSteelProfile,

  // Elements
  createGrid,
  createWall,
  createWallOpening,
  createPile,
  createColumn,
  createBeam,
  createFrameMember,

  // Properties & quantities
  createPropertySet,
  createQuantitySet,
  assignPropertySet,

  // Classifications
  createClassification,
  createClassificationReference,
  associateClassification,

  // Relationships
  createRelAssociatesMaterial,

  // Annotations
  createAnnotation,
  createTextLiteral,

  // Geotechnical
  createCPT,
  importGefFile,
  importCPT,
  parseBroXml,
  importBroData,
  importBroFile,

  // Numbering
  assignNumbers,
  removeNumbers,
  findDuplicateNumbers,
} from '../packages/core/src/index.js';

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════
//  MODEL SETUP
// ═══════════════════════════════════════════════════════════

const model = new IfcModel();

// Spatial structure: Project → Site → Building → 3 Storeys
const project = createSpatialStructure(model, {
  projectName: 'Mega Demo Project',
  siteName: 'Bouwterrein Amsterdam',
  buildingName: 'Gebouw A',
  storeyNames: ['Kelder (-1)', 'Begane Grond (0)', 'Verdieping 1 (+1)'],
});

// Get the building and storeys by type
const building = model.getAllOfType('IfcBuilding')[0]!;
const storeys = model.getAllOfType('IfcBuildingStorey');
const storeyKelder = storeys.find((s) => s['Name'] === 'Kelder (-1)')!;
const storeyBG = storeys.find((s) => s['Name'] === 'Begane Grond (0)')!;
const storeyV1 = storeys.find((s) => s['Name'] === 'Verdieping 1 (+1)')!;

// Make sure geometric context exists
const context = getOrCreateGeometricRepresentationContext(model);

console.log('Spatial structure created.');

// ═══════════════════════════════════════════════════════════
//  A. GRID (stramienen)
// ═══════════════════════════════════════════════════════════

const grid = createGrid(model, {
  uAxes: [
    { tag: 'A', start: [0, 0], end: [0, 18] },
    { tag: 'B', start: [6, 0], end: [6, 18] },
    { tag: 'C', start: [12, 0], end: [12, 18] },
    { tag: 'D', start: [18, 0], end: [18, 18] },
    { tag: 'E', start: [24, 0], end: [24, 18] },
  ],
  vAxes: [
    { tag: '1', start: [0, 0], end: [24, 0] },
    { tag: '2', start: [0, 6], end: [24, 6] },
    { tag: '3', start: [0, 12], end: [24, 12] },
    { tag: '4', start: [0, 18], end: [24, 18] },
  ],
});

model.containInSpatialStructure(storeyBG.expressID, grid.expressID);

// Property set on grid
const gridPset = createPropertySet(model, 'Pset_GridCommon', [
  { name: 'GridType', value: 'Rectangular' },
  { name: 'SpacingU', value: 6.0, type: 'IFCLENGTHMEASURE' },
  { name: 'SpacingV', value: 6.0, type: 'IFCLENGTHMEASURE' },
]);
assignPropertySet(model, gridPset.expressID, [grid.expressID]);

console.log('Grid created: 5 U-axes (A-E) x 4 V-axes (1-4), 6m spacing.');

// ═══════════════════════════════════════════════════════════
//  B. WALLS — rechthoekig gebouw 24×18m
// ═══════════════════════════════════════════════════════════

const wallThickness = 0.3;
const wallHeight = 3.5;

// BG exterior walls
const wallSouth = createWall(model, {
  startPoint: [0, 0], endPoint: [24, 0],
  height: wallHeight, thickness: wallThickness,
});
const wallEast = createWall(model, {
  startPoint: [24, 0], endPoint: [24, 18],
  height: wallHeight, thickness: wallThickness,
});
const wallNorth = createWall(model, {
  startPoint: [24, 18], endPoint: [0, 18],
  height: wallHeight, thickness: wallThickness,
});
const wallWest = createWall(model, {
  startPoint: [0, 18], endPoint: [0, 0],
  height: wallHeight, thickness: wallThickness,
});

// Interior wall along axis B (x=6)
const wallInterior = createWall(model, {
  startPoint: [6, 0], endPoint: [6, 18],
  height: wallHeight, thickness: 0.2,
});

const allWalls = [wallSouth, wallEast, wallNorth, wallWest, wallInterior];
for (const w of allWalls) {
  model.containInSpatialStructure(storeyBG.expressID, w.expressID);
}

// Property sets on walls
for (const w of [wallSouth, wallEast, wallNorth, wallWest]) {
  const pset = createPropertySet(model, 'Pset_WallCommon', [
    { name: 'IsExternal', value: true },
    { name: 'ThermalTransmittance', value: 0.18, type: 'IFCTHERMALTRANSMITTANCEMEASURE' },
    { name: 'FireRating', value: 'REI 120' },
    { name: 'LoadBearing', value: true },
  ]);
  assignPropertySet(model, pset.expressID, [w.expressID]);
}

const interiorPset = createPropertySet(model, 'Pset_WallCommon', [
  { name: 'IsExternal', value: false },
  { name: 'FireRating', value: 'EI 60' },
  { name: 'LoadBearing', value: false },
  { name: 'AcousticRating', value: '52 dB' },
]);
assignPropertySet(model, interiorPset.expressID, [wallInterior.expressID]);

// Quantity sets on south wall as example
const southWallLength = 24;
const southWallQset = createQuantitySet(model, 'Qto_WallBaseQuantities', [
  { name: 'Length', value: southWallLength, type: 'length' },
  { name: 'Height', value: wallHeight, type: 'length' },
  { name: 'Width', value: wallThickness, type: 'length' },
  { name: 'GrossArea', value: southWallLength * wallHeight, type: 'area' },
  { name: 'NetArea', value: southWallLength * wallHeight - 2 * (1.2 * 2.1), type: 'area' },
  { name: 'GrossVolume', value: southWallLength * wallHeight * wallThickness, type: 'volume' },
]);
assignPropertySet(model, southWallQset.expressID, [wallSouth.expressID]);

console.log('Walls created: 4 exterior + 1 interior, with Pset_WallCommon & Qto.');

// ═══════════════════════════════════════════════════════════
//  C. OPENINGS IN WALLS
// ═══════════════════════════════════════════════════════════

// 3 windows in south wall
const openings = [];
for (let i = 0; i < 3; i++) {
  const opening = createWallOpening(model, {
    wallId: wallSouth.expressID,
    xOffset: 3 + i * 7,  // spread along 24m wall
    zOffset: 0.9,         // sill height
    width: 1.8,
    height: 1.5,
  });
  openings.push(opening);
  model.containInSpatialStructure(storeyBG.expressID, opening.expressID);
}

// Door opening in south wall
const doorOpening = createWallOpening(model, {
  wallId: wallSouth.expressID,
  xOffset: 20,
  zOffset: 0,
  width: 1.2,
  height: 2.4,
});
model.containInSpatialStructure(storeyBG.expressID, doorOpening.expressID);

// Door opening in interior wall
const intDoor = createWallOpening(model, {
  wallId: wallInterior.expressID,
  xOffset: 4,
  zOffset: 0,
  width: 0.9,
  height: 2.1,
});
model.containInSpatialStructure(storeyBG.expressID, intDoor.expressID);

console.log('Openings created: 3 windows + 1 external door + 1 internal door.');

// ═══════════════════════════════════════════════════════════
//  D. STEEL PROFILES — showcase all profile types
// ═══════════════════════════════════════════════════════════

// Standard steel profiles from lookup
const profileHEA200 = createSteelProfile(model, 'HEA200');
const profileIPE300 = createSteelProfile(model, 'IPE300');
const profileHEB300 = createSteelProfile(model, 'HEB300');
const profileUNP200 = createSteelProfile(model, 'UNP200');

// Parametric profiles
const profileI = createIProfile(model, { h: 0.4, b: 0.2, tw: 0.01, tf: 0.015, r: 0.02 });
const profileL = createLProfile(model, { h: 0.1, b: 0.1, t: 0.01, r: 0.008 });
const profileT = createTProfile(model, { h: 0.15, b: 0.15, tw: 0.008, tf: 0.012 });
const profileU = createUProfile(model, { h: 0.2, b: 0.08, tw: 0.008, tf: 0.012 });
const profileC = createCProfile(model, { h: 0.2, b: 0.08, t: 0.003, girth: 0.02, r: 0.005 });
const profileZ = createZProfile(model, { h: 0.2, b: 0.08, tw: 0.004, tf: 0.006 });

// Basic profiles
const profileRect = createRectangleProfile(model, 0.3, 0.5);
const profileCirc = createCircleProfile(model, 0.15);
const profileHollowRect = createHollowRectangleProfile(model, 0.2, 0.2, 0.008);
const profileHollowCirc = createHollowCircleProfile(model, 0.1, 0.005);

// Arbitrary profile (pentagon shape)
const profileArbitrary = createArbitraryProfile(model, [
  [0, 0], [0.2, 0], [0.25, 0.15], [0.1, 0.25], [-0.05, 0.15], [0, 0],
]);

// Arbitrary profile with void (square with round hole)
const profileWithVoid = createArbitraryProfileWithVoids(
  model,
  [[-0.15, -0.15], [0.15, -0.15], [0.15, 0.15], [-0.15, 0.15], [-0.15, -0.15]],
  [
    // Approximate circle as octagon for the void
    [
      [0.08, 0], [0.057, 0.057], [0, 0.08], [-0.057, 0.057],
      [-0.08, 0], [-0.057, -0.057], [0, -0.08], [0.057, -0.057], [0.08, 0],
    ],
  ],
);

console.log('Profiles created: HEA200, IPE300, HEB300, UNP200 + 12 parametric/arbitrary profiles.');

// ═══════════════════════════════════════════════════════════
//  E. COLUMNS — at every grid intersection on BG
// ═══════════════════════════════════════════════════════════

const columnIds: number[] = [];
const gridXPositions = [0, 6, 12, 18, 24];
const gridYPositions = [0, 6, 12, 18];

for (const gx of gridXPositions) {
  for (const gy of gridYPositions) {
    // Skip corners where walls meet
    const isCorner =
      (gx === 0 || gx === 24) && (gy === 0 || gy === 18);
    if (isCorner) continue;

    const col = createColumn(model, {
      x: gx,
      y: gy,
      z: 0,
      height: wallHeight,
      profile: profileHEA200.expressID,
    });

    model.containInSpatialStructure(storeyBG.expressID, col.expressID);
    columnIds.push(col.expressID);
  }
}

// Property set on all columns
const colPset = createPropertySet(model, 'Pset_ColumnCommon', [
  { name: 'IsExternal', value: false },
  { name: 'LoadBearing', value: true },
  { name: 'FireRating', value: 'R 90' },
  { name: 'Reference', value: 'HEA200' },
]);
assignPropertySet(model, colPset.expressID, columnIds);

console.log(`Columns created: ${columnIds.length} HEA200 columns at grid intersections.`);

// ═══════════════════════════════════════════════════════════
//  F. BEAMS — along grid lines at +1 storey level (3.5m)
// ═══════════════════════════════════════════════════════════

const beamIds: number[] = [];
const beamZ = wallHeight;

// Beams along X (between U-axes)
for (const gy of gridYPositions) {
  for (let i = 0; i < gridXPositions.length - 1; i++) {
    const x1 = gridXPositions[i]!;
    const x2 = gridXPositions[i + 1]!;
    const beam = createBeam(model, {
      startPoint: [x1, gy, beamZ],
      endPoint: [x2, gy, beamZ],
      profile: profileIPE300.expressID,
    });
    model.containInSpatialStructure(storeyV1.expressID, beam.expressID);
    beamIds.push(beam.expressID);
  }
}

// Beams along Y (between V-axes)
for (const gx of gridXPositions) {
  for (let j = 0; j < gridYPositions.length - 1; j++) {
    const y1 = gridYPositions[j]!;
    const y2 = gridYPositions[j + 1]!;
    const beam = createBeam(model, {
      startPoint: [gx, y1, beamZ],
      endPoint: [gx, y2, beamZ],
      profile: profileIPE300.expressID,
    });
    model.containInSpatialStructure(storeyV1.expressID, beam.expressID);
    beamIds.push(beam.expressID);
  }
}

const beamPset = createPropertySet(model, 'Pset_BeamCommon', [
  { name: 'LoadBearing', value: true },
  { name: 'FireRating', value: 'R 60' },
  { name: 'Reference', value: 'IPE300' },
  { name: 'Span', value: 6.0, type: 'IFCLENGTHMEASURE' },
]);
assignPropertySet(model, beamPset.expressID, beamIds);

console.log(`Beams created: ${beamIds.length} IPE300 beams in both grid directions.`);

// ═══════════════════════════════════════════════════════════
//  G. FRAME MEMBERS — diagonal bracing
// ═══════════════════════════════════════════════════════════

const bracingProfile = createSteelProfile(model, 'L80x80x8');

// Diagonal bracing in the south facade (between axes A-B, row 1)
const brace1 = createFrameMember(model, {
  start: [0, 0, 0],
  end: [6, 0, wallHeight],
  profile: bracingProfile.expressID,
  elementType: 'IfcMember',
});
const brace2 = createFrameMember(model, {
  start: [6, 0, 0],
  end: [0, 0, wallHeight],
  profile: bracingProfile.expressID,
  elementType: 'IfcMember',
});

model.containInSpatialStructure(storeyBG.expressID, brace1.expressID);
model.containInSpatialStructure(storeyBG.expressID, brace2.expressID);

const bracePset = createPropertySet(model, 'Pset_MemberCommon', [
  { name: 'LoadBearing', value: true },
  { name: 'Reference', value: 'L80x80x8' },
  { name: 'BracingType', value: 'X-bracing' },
]);
assignPropertySet(model, bracePset.expressID, [brace1.expressID, brace2.expressID]);

console.log('Frame members created: X-bracing with L80x80x8.');

// ═══════════════════════════════════════════════════════════
//  H. PROFILE SHOWCASE — extruded profile gallery at y=-5
// ═══════════════════════════════════════════════════════════

// Create a row of short columns, each with a different profile type,
// placed south of the building as a "profile gallery"
const profileShowcase = [
  { name: 'Rectangle', profile: profileRect },
  { name: 'Circle', profile: profileCirc },
  { name: 'Hollow Rect', profile: profileHollowRect },
  { name: 'Hollow Circ', profile: profileHollowCirc },
  { name: 'I-Shape', profile: profileI },
  { name: 'L-Shape', profile: profileL },
  { name: 'T-Shape', profile: profileT },
  { name: 'U-Shape', profile: profileU },
  { name: 'C-Shape', profile: profileC },
  { name: 'Z-Shape', profile: profileZ },
  { name: 'Arbitrary', profile: profileArbitrary },
  { name: 'With Void', profile: profileWithVoid },
];

for (let i = 0; i < profileShowcase.length; i++) {
  const { name, profile } = profileShowcase[i]!;
  const col = createColumn(model, {
    x: i * 2,
    y: -5,
    z: 0,
    height: 2,
    profile: profile.expressID,
  });
  model.update(col.expressID, { Name: `Profile: ${name}` });
  model.containInSpatialStructure(storeyBG.expressID, col.expressID);

  const pset = createPropertySet(model, 'Pset_ProfileShowcase', [
    { name: 'ProfileType', value: name },
    { name: 'DisplayOrder', value: i + 1, type: 'IFCINTEGER' },
  ]);
  assignPropertySet(model, pset.expressID, [col.expressID]);
}

console.log(`Profile gallery created: ${profileShowcase.length} extruded profiles at y=-5.`);

// ═══════════════════════════════════════════════════════════
//  I. PILES — foundation under building
// ═══════════════════════════════════════════════════════════

const pileIds: number[] = [];

// Round bored piles at grid intersections
for (const gx of [0, 6, 12, 18, 24]) {
  for (const gy of [0, 6, 12, 18]) {
    const pile = createPile(model, {
      x: gx,
      y: gy,
      z: 0,
      length: 18,
      diameter: 0.45,
      type: 'BORED',
    });
    model.containInSpatialStructure(storeyKelder.expressID, pile.expressID);
    pileIds.push(pile.expressID);
  }
}

// A few square driven piles at mid-spans
for (const gx of [3, 9, 15, 21]) {
  const pile = createPile(model, {
    x: gx,
    y: 9,
    z: 0,
    length: 22,
    width: 0.35,
    type: 'DRIVEN',
  });
  model.containInSpatialStructure(storeyKelder.expressID, pile.expressID);
  pileIds.push(pile.expressID);
}

const pilePset = createPropertySet(model, 'Pset_PileCommon', [
  { name: 'DesignBearingCapacity', value: 1200, type: 'IFCFORCEMEASURE' },
  { name: 'ConcreteClass', value: 'C35/45' },
  { name: 'ReinforcementType', value: 'Spiral + longitudinal' },
]);
assignPropertySet(model, pilePset.expressID, pileIds);

const pileQset = createQuantitySet(model, 'Qto_PileBaseQuantities', [
  { name: 'Length', value: 18, type: 'length' },
  { name: 'CrossSectionArea', value: Math.PI * 0.225 * 0.225, type: 'area' },
  { name: 'Volume', value: Math.PI * 0.225 * 0.225 * 18, type: 'volume' },
]);
assignPropertySet(model, pileQset.expressID, pileIds);

console.log(`Piles created: ${pileIds.length} piles (round bored + square driven).`);

// ═══════════════════════════════════════════════════════════
//  J. MATERIALS
// ═══════════════════════════════════════════════════════════

const steelMaterial = model.create('IfcMaterial', {
  Name: 'S355',
  Description: 'Structural steel S355 JR',
  Category: 'Steel',
});
createRelAssociatesMaterial(model, steelMaterial.expressID, [...columnIds, ...beamIds]);

const concreteMaterial = model.create('IfcMaterial', {
  Name: 'C35/45',
  Description: 'Concrete C35/45',
  Category: 'Concrete',
});
createRelAssociatesMaterial(model, concreteMaterial.expressID, pileIds);

const masonryMaterial = model.create('IfcMaterial', {
  Name: 'Metselwerk',
  Description: 'Kalkzandsteen 150mm',
  Category: 'Masonry',
});
createRelAssociatesMaterial(
  model,
  masonryMaterial.expressID,
  allWalls.map((w) => w.expressID),
);

console.log('Materials assigned: S355, C35/45, Metselwerk.');

// ═══════════════════════════════════════════════════════════
//  K. CLASSIFICATIONS — NL/SfB
// ═══════════════════════════════════════════════════════════

const nlsfb = createClassification(model, {
  source: 'BIM Loket',
  edition: '2005',
  name: 'NL/SfB',
  description: 'Nederlandse SfB classificatie',
});

const classWall = createClassificationReference(model, {
  identification: '21.22',
  name: 'Buitenwanden, niet dragend',
  referencedSource: nlsfb.expressID,
});
associateClassification(
  model,
  classWall.expressID,
  allWalls.map((w) => w.expressID),
);

const classColumn = createClassificationReference(model, {
  identification: '28.11',
  name: 'Stalen kolommen',
  referencedSource: nlsfb.expressID,
});
associateClassification(model, classColumn.expressID, columnIds);

const classBeam = createClassificationReference(model, {
  identification: '28.21',
  name: 'Stalen liggers',
  referencedSource: nlsfb.expressID,
});
associateClassification(model, classBeam.expressID, beamIds);

const classPile = createClassificationReference(model, {
  identification: '17.11',
  name: 'Heipalen',
  referencedSource: nlsfb.expressID,
});
associateClassification(model, classPile.expressID, pileIds);

console.log('NL/SfB classifications assigned to all elements.');

// ═══════════════════════════════════════════════════════════
//  L. ANNOTATIONS
// ═══════════════════════════════════════════════════════════

const annotation1 = createAnnotation(model, {
  name: 'Project Info',
  description: 'Mega Demo — alle IFC4x3 geometry helpers',
});
model.containInSpatialStructure(storeyBG.expressID, annotation1.expressID);

const textLit = createTextLiteral(model, {
  literal: 'IFC-FACTORY MEGA DEMO',
  placement: { x: 12, y: 9, z: 5 },
  path: 'RIGHT',
});

console.log('Annotations created.');

// ═══════════════════════════════════════════════════════════
//  M. GEOTECHNICAL — CPT from scratch
// ═══════════════════════════════════════════════════════════

// Hand-crafted CPT data
const depths = Array.from({ length: 100 }, (_, i) => (i + 1) * 0.2);
const qcValues = depths.map((d) => {
  // Simulate: soft clay 0-4m, peat 4-7m, sand 7-15m, dense sand >15m
  if (d < 4) return 0.5 + Math.random() * 0.5;
  if (d < 7) return 0.2 + Math.random() * 0.3;
  if (d < 15) return 8 + Math.random() * 5 + d * 0.3;
  return 20 + Math.random() * 10;
});
const fsValues = qcValues.map((qc) => qc * (0.005 + Math.random() * 0.01));
const rfValues = qcValues.map((qc, i) => (fsValues[i]! / qc) * 100);
const u2Values = depths.map((d) => {
  if (d < 4) return 50 + Math.random() * 30;
  if (d < 7) return 20 + Math.random() * 20;
  return 0 + Math.random() * 10;
});

const cpt1 = createCPT(model, {
  name: 'S-01',
  description: 'Sondering nabij as A/1',
  testDate: '2024-06-15',
  standard: 'NEN-EN-ISO 22476-1',
  coneType: 'Elektrisch',
  preDrilledDepth: 0,
  zSurface: -0.5,
  x: 155000,
  y: 463000,
  channels: [
    { name: 'ConePenetrationResistance', depths, values: qcValues, unit: 'MPa' },
    { name: 'LocalFriction', depths, values: fsValues, unit: 'MPa' },
    { name: 'FrictionRatio', depths, values: rfValues, unit: '%' },
    { name: 'PoreWaterPressure_u2', depths, values: u2Values, unit: 'kPa' },
  ],
});

model.containInSpatialStructure(storeyKelder.expressID, cpt1.borehole.expressID);

console.log('CPT S-01 created: 100 depth points, 4 channels.');

// ═══════════════════════════════════════════════════════════
//  N. GEOTECHNICAL — GEF import
// ═══════════════════════════════════════════════════════════

// Synthetic GEF file
const gefContent = `#GEFID= 1, 1, 0
#FILEOWNER= Demo
#FILEDATE= 2024, 8, 20
#PROJECTID= MegaDemo
#TESTID= S-02
#PROCEDURECODE= 1, 0, 0, -
#XYID= 31000, 155012.00, 463005.00
#ZID= 31000, -0.30
#COLUMN= 5
#COLUMNINFO= 1, m, sondeerlengte, 1
#COLUMNINFO= 2, MPa, conusweerstand, 2
#COLUMNINFO= 3, MPa, plaatselijke wrijving, 3
#COLUMNINFO= 4, %, wrijvingsgetal, 4
#COLUMNINFO= 5, MPa, waterspanning u2, 6
#MEASUREMENTTEXT= 4, Elektrisch, sondeType
#MEASUREMENTTEXT= 6, NEN-EN-ISO 22476-1, normcode
#MEASUREMENTVAR= 1, 0, m, voorgeboorde diepte
#EOH=
0.20 0.55 0.003 0.55 0.052
0.40 0.62 0.004 0.65 0.048
0.60 0.48 0.003 0.63 0.055
0.80 0.70 0.005 0.71 0.045
1.00 0.85 0.006 0.71 0.040
1.20 0.92 0.007 0.76 0.038
1.40 1.10 0.008 0.73 0.035
1.60 1.25 0.009 0.72 0.030
1.80 1.45 0.011 0.76 0.028
2.00 1.80 0.015 0.83 0.025
2.20 2.50 0.020 0.80 0.020
2.40 3.80 0.025 0.66 0.015
2.60 5.20 0.030 0.58 0.010
2.80 7.10 0.040 0.56 0.008
3.00 9.50 0.050 0.53 0.005
3.20 12.00 0.060 0.50 0.003
3.40 15.50 0.075 0.48 0.002
3.60 18.00 0.085 0.47 0.001
3.80 21.00 0.095 0.45 0.001
4.00 25.00 0.100 0.40 0.000`;

const cpt2 = importGefFile(model, gefContent);
model.containInSpatialStructure(storeyKelder.expressID, cpt2.borehole.expressID);

console.log('CPT S-02 imported from GEF: 20 depth points, 4 channels.');

// ═══════════════════════════════════════════════════════════
//  O. GEOTECHNICAL — BRO XML import
// ═══════════════════════════════════════════════════════════

// Synthetic BRO XML
const broXml = `<?xml version="1.0" encoding="UTF-8"?>
<dispatchDataResponse xmlns="http://www.broservices.nl/xsd/dscpt/1.1"
  xmlns:cptcommon="http://www.broservices.nl/xsd/cptcommon/1.1"
  xmlns:gml="http://www.opengis.net/gml/3.2"
  xmlns:swe="http://www.opengis.net/swe/2.0">
  <dispatchDocument>
    <CPT_O>
      <broId>CPT000000099999</broId>
      <qualityRegime>IMBRO</qualityRegime>
      <deliveredLocation>
        <location>
          <gml:Point srsName="urn:ogc:def:crs:EPSG::28992">
            <gml:pos>155025.00 463010.00</gml:pos>
          </gml:Point>
        </location>
      </deliveredLocation>
      <deliveredVerticalPosition>
        <offset>-0.15</offset>
      </deliveredVerticalPosition>
      <conePenetrometerSurvey>
        <researchReportDate>2024-09-10</researchReportDate>
        <cptMethod>Elektrisch</cptMethod>
        <qualityClass>3</qualityClass>
        <predrilledDepth>0.5</predrilledDepth>
        <finalDepth>25.0</finalDepth>
        <conePenetrometer>
          <conePenetrometerType>F7.5CKE2/T</conePenetrometerType>
          <coneSurfaceArea>1500</coneSurfaceArea>
        </conePenetrometer>
        <conePenetrationTest>
          <swe:DataArray>
            <swe:elementType name="cptData">
              <swe:DataRecord>
                <swe:field name="penetrationLength">
                  <swe:Quantity definition="urn:bro:cpt:penetrationLength">
                    <swe:uom code="m"/>
                  </swe:Quantity>
                </swe:field>
                <swe:field name="coneResistance">
                  <swe:Quantity definition="urn:bro:cpt:coneResistance">
                    <swe:uom code="MPa"/>
                  </swe:Quantity>
                </swe:field>
                <swe:field name="localFriction">
                  <swe:Quantity definition="urn:bro:cpt:localFriction">
                    <swe:uom code="MPa"/>
                  </swe:Quantity>
                </swe:field>
                <swe:field name="frictionRatio">
                  <swe:Quantity definition="urn:bro:cpt:frictionRatio">
                    <swe:uom code="%"/>
                  </swe:Quantity>
                </swe:field>
                <swe:field name="porePressureU2">
                  <swe:Quantity definition="urn:bro:cpt:porePressureU2">
                    <swe:uom code="MPa"/>
                  </swe:Quantity>
                </swe:field>
              </swe:DataRecord>
            </swe:elementType>
            <swe:encoding>
              <swe:TextEncoding tokenSeparator="," blockSeparator=";"/>
            </swe:encoding>
            <swe:values>0.5,0.8,0.005,0.6,0.05;1.0,1.2,0.008,0.7,0.04;1.5,0.9,0.006,0.7,0.06;2.0,0.6,0.004,0.7,0.08;2.5,0.3,0.003,1.0,0.10;3.0,0.4,0.003,0.8,0.09;3.5,0.5,0.004,0.8,0.07;4.0,1.5,0.010,0.7,0.04;4.5,3.2,0.020,0.6,0.02;5.0,5.8,0.030,0.5,0.01;5.5,8.5,0.045,0.5,0.005;6.0,12.0,0.055,0.5,0.003;6.5,15.5,0.070,0.5,0.002;7.0,18.0,0.080,0.4,0.001;7.5,22.0,0.090,0.4,0.001;8.0,25.0,0.100,0.4,0.000;8.5,28.0,0.110,0.4,0.000;9.0,30.0,0.115,0.4,0.000;9.5,32.0,0.120,0.4,0.000;10.0,35.0,0.125,0.4,0.000</swe:values>
          </swe:DataArray>
        </conePenetrationTest>
      </conePenetrometerSurvey>
    </CPT_O>
  </dispatchDocument>
</dispatchDataResponse>`;

const cpt3 = importBroFile(model, broXml);
model.containInSpatialStructure(storeyKelder.expressID, cpt3.borehole.expressID);

console.log('CPT CPT000000099999 imported from BRO XML: 20 depth points, 4 channels.');

// ═══════════════════════════════════════════════════════════
//  P. GEOTECHNICAL — importCPT auto-detect
// ═══════════════════════════════════════════════════════════

// Auto-detect GEF
const cpt4 = importCPT(model, gefContent.replace('S-02', 'S-04'));
model.containInSpatialStructure(storeyKelder.expressID, cpt4.borehole.expressID);

// Auto-detect XML
const cpt5 = importCPT(model, broXml.replace('CPT000000099999', 'CPT000000088888'));
model.containInSpatialStructure(storeyKelder.expressID, cpt5.borehole.expressID);

console.log('importCPT auto-detect tested: GEF → S-04, XML → CPT000000088888.');

// ═══════════════════════════════════════════════════════════
//  Q. SECOND STOREY — walls + beams at V1
// ═══════════════════════════════════════════════════════════

// Walls for upper storey
const upperWalls = [
  createWall(model, { startPoint: [0, 0], endPoint: [24, 0], height: 3.0, thickness: wallThickness }),
  createWall(model, { startPoint: [24, 0], endPoint: [24, 18], height: 3.0, thickness: wallThickness }),
  createWall(model, { startPoint: [24, 18], endPoint: [0, 18], height: 3.0, thickness: wallThickness }),
  createWall(model, { startPoint: [0, 18], endPoint: [0, 0], height: 3.0, thickness: wallThickness }),
];
// Note: these walls are placed at z=0 in their own coordinate system.
// In a real project you'd offset them via placement. Here they demonstrate the creation.

for (const w of upperWalls) {
  model.containInSpatialStructure(storeyV1.expressID, w.expressID);
  const pset = createPropertySet(model, 'Pset_WallCommon', [
    { name: 'IsExternal', value: true },
    { name: 'ThermalTransmittance', value: 0.18, type: 'IFCTHERMALTRANSMITTANCEMEASURE' },
    { name: 'FireRating', value: 'REI 90' },
    { name: 'LoadBearing', value: true },
  ]);
  assignPropertySet(model, pset.expressID, [w.expressID]);
}

console.log('Upper storey walls created: 4 exterior walls.');

// ═══════════════════════════════════════════════════════════
//  R. EXTRA STEEL PROFILES — SHS, RHS, CHS columns
// ═══════════════════════════════════════════════════════════

const profileSHS = createSteelProfile(model, 'SHS150x150x8');
const profileRHS = createSteelProfile(model, 'RHS200x100x6');
const profileCHS = createSteelProfile(model, 'CHS219.1x8');

const specialCols = [
  { x: -3, y: 3, profile: profileSHS, name: 'SHS150x150x8' },
  { x: -3, y: 9, profile: profileRHS, name: 'RHS200x100x6' },
  { x: -3, y: 15, profile: profileCHS, name: 'CHS219.1x8' },
];

for (const sc of specialCols) {
  const col = createColumn(model, {
    x: sc.x,
    y: sc.y,
    z: 0,
    height: 4,
    profile: sc.profile.expressID,
  });
  model.update(col.expressID, { Name: `Hollow section: ${sc.name}` });
  model.containInSpatialStructure(storeyBG.expressID, col.expressID);

  const pset = createPropertySet(model, 'Pset_ColumnCommon', [
    { name: 'Reference', value: sc.name },
    { name: 'LoadBearing', value: true },
    { name: 'IsExternal', value: true },
  ]);
  assignPropertySet(model, pset.expressID, [col.expressID]);
}

console.log('Hollow section columns created: SHS, RHS, CHS.');

// ═══════════════════════════════════════════════════════════
//  S. DIAGONAL BEAM (3D) — sloped member
// ═══════════════════════════════════════════════════════════

const slopedBeam = createFrameMember(model, {
  start: [0, 0, wallHeight],
  end: [12, 9, wallHeight + 4],
  profile: profileHEB300.expressID,
  elementType: 'IfcBeam',
});
model.update(slopedBeam.expressID, { Name: 'Sloped Beam HEB300' });
model.containInSpatialStructure(storeyV1.expressID, slopedBeam.expressID);

const slopedPset = createPropertySet(model, 'Pset_BeamCommon', [
  { name: 'Reference', value: 'HEB300' },
  { name: 'LoadBearing', value: true },
  { name: 'Slope', value: 21.8, type: 'IFCPLANEANGLEMEASURE' },
]);
assignPropertySet(model, slopedPset.expressID, [slopedBeam.expressID]);

console.log('Sloped 3D beam created: HEB300 from (0,0,3.5) to (12,9,7.5).');

// ═══════════════════════════════════════════════════════════
//  T. NUMBERING — automatic element numbering
// ═══════════════════════════════════════════════════════════

// 1. Number all columns in X→Y order with format 'K{E}'
const colResult = assignNumbers(model, {
  types: ['IfcColumn'],
  format: 'K{E}',
  numberingSystem: 'number_padded',
  axisOrder: 'XYZ',
  directions: [1, 1, 1],
  saveTarget: { mode: 'attribute', attribute: 'Tag' },
});
console.log(`Columns numbered: ${colResult.assignments.length} elements (e.g. ${colResult.assignments[0]?.number ?? '-'}, ${colResult.assignments[1]?.number ?? '-'}, ...)`);

// 2. Number all beams per type with format '[T]{T}'
const beamResult = assignNumbers(model, {
  types: ['IfcBeam'],
  format: '[T]{T}',
  numberingSystem: 'number_padded',
  axisOrder: 'XYZ',
  saveTarget: { mode: 'attribute', attribute: 'Tag' },
});
console.log(`Beams numbered: ${beamResult.assignments.length} elements (e.g. ${beamResult.assignments[0]?.number ?? '-'})`);

// 3. Number all piles per storey with format 'P{S}-{E}'
const pileResult = assignNumbers(model, {
  types: ['IfcPile'],
  format: 'P{S}-{E}',
  numberingSystem: 'number_padded',
  storeyNumberingSystem: 'number',
  axisOrder: 'XYZ',
  saveTarget: { mode: 'attribute', attribute: 'Tag' },
});
console.log(`Piles numbered: ${pileResult.assignments.length} elements (e.g. ${pileResult.assignments[0]?.number ?? '-'})`);

// 4. Duplicate detection
const dupsBefore = findDuplicateNumbers(model, {
  types: ['IfcColumn'],
  saveTarget: { mode: 'attribute', attribute: 'Tag' },
});
console.log(`Duplicate column numbers: ${dupsBefore.size} (expected: 0)`);

// 5. Remove pile numbers and verify they're gone
removeNumbers(model, {
  types: ['IfcPile'],
  saveTarget: { mode: 'attribute', attribute: 'Tag' },
});
const pilesAfterRemove = model.getAllOfType('IfcPile');
const hasTag = pilesAfterRemove.some((p) => p['Tag'] != null && p['Tag'] !== '');
console.log(`Pile numbers removed: tags cleared = ${!hasTag}`);

// 6. Re-number piles (to leave them numbered in final output)
assignNumbers(model, {
  types: ['IfcPile'],
  format: 'P{S}-{E}',
  numberingSystem: 'number_padded',
  storeyNumberingSystem: 'number',
  axisOrder: 'XYZ',
  saveTarget: { mode: 'attribute', attribute: 'Tag' },
});

console.log('Numbering complete.');

// ═══════════════════════════════════════════════════════════
//  WRITE IFC FILE
// ═══════════════════════════════════════════════════════════

const ifcContent = writeIfcFile(model);

const outputDir = join(__dirname, '..', 'output');
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, 'mega-demo.ifc');
writeFileSync(outputPath, ifcContent, 'utf-8');

console.log('\n════════════════════════════════════════════');
console.log(`IFC file written: ${outputPath}`);
console.log(`Model size: ${model.size} entities`);
console.log('════════════════════════════════════════════');

// ── Summary ──
console.log('\nContents:');
console.log(`  Spatial:       1 project, 1 site, 1 building, 3 storeys`);
console.log(`  Grid:          5×4 grid (6m spacing)`);
console.log(`  Walls:         ${allWalls.length + upperWalls.length} walls (exterior + interior, 2 storeys)`);
console.log(`  Openings:      ${openings.length} windows + 2 doors`);
console.log(`  Columns:       ${columnIds.length + specialCols.length + profileShowcase.length} columns (HEA200 + hollow + profile gallery)`);
console.log(`  Beams:         ${beamIds.length + 1} beams (IPE300 + sloped HEB300)`);
console.log(`  Bracing:       2 frame members (L80x80x8 X-brace)`);
console.log(`  Piles:         ${pileIds.length} piles (bored + driven)`);
console.log(`  CPT soundings: 5 (manual, GEF×2, BRO×2)`);
console.log(`  Materials:     3 (S355, C35/45, Metselwerk)`);
console.log(`  NL/SfB:        4 classification references`);
console.log(`  Profiles:      ${4 + profileShowcase.length + 3} unique profiles`);
console.log(`  Property sets: walls, columns, beams, piles, grid, bracing, CPT`);
console.log(`  Quantity sets: walls, piles`);
console.log(`  Annotations:   1 annotation + 1 text literal`);
