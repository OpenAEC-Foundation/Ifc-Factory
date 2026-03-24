import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcPreDefinedItem extends IfcPresentationItem {
  Name: IfcLabel;
}
