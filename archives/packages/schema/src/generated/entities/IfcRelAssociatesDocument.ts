import type { IfcRelAssociates } from './IfcRelAssociates.js';
import type { IfcDocumentSelect } from '../selects/IfcDocumentSelect.js';

export interface IfcRelAssociatesDocument extends IfcRelAssociates {
  RelatingDocument: IfcDocumentSelect;
}
