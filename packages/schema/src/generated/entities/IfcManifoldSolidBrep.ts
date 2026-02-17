import type { IfcSolidModel } from './IfcSolidModel.js';
import type { IfcClosedShell } from './IfcClosedShell.js';

export interface IfcManifoldSolidBrep extends IfcSolidModel {
  Outer: IfcClosedShell;
}
