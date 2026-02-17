import type { IfcRepresentationItem } from './IfcRepresentationItem.js';
import type { IfcPresentationStyle } from './IfcPresentationStyle.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcStyledItem extends IfcRepresentationItem {
  Item?: IfcRepresentationItem | null;
  Styles: IfcPresentationStyle[];
  Name?: IfcLabel | null;
}
