import type { IfcTypeResource } from './IfcTypeResource.js';
import type { IfcAppliedValue } from './IfcAppliedValue.js';
import type { IfcPhysicalQuantity } from './IfcPhysicalQuantity.js';

export interface IfcConstructionResourceType extends IfcTypeResource {
  BaseCosts?: IfcAppliedValue[] | null;
  BaseQuantity?: IfcPhysicalQuantity | null;
}
