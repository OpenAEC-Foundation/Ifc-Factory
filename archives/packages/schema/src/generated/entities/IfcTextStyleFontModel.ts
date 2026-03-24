import type { IfcPreDefinedTextFont } from './IfcPreDefinedTextFont.js';
import type { IfcTextFontName } from '../types/IfcTextFontName.js';
import type { IfcFontStyle } from '../types/IfcFontStyle.js';
import type { IfcFontVariant } from '../types/IfcFontVariant.js';
import type { IfcFontWeight } from '../types/IfcFontWeight.js';
import type { IfcSizeSelect } from '../selects/IfcSizeSelect.js';

export interface IfcTextStyleFontModel extends IfcPreDefinedTextFont {
  FontFamily: IfcTextFontName[];
  FontStyle?: IfcFontStyle | null;
  FontVariant?: IfcFontVariant | null;
  FontWeight?: IfcFontWeight | null;
  FontSize: IfcSizeSelect;
}
