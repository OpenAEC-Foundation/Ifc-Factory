import type { IfcObject } from './IfcObject.js';
import type { IfcObjectPlacement } from './IfcObjectPlacement.js';
import type { IfcProductRepresentation } from './IfcProductRepresentation.js';

export interface IfcProduct extends IfcObject {
  ObjectPlacement?: IfcObjectPlacement | null;
  Representation?: IfcProductRepresentation | null;
}
