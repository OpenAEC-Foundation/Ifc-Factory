import type { IfcBoundedSurface } from './IfcBoundedSurface.js';
import type { IfcSurface } from './IfcSurface.js';
import type { IfcParameterValue } from '../types/IfcParameterValue.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcRectangularTrimmedSurface extends IfcBoundedSurface {
  BasisSurface: IfcSurface;
  U1: IfcParameterValue;
  V1: IfcParameterValue;
  U2: IfcParameterValue;
  V2: IfcParameterValue;
  Usense: IfcBoolean;
  Vsense: IfcBoolean;
}
