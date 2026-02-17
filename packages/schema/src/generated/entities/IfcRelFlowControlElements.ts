import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcDistributionControlElement } from './IfcDistributionControlElement.js';
import type { IfcDistributionFlowElement } from './IfcDistributionFlowElement.js';

export interface IfcRelFlowControlElements extends IfcRelConnects {
  RelatedControlElements: IfcDistributionControlElement[];
  RelatingFlowElement: IfcDistributionFlowElement;
}
