import type { IfcControl } from './IfcControl.js';
import type { IfcPermitTypeEnum } from '../enums/IfcPermitTypeEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';

export interface IfcPermit extends IfcControl {
  PredefinedType?: IfcPermitTypeEnum | null;
  Status?: IfcLabel | null;
  LongDescription?: IfcText | null;
}
