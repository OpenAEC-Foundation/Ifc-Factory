import type { IfcResource } from './IfcResource.js';
import type { IfcResourceTime } from './IfcResourceTime.js';
import type { IfcAppliedValue } from './IfcAppliedValue.js';
import type { IfcPhysicalQuantity } from './IfcPhysicalQuantity.js';

export interface IfcConstructionResource extends IfcResource {
  Usage?: IfcResourceTime | null;
  BaseCosts?: IfcAppliedValue[] | null;
  BaseQuantity?: IfcPhysicalQuantity | null;
}
