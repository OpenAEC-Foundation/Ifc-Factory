import type { IfcProduct } from './IfcProduct.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';

export interface IfcElement extends IfcProduct {
  Tag?: IfcIdentifier | null;
}
