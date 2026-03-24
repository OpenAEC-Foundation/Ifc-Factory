import type { IfcUnit } from '../selects/IfcUnit.js';

export interface IfcUnitAssignment {
  readonly type: string;
  Units: IfcUnit[];
}
