import type { IfcSurface } from './IfcSurface.js';
import type { IfcAxis2Placement3D } from './IfcAxis2Placement3D.js';

export interface IfcElementarySurface extends IfcSurface {
  Position: IfcAxis2Placement3D;
}
