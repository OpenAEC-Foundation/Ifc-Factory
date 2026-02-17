import type { IfcPresentationItem } from './IfcPresentationItem.js';
import type { IfcSizeSelect } from '../selects/IfcSizeSelect.js';
import type { IfcTextAlignment } from '../types/IfcTextAlignment.js';
import type { IfcTextDecoration } from '../types/IfcTextDecoration.js';
import type { IfcTextTransformation } from '../types/IfcTextTransformation.js';

export interface IfcTextStyleTextModel extends IfcPresentationItem {
  TextIndent?: IfcSizeSelect | null;
  TextAlign?: IfcTextAlignment | null;
  TextDecoration?: IfcTextDecoration | null;
  LetterSpacing?: IfcSizeSelect | null;
  WordSpacing?: IfcSizeSelect | null;
  TextTransform?: IfcTextTransformation | null;
  LineHeight?: IfcSizeSelect | null;
}
