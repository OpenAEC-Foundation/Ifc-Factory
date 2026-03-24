import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcConnectionGeometry } from './IfcConnectionGeometry.js';
import type { IfcElement } from './IfcElement.js';

export interface IfcRelConnectsElements extends IfcRelConnects {
  ConnectionGeometry?: IfcConnectionGeometry | null;
  RelatingElement: IfcElement;
  RelatedElement: IfcElement;
}
