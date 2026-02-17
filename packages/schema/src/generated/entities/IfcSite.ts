import type { IfcSpatialStructureElement } from './IfcSpatialStructureElement.js';
import type { IfcCompoundPlaneAngleMeasure } from '../types/IfcCompoundPlaneAngleMeasure.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcPostalAddress } from './IfcPostalAddress.js';

export interface IfcSite extends IfcSpatialStructureElement {
  RefLatitude?: IfcCompoundPlaneAngleMeasure | null;
  RefLongitude?: IfcCompoundPlaneAngleMeasure | null;
  RefElevation?: IfcLengthMeasure | null;
  LandTitleNumber?: IfcLabel | null;
  SiteAddress?: IfcPostalAddress | null;
}
