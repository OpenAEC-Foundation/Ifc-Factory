import type { IfcTypeProduct } from './IfcTypeProduct.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcSpatialElementType extends IfcTypeProduct {
  ElementType?: IfcLabel | null;
}
