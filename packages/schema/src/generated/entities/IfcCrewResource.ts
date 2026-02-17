import type { IfcConstructionResource } from './IfcConstructionResource.js';
import type { IfcCrewResourceTypeEnum } from '../enums/IfcCrewResourceTypeEnum.js';

export interface IfcCrewResource extends IfcConstructionResource {
  PredefinedType?: IfcCrewResourceTypeEnum | null;
}
