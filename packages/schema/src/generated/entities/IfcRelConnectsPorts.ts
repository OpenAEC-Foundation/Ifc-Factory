import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcPort } from './IfcPort.js';
import type { IfcElement } from './IfcElement.js';

export interface IfcRelConnectsPorts extends IfcRelConnects {
  RelatingPort: IfcPort;
  RelatedPort: IfcPort;
  RealizingElement?: IfcElement | null;
}
