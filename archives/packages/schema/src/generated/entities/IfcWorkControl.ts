import type { IfcControl } from './IfcControl.js';
import type { IfcDateTime } from '../types/IfcDateTime.js';
import type { IfcPerson } from './IfcPerson.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcDuration } from '../types/IfcDuration.js';

export interface IfcWorkControl extends IfcControl {
  CreationDate: IfcDateTime;
  Creators?: IfcPerson[] | null;
  Purpose?: IfcLabel | null;
  Duration?: IfcDuration | null;
  TotalFloat?: IfcDuration | null;
  StartTime: IfcDateTime;
  FinishTime?: IfcDateTime | null;
}
