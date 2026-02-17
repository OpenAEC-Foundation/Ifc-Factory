import type { IfcTypeObject } from './IfcTypeObject.js';
import type { IfcRepresentationMap } from './IfcRepresentationMap.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcTypeProduct extends IfcTypeObject {
  RepresentationMaps?: IfcRepresentationMap[] | null;
  Tag?: IfcLabel | null;
}
