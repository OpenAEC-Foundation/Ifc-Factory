import type { IfcClosedShell } from '../entities/IfcClosedShell.js';
import type { IfcSolidModel } from '../entities/IfcSolidModel.js';

export type IfcSolidOrShell = IfcClosedShell | IfcSolidModel;
