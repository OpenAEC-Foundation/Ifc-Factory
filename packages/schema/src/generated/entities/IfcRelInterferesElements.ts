import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcInterferenceSelect } from '../selects/IfcInterferenceSelect.js';
import type { IfcConnectionGeometry } from './IfcConnectionGeometry.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcLogical } from '../types/IfcLogical.js';
import type { IfcSpatialZone } from './IfcSpatialZone.js';

export interface IfcRelInterferesElements extends IfcRelConnects {
  RelatingElement: IfcInterferenceSelect;
  RelatedElement: IfcInterferenceSelect;
  InterferenceGeometry?: IfcConnectionGeometry | null;
  InterferenceType?: IfcIdentifier | null;
  ImpliedOrder: IfcLogical;
  InterferenceSpace?: IfcSpatialZone | null;
}
