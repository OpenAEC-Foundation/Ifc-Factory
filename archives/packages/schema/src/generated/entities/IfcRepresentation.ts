import type { IfcRepresentationContext } from './IfcRepresentationContext.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcRepresentationItem } from './IfcRepresentationItem.js';

export interface IfcRepresentation {
  readonly type: string;
  ContextOfItems: IfcRepresentationContext;
  RepresentationIdentifier?: IfcLabel | null;
  RepresentationType?: IfcLabel | null;
  Items: IfcRepresentationItem[];
}
