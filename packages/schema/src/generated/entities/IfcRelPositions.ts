import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcPositioningElement } from './IfcPositioningElement.js';
import type { IfcProduct } from './IfcProduct.js';

export interface IfcRelPositions extends IfcRelConnects {
  RelatingPositioningElement: IfcPositioningElement;
  RelatedProducts: IfcProduct[];
}
