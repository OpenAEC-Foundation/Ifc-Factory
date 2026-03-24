import type { IfcWellKnownTextLiteral } from '../types/IfcWellKnownTextLiteral.js';
import type { IfcCoordinateReferenceSystem } from './IfcCoordinateReferenceSystem.js';

export interface IfcWellKnownText {
  readonly type: string;
  WellKnownText: IfcWellKnownTextLiteral;
  CoordinateReferenceSystem: IfcCoordinateReferenceSystem;
}
