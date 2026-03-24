import type { IfcControl } from './IfcControl.js';
import type { IfcActionRequestTypeEnum } from '../enums/IfcActionRequestTypeEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';

export interface IfcActionRequest extends IfcControl {
  PredefinedType?: IfcActionRequestTypeEnum | null;
  Status?: IfcLabel | null;
  LongDescription?: IfcText | null;
}
