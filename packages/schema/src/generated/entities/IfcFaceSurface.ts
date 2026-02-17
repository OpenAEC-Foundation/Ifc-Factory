import type { IfcFace } from './IfcFace.js';
import type { IfcSurface } from './IfcSurface.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcFaceSurface extends IfcFace {
  FaceSurface: IfcSurface;
  SameSense: IfcBoolean;
}
