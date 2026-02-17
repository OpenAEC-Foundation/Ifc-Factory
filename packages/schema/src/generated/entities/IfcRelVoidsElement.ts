import type { IfcRelDecomposes } from './IfcRelDecomposes.js';
import type { IfcElement } from './IfcElement.js';
import type { IfcFeatureElementSubtraction } from './IfcFeatureElementSubtraction.js';

export interface IfcRelVoidsElement extends IfcRelDecomposes {
  RelatingBuildingElement: IfcElement;
  RelatedOpeningElement: IfcFeatureElementSubtraction;
}
