import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcElement } from './IfcElement.js';
import type { IfcCovering } from './IfcCovering.js';

export interface IfcRelCoversBldgElements extends IfcRelConnects {
  RelatingBuildingElement: IfcElement;
  RelatedCoverings: IfcCovering[];
}
