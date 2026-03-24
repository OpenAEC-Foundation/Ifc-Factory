import type { IfcNamedUnit } from './IfcNamedUnit.js';

export interface IfcDerivedUnitElement {
  readonly type: string;
  Unit: IfcNamedUnit;
  Exponent: number;
}
