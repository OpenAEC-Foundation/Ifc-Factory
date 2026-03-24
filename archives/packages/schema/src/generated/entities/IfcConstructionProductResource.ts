import type { IfcConstructionResource } from './IfcConstructionResource.js';
import type { IfcConstructionProductResourceTypeEnum } from '../enums/IfcConstructionProductResourceTypeEnum.js';

export interface IfcConstructionProductResource extends IfcConstructionResource {
  PredefinedType?: IfcConstructionProductResourceTypeEnum | null;
}
