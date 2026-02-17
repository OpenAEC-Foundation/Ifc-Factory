import type { IfcControl } from './IfcControl.js';
import type { IfcProjectOrderTypeEnum } from '../enums/IfcProjectOrderTypeEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';

export interface IfcProjectOrder extends IfcControl {
  PredefinedType?: IfcProjectOrderTypeEnum | null;
  Status?: IfcLabel | null;
  LongDescription?: IfcText | null;
}
