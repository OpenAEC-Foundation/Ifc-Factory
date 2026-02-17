import type { IfcLightSource } from './IfcLightSource.js';
import type { IfcAxis2Placement3D } from './IfcAxis2Placement3D.js';
import type { IfcColourRgb } from './IfcColourRgb.js';
import type { IfcThermodynamicTemperatureMeasure } from '../types/IfcThermodynamicTemperatureMeasure.js';
import type { IfcLuminousFluxMeasure } from '../types/IfcLuminousFluxMeasure.js';
import type { IfcLightEmissionSourceEnum } from '../enums/IfcLightEmissionSourceEnum.js';
import type { IfcLightDistributionDataSourceSelect } from '../selects/IfcLightDistributionDataSourceSelect.js';

export interface IfcLightSourceGoniometric extends IfcLightSource {
  Position: IfcAxis2Placement3D;
  ColourAppearance?: IfcColourRgb | null;
  ColourTemperature: IfcThermodynamicTemperatureMeasure;
  LuminousFlux: IfcLuminousFluxMeasure;
  LightEmissionSource: IfcLightEmissionSourceEnum;
  LightDistributionDataSource: IfcLightDistributionDataSourceSelect;
}
