import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcProcess } from './IfcProcess.js';
import type { IfcLagTime } from './IfcLagTime.js';
import type { IfcSequenceEnum } from '../enums/IfcSequenceEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcRelSequence extends IfcRelConnects {
  RelatingProcess: IfcProcess;
  RelatedProcess: IfcProcess;
  TimeLag?: IfcLagTime | null;
  SequenceType?: IfcSequenceEnum | null;
  UserDefinedSequenceType?: IfcLabel | null;
}
