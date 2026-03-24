import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcSpace } from './IfcSpace.js';
import type { IfcCovering } from './IfcCovering.js';

export interface IfcRelCoversSpaces extends IfcRelConnects {
  RelatingSpace: IfcSpace;
  RelatedCoverings: IfcCovering[];
}
