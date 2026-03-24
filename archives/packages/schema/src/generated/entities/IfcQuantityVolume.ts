import type { IfcPhysicalSimpleQuantity } from './IfcPhysicalSimpleQuantity.js';
import type { IfcVolumeMeasure } from '../types/IfcVolumeMeasure.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcQuantityVolume extends IfcPhysicalSimpleQuantity {
  VolumeValue: IfcVolumeMeasure;
  Formula?: IfcLabel | null;
}
