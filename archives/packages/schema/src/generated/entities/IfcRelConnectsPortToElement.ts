import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcPort } from './IfcPort.js';
import type { IfcDistributionElement } from './IfcDistributionElement.js';

export interface IfcRelConnectsPortToElement extends IfcRelConnects {
  RelatingPort: IfcPort;
  RelatedElement: IfcDistributionElement;
}
