import type { IfcRelDecomposes } from './IfcRelDecomposes.js';
import type { IfcElement } from './IfcElement.js';
import type { IfcFeatureElementAddition } from './IfcFeatureElementAddition.js';

export interface IfcRelProjectsElement extends IfcRelDecomposes {
  RelatingElement: IfcElement;
  RelatedFeatureElement: IfcFeatureElementAddition;
}
