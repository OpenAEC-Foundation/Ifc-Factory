import type { IfcTextLiteral } from './IfcTextLiteral.js';
import type { IfcPlanarExtent } from './IfcPlanarExtent.js';
import type { IfcBoxAlignment } from '../types/IfcBoxAlignment.js';

export interface IfcTextLiteralWithExtent extends IfcTextLiteral {
  Extent: IfcPlanarExtent;
  BoxAlignment: IfcBoxAlignment;
}
