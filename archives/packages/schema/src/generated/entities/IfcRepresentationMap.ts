import type { IfcAxis2Placement } from '../selects/IfcAxis2Placement.js';
import type { IfcRepresentation } from './IfcRepresentation.js';

export interface IfcRepresentationMap {
  readonly type: string;
  MappingOrigin: IfcAxis2Placement;
  MappedRepresentation: IfcRepresentation;
}
