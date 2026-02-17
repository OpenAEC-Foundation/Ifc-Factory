import type { IfcGeotechnicalElement } from './IfcGeotechnicalElement.js';
import type { IfcGeotechnicalStratumTypeEnum } from '../enums/IfcGeotechnicalStratumTypeEnum.js';

export interface IfcGeotechnicalStratum extends IfcGeotechnicalElement {
  PredefinedType?: IfcGeotechnicalStratumTypeEnum | null;
}
