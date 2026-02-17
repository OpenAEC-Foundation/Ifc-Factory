import type { IfcObjectPlacement } from './IfcObjectPlacement.js';
import type { IfcVirtualGridIntersection } from './IfcVirtualGridIntersection.js';
import type { IfcGridPlacementDirectionSelect } from '../selects/IfcGridPlacementDirectionSelect.js';

export interface IfcGridPlacement extends IfcObjectPlacement {
  PlacementLocation: IfcVirtualGridIntersection;
  PlacementRefDirection?: IfcGridPlacementDirectionSelect | null;
}
