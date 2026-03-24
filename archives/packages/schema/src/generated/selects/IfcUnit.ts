import type { IfcDerivedUnit } from '../entities/IfcDerivedUnit.js';
import type { IfcMonetaryUnit } from '../entities/IfcMonetaryUnit.js';
import type { IfcNamedUnit } from '../entities/IfcNamedUnit.js';

export type IfcUnit = IfcDerivedUnit | IfcMonetaryUnit | IfcNamedUnit;
