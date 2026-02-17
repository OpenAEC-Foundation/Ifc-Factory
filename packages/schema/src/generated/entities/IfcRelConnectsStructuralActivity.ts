import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcStructuralActivityAssignmentSelect } from '../selects/IfcStructuralActivityAssignmentSelect.js';
import type { IfcStructuralActivity } from './IfcStructuralActivity.js';

export interface IfcRelConnectsStructuralActivity extends IfcRelConnects {
  RelatingElement: IfcStructuralActivityAssignmentSelect;
  RelatedStructuralActivity: IfcStructuralActivity;
}
