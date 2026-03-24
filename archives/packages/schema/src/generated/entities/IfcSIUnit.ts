import type { IfcNamedUnit } from './IfcNamedUnit.js';
import type { IfcSIPrefix } from '../enums/IfcSIPrefix.js';
import type { IfcSIUnitName } from '../enums/IfcSIUnitName.js';

export interface IfcSIUnit extends IfcNamedUnit {
  Prefix?: IfcSIPrefix | null;
  Name: IfcSIUnitName;
}
