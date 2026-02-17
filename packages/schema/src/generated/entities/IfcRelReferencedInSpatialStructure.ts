import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcSpatialReferenceSelect } from '../selects/IfcSpatialReferenceSelect.js';
import type { IfcSpatialElement } from './IfcSpatialElement.js';

export interface IfcRelReferencedInSpatialStructure extends IfcRelConnects {
  RelatedElements: IfcSpatialReferenceSelect[];
  RelatingStructure: IfcSpatialElement;
}
