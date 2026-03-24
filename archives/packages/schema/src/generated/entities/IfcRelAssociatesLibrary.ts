import type { IfcRelAssociates } from './IfcRelAssociates.js';
import type { IfcLibrarySelect } from '../selects/IfcLibrarySelect.js';

export interface IfcRelAssociatesLibrary extends IfcRelAssociates {
  RelatingLibrary: IfcLibrarySelect;
}
