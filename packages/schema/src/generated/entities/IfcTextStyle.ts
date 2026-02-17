import type { IfcPresentationStyle } from './IfcPresentationStyle.js';
import type { IfcTextStyleForDefinedFont } from './IfcTextStyleForDefinedFont.js';
import type { IfcTextStyleTextModel } from './IfcTextStyleTextModel.js';
import type { IfcTextFontSelect } from '../selects/IfcTextFontSelect.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcTextStyle extends IfcPresentationStyle {
  TextCharacterAppearance?: IfcTextStyleForDefinedFont | null;
  TextStyle?: IfcTextStyleTextModel | null;
  TextFontStyle: IfcTextFontSelect;
  ModelOrDraughting?: IfcBoolean | null;
}
