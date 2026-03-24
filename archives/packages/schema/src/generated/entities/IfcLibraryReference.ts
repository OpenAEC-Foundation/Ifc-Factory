import type { IfcExternalReference } from './IfcExternalReference.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcLanguageId } from '../types/IfcLanguageId.js';
import type { IfcLibraryInformation } from './IfcLibraryInformation.js';

export interface IfcLibraryReference extends IfcExternalReference {
  Description?: IfcText | null;
  Language?: IfcLanguageId | null;
  ReferencedLibrary?: IfcLibraryInformation | null;
}
