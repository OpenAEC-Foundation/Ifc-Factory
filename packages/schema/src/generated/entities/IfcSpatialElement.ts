import type { IfcProduct } from './IfcProduct.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcSpatialElement extends IfcProduct {
  LongName?: IfcLabel | null;
}
