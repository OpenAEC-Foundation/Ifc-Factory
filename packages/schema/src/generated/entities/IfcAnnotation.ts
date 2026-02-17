import type { IfcProduct } from './IfcProduct.js';
import type { IfcAnnotationTypeEnum } from '../enums/IfcAnnotationTypeEnum.js';

export interface IfcAnnotation extends IfcProduct {
  PredefinedType?: IfcAnnotationTypeEnum | null;
}
