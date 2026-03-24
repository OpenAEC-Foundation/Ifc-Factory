import type { IfcPresentationLayerAssignment } from './IfcPresentationLayerAssignment.js';
import type { IfcLogical } from '../types/IfcLogical.js';
import type { IfcPresentationStyle } from './IfcPresentationStyle.js';

export interface IfcPresentationLayerWithStyle extends IfcPresentationLayerAssignment {
  LayerOn: IfcLogical;
  LayerFrozen: IfcLogical;
  LayerBlocked: IfcLogical;
  LayerStyles: IfcPresentationStyle[];
}
