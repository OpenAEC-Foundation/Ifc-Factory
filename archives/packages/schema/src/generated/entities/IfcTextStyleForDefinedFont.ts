import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcColour } from '../selects/IfcColour.js';

export interface IfcTextStyleForDefinedFont extends IfcPresentationItem {
  Colour: IfcColour;
  BackgroundColour?: IfcColour | null;
}
