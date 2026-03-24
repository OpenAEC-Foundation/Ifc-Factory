import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcColourSpecification extends IfcPresentationItem {
  Name?: IfcLabel | null;
}
