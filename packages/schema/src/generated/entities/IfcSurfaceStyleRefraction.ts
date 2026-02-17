import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcReal } from '../types/IfcReal.js';

export interface IfcSurfaceStyleRefraction extends IfcPresentationItem {
  RefractionIndex?: IfcReal | null;
  DispersionFactor?: IfcReal | null;
}
