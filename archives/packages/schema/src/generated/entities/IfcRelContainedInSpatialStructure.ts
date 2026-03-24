import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcProduct } from './IfcProduct.js';
import type { IfcSpatialElement } from './IfcSpatialElement.js';

export interface IfcRelContainedInSpatialStructure extends IfcRelConnects {
  RelatedElements: IfcProduct[];
  RelatingStructure: IfcSpatialElement;
}
