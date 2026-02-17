import type { IfcTypeProduct } from './IfcTypeProduct.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcElementType extends IfcTypeProduct {
  ElementType?: IfcLabel | null;
}
