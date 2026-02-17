import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcOpeningElement } from './IfcOpeningElement.js';
import type { IfcElement } from './IfcElement.js';

export interface IfcRelFillsElement extends IfcRelConnects {
  RelatingOpeningElement: IfcOpeningElement;
  RelatedBuildingElement: IfcElement;
}
