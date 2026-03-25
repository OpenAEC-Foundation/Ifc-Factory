# Wereldwijd Overzicht van IFC Property Sets (PSETs)

> **Datum:** 25 maart 2026
> **Doel:** Volledig overzicht van alle bekende Property Sets (PSETs) die wereldwijd zijn ontwikkeld voor IFC (Industry Foundation Classes)

---

## Inhoudsopgave

1. [Officiële buildingSMART PSETs (IFC4x3)](#1-officiële-buildingsmart-psets-ifc4x3)
2. [Nationale en Regionale PSETs](#2-nationale-en-regionale-psets)
3. [Sectorspecifieke PSETs](#3-sectorspecifieke-psets)
4. [Open-source PSET-bibliotheken](#4-open-source-pset-bibliotheken)
5. [buildingSMART Data Dictionary (bSDD)](#5-buildingsmart-data-dictionary-bsdd)
6. [Bronnen](#6-bronnen)

---

## 1. Officiële buildingSMART PSETs (IFC4x3)

De IFC 4.3.2-standaard bevat **645 voorgedefinieerde Property Sets** en meer dan **2500 individuele properties** georganiseerd in meer dan **750 sets** (inclusief Quantity Sets). Deze volgen de naamgevingsconventie `Pset_Xxx` en zijn onderdeel van de ISO 16739-1:2024-standaard.

### 1.1 Gebouwelementen (IfcSharedBldgElements) - ~17 PSETs

| Property Set | Toepassing | Belangrijke Properties |
|---|---|---|
| **Pset_WallCommon** | IfcWall | Reference, IsExternal, LoadBearing, FireRating, ThermalTransmittance, AcousticRating |
| **Pset_DoorCommon** | IfcDoor | Reference, IsExternal, FireRating, AcousticRating, SecurityRating, HandicapAccessible |
| **Pset_WindowCommon** | IfcWindow | Reference, IsExternal, FireRating, AcousticRating, ThermalTransmittance, GlazingAreaFraction |
| **Pset_SlabCommon** | IfcSlab | Reference, IsExternal, LoadBearing, FireRating, AcousticRating, ThermalTransmittance |
| **Pset_BeamCommon** | IfcBeam | Reference, IsExternal, LoadBearing, FireRating, Slope, Roll, Span |
| **Pset_ColumnCommon** | IfcColumn | Reference, IsExternal, LoadBearing, FireRating, Slope |
| **Pset_RoofCommon** | IfcRoof | Reference, IsExternal, FireRating, ThermalTransmittance, ProjectedArea, TotalArea |
| **Pset_StairCommon** | IfcStair | Reference, FireRating, NumberOfRiser, NumberOfTreads, RiserHeight, TreadLength |
| **Pset_RampCommon** | IfcRamp | Reference, FireRating, HandicapAccessible |
| **Pset_RailingCommon** | IfcRailing | Reference, IsExternal, Height |
| **Pset_CurtainWallCommon** | IfcCurtainWall | Reference, IsExternal, FireRating, AcousticRating, ThermalTransmittance |
| **Pset_PlateCommon** | IfcPlate | Reference, IsExternal, LoadBearing, FireRating, AcousticRating |
| **Pset_MemberCommon** | IfcMember | Reference, IsExternal, LoadBearing, FireRating, Slope, Roll, Span |
| **Pset_CoveringCommon** | IfcCovering | Reference, IsExternal, FireRating, AcousticRating, FlammabilityRating |
| **Pset_FootingCommon** | IfcFooting | Reference, LoadBearing |

### 1.2 Ruimtelijke Elementen en Gebouw

| Property Set | Toepassing | Belangrijke Properties |
|---|---|---|
| **Pset_BuildingCommon** | IfcBuilding | BuildingID, IsPermanentID, OccupancyType, YearOfConstruction, IsLandmarked |
| **Pset_BuildingStoreyCommon** | IfcBuildingStorey | EntranceLevel, AboveGround, SprinklerProtection, GrossAreaPlanned, NetAreaPlanned |
| **Pset_BuildingUse** | IfcBuilding | MarketCategory, MarketSubCategory, NaicsCode, NaicsDescription |
| **Pset_SiteCommon** | IfcSite | BuildableArea, TotalArea, BuildingHeightLimit |
| **Pset_SpaceCommon** | IfcSpace | Reference, IsExternal, GrossPlannedArea, NetPlannedArea, PubliclyAccessible, HandicapAccessible |
| **Pset_SpaceOccupancyRequirements** | IfcSpace | OccupancyType, OccupancyNumber, OccupancyNumberPeak, AreaPerOccupant |
| **Pset_SpaceThermalRequirements** | IfcSpace | SpaceTemperature, SpaceHumidity, NaturalVentilation, MechanicalVentilation |
| **Pset_SpaceThermalLoad** | IfcSpace | People, Lighting, EquipmentSensible, EquipmentLatent, VentilationIndoorAir |
| **Pset_SpaceThermalDesign** | IfcSpace | CoolingDesignAirFlow, HeatingDesignAirFlow |
| **Pset_SpaceFireSafetyRequirements** | IfcSpace | FireRiskFactor, FlammableStorage, FireExit, SprinklerProtection |
| **Pset_SpaceLightingRequirements** | IfcSpace | ArtificialLighting, Illuminance |
| **Pset_SpaceParking** | IfcSpace | ParkingUse, HandicapAccessible |
| **Pset_ZoneCommon** | IfcZone | Reference, IsExternal, GrossPlannedArea, NetPlannedArea |

### 1.3 HVAC-domein (IfcHvacDomain) - ~103 PSETs

| Property Set | Toepassing | Belangrijke Properties |
|---|---|---|
| **Pset_AirTerminalTypeCommon** | IfcAirTerminal | Reference, Status, AirFlowrateRange, TemperatureRange, FaceType |
| **Pset_AirTerminalBoxTypeCommon** | IfcAirTerminalBox | Reference, Status, AirFlowrateRange |
| **Pset_BoilerTypeCommon** | IfcBoiler | Reference, Status, PressureRating, OperatingMode, HeatTransferSurface |
| **Pset_ChillerTypeCommon** | IfcChiller | Reference, Status, NominalCapacity, NominalEfficiency |
| **Pset_CoilTypeCommon** | IfcCoil | Reference, Status, NominalUA, OperationalTemperatureRange |
| **Pset_CompressorTypeCommon** | IfcCompressor | Reference, Status, PowerSource, RefrigerantClass |
| **Pset_CondenserTypeCommon** | IfcCondenser | Reference, Status, RefrigerantClass |
| **Pset_CoolingTowerTypeCommon** | IfcCoolingTower | Reference, Status, NominalCapacity |
| **Pset_DuctFittingTypeCommon** | IfcDuctFitting | Reference, Status, PressureClass |
| **Pset_DuctSegmentTypeCommon** | IfcDuctSegment | Reference, Status, Shape, NominalDiameter |
| **Pset_DuctSilencerTypeCommon** | IfcDuctSilencer | Reference, Status |
| **Pset_EvaporativeCoolerTypeCommon** | IfcEvaporativeCooler | Reference, Status, FlowArrangement |
| **Pset_EvaporatorTypeCommon** | IfcEvaporator | Reference, Status, EvaporatorMediumType, RefrigerantClass |
| **Pset_FanTypeCommon** | IfcFan | Reference, Status, MotorDriveType |
| **Pset_FilterTypeCommon** | IfcFilter | Reference, Status, Weight, FinalResistance |
| **Pset_HeatExchangerTypeCommon** | IfcHeatExchanger | Reference, Status, HeatTransferType |
| **Pset_HumidifierTypeCommon** | IfcHumidifier | Reference, Status, Application |
| **Pset_PipeSegmentTypeCommon** | IfcPipeSegment | Reference, Status, NominalDiameter, WorkingPressure |
| **Pset_PipeFittingTypeCommon** | IfcPipeFitting | Reference, Status, PressureClass |
| **Pset_PumpTypeCommon** | IfcPump | Reference, Status, FlowRateRange, ConnectionSize |
| **Pset_TankTypeCommon** | IfcTank | Reference, Status, NominalCapacity, AccessType |
| **Pset_ValveTypeCommon** | IfcValve | Reference, Status, ValveMechanism, ValvePattern, Size |
| **Pset_SpaceThermalPHistory** | IfcSpace | Temperatuur- en klimaathistorie |
| **Pset_DuctFittingPHistory** | IfcDuctFitting | LossCoefficient (drukverlies) |

### 1.4 Elektrotechnisch Domein (IfcElectricalDomain) - ~33 PSETs

| Property Set | Toepassing | Belangrijke Properties |
|---|---|---|
| **Pset_ElectricalDeviceCommon** | Alle elektrische apparaten | RatedCurrent, RatedVoltage, NominalFrequencyRange, PowerFactor |
| **Pset_CableCarrierSegmentTypeCommon** | IfcCableCarrierSegment | Reference, Status, NominalHeight, NominalWidth |
| **Pset_CableSegmentTypeCommon** | IfcCableSegment | Reference, Status, StandardUsed |
| **Pset_ElectricMotorTypeCommon** | IfcElectricMotor | Reference, Status, MaximumPowerOutput, ElectricMotorEfficiency |
| **Pset_ElectricGeneratorTypeCommon** | IfcElectricGenerator | Reference, Status, ElectricGeneratorEfficiency |
| **Pset_JunctionBoxTypeCommon** | IfcJunctionBox | Reference, Status, NumberOfGangs |
| **Pset_LampTypeCommon** | IfcLamp | Reference, Status, ContributedLuminousFlux, LampMaintenanceFactor |
| **Pset_LightFixtureTypeCommon** | IfcLightFixture | Reference, Status, NumberOfSources, TotalWattage |
| **Pset_OutletTypeCommon** | IfcOutlet | Reference, Status, NumberOfSockets |
| **Pset_ProtectiveDeviceTrippingUnitTypeCommon** | IfcProtectiveDeviceTrippingUnit | Reference, Status |
| **Pset_SwitchingDeviceTypeCommon** | IfcSwitchingDevice | Reference, Status, NumberOfGangs, SwitchFunction |
| **Pset_TransformerTypeCommon** | IfcTransformer | Reference, Status, PrimaryVoltage, SecondaryVoltage |

### 1.5 Gebouwautomatisering (IfcBuildingControlsDomain)

| Property Set | Toepassing | Belangrijke Properties |
|---|---|---|
| **Pset_ActuatorTypeCommon** | IfcActuator | Reference, Status, FailPosition |
| **Pset_AlarmTypeCommon** | IfcAlarm | Reference, Status |
| **Pset_ControllerTypeCommon** | IfcController | Reference, Status, ControlType |
| **Pset_SensorTypeCommon** | IfcSensor | Reference, Status, SetPointConcentration |

### 1.6 Sanitair en Brandbeveiliging (IfcPlumbingFireProtectionDomain)

| Property Set | Toepassing | Belangrijke Properties |
|---|---|---|
| **Pset_FireSuppressionTerminalTypeCommon** | IfcFireSuppressionTerminal | Reference, Status |
| **Pset_SanitaryTerminalTypeCommon** | IfcSanitaryTerminal | Reference, Status |
| **Pset_WasteTerminalTypeCommon** | IfcWasteTerminal | Reference, Status |
| **Pset_StackTerminalTypeCommon** | IfcStackTerminal | Reference, Status |
| **Pset_InterceptorTypeCommon** | IfcInterceptor | Reference, Status, NominalBodyLength |

### 1.7 Architectuurdomein (IfcArchitectureDomain)

| Property Set | Toepassing | Belangrijke Properties |
|---|---|---|
| **Pset_DoorWindowGlazingType** | Glas in deuren/ramen | GlassLayers, GlassThickness, GlassColour, IsTempered, IsLaminated |
| **Pset_DoorWindowShadingType** | Zonwering | ShadingDeviceType, ExternalShadingCoefficient |
| **Pset_WindowPanelProperties** | Raampanelen | OperationType, PanelPosition, FrameDepth, FrameThickness |
| **Pset_DoorPanelProperties** | Deurpanelen | PanelDepth, PanelOperation, PanelWidth, PanelPosition |

### 1.8 Facility Management (IfcSharedFacilitiesElements)

| Property Set | Toepassing | Belangrijke Properties |
|---|---|---|
| **Pset_ManufacturerTypeInformation** | Alle IFC-entiteiten | GlobalTradeItemNumber, ArticleNumber, ModelReference, ModelLabel, Manufacturer |
| **Pset_ManufacturerOccurrence** | Product-exemplaren | SerialNumber, BatchReference, AssemblyPlace |
| **Pset_Warranty** | IfcProduct, IfcSystem | WarrantyIdentifier, WarrantyStartDate, WarrantyEndDate, WarrantyPeriod, WarrantyContent |
| **Pset_ServiceLife** | IfcElement | ServiceLifeDuration, MeanTimeBetweenFailure |
| **Pset_Condition** | IfcElement | AssessmentDate, AssessmentCondition, AssessmentDescription |
| **Pset_Asset** | IfcAsset | AssetAccountingType, AssetTaxType, DepreciationRateOfReturn |
| **Pset_FurnitureTypeCommon** | IfcFurniture | Reference, IsBuiltIn, MainColour, Style |

### 1.9 Distributiesystemen

| Property Set | Toepassing | Belangrijke Properties |
|---|---|---|
| **Pset_DistributionPortCommon** | IfcDistributionPort | PortNumber, ConnectionType, FlowDirection |
| **Pset_DistributionSystemCommon** | IfcDistributionSystem | Reference |
| **Pset_DistributionChamberElementTypeCommon** | IfcDistributionChamberElement | Reference, Status |
| **Pset_FlowMeterTypeCommon** | IfcFlowMeter | Reference, Status |

### 1.10 Algemene/Gemeenschappelijke PSETs

| Property Set | Toepassing | Belangrijke Properties |
|---|---|---|
| **Pset_Address** | IfcActor, IfcSite | Purpose, Description, AddressLines, Town, Region, PostalCode, Country |
| **Pset_MaterialCommon** | IfcMaterial | MolecularWeight, Porosity, MassDensity |
| **Pset_MaterialConcrete** | IfcMaterial (beton) | CompressiveStrength, MaxAggregateSize, AdmixturesDescription |
| **Pset_MaterialSteel** | IfcMaterial (staal) | YieldStress, UltimateStress, UltimateStrain, HardeningModule |
| **Pset_MaterialWood** | IfcMaterial (hout) | Species, StrengthGrade, MoistureContent |
| **Pset_ProfileMechanical** | IfcProfileDef | MassPerLength, CrossSectionArea, MomentOfInertiaY, MomentOfInertiaZ |
| **Pset_EnvironmentalImpactIndicators** | Alle elementen | ExpectedServiceLife, TotalPrimaryEnergyConsumption, WaterConsumption |
| **Pset_EnvironmentalImpactValues** | Alle elementen | TotalPrimaryEnergyConsumption, NonRenewableEnergyConsumption |
| **Pset_Risk** | IfcGroup | RiskType, NatureOfRisk, RiskRating, RiskOwner |

### 1.11 Infrastructuur-PSETs (nieuw in IFC4x3)

| Property Set | Toepassing | Belangrijke Properties |
|---|---|---|
| **Pset_BridgeCommon** | IfcBridge | StructureIndicator |
| **Pset_RoadCommon** | IfcRoad | Reference |
| **Pset_RailwayCommon** | IfcRailway | Reference |
| **Pset_MarineFacilityCommon** | IfcMarineFacility | Reference |
| **Pset_ConcreteElementGeneral** | Betonnen infra-elementen | ConstructionMethod, StructuralClass, ExposureClass |
| **Pset_PrecastConcreteElementGeneral** | Prefab beton | TypeDesignator, CornerChamfer |
| **Pset_ReinforcementBarPitchOfBeam** | Wapening balken | Description, Reference |
| **Pset_ReinforcementBarPitchOfColumn** | Wapening kolommen | Description, Reference |
| **Pset_ReinforcementBarPitchOfSlab** | Wapening vloeren | Description, Reference |
| **Pset_ReinforcementBarPitchOfWall** | Wapening wanden | Description, Reference |
| **Pset_EarthworksCutCommon** | IfcEarthworksCut | Reference |
| **Pset_EarthworksFillCommon** | IfcEarthworksFill | Reference |
| **Pset_CourseCommon** | IfcCourse | Reference (wegverharding) |
| **Pset_PavementCommon** | IfcPavement | Reference |
| **Pset_KerbCommon** | IfcKerb | Reference (trottoirband) |
| **Pset_SignCommon** | IfcSign | Reference (verkeersbord) |
| **Pset_SignalCommon** | IfcSignal | Reference (signaal) |

---

## 2. Nationale en Regionale PSETs

### 2.1 Nederland

#### BIM Basis ILS (Informatie Leverings Specificatie)

- **Organisatie:** digiGO (voorheen BIM Loket)
- **Doel:** Basisafspraken voor BIM-informatieuitwisseling in de Nederlandse bouwsector
- **Standaard:** Gebaseerd op IFC en NL/SfB classificatie
- **Bron:** [digiGO BIM Basis ILS](https://www.digigo.nu/ilsen-en-richtlijnen/bim-basis-ils/)

**Vereiste Properties (BIM Basis ILS):**

| Property | Pset | Omschrijving |
|---|---|---|
| LoadBearing | Pset_*Common | Draagconstructie (True/False) |
| IsExternal | Pset_*Common | Uitwendig element (True/False) |
| FireRating | Pset_*Common | WBDBO-waarde (brandwerendheid) |
| Material | IfcMaterial | Materiaal toewijzing verplicht |
| NL/SfB-classificatie | IfcClassification | Elementcode volgens NL/SfB |

#### NL/SfB Classificatiesysteem

- **Organisatie:** BIM Loket / Stichting STABU
- **Doel:** Nederlandse vertaling van het internationale CI/SfB-classificatiesysteem
- **Toepassing:** 4-cijferige codering van bouwelementen (bijv. 21 = buitenwanden, 22 = binnenwanden)
- **Bron:** [Verifi3D NL/SfB](https://verifi3d.xinaps.com/verifi3d-supports-nl-sfb-the-dutch-classification-for-building-components/)

#### NLRS (Nederlandse Revit Standaarden)

- **Organisatie:** Stichting Revit Standards
- **Doel:** Standaard Revit-templates met IFC-export conform BIM Basis ILS
- **Toepassing:** Gestandaardiseerde parameter-naamgeving voor IFC-export
- **Bron:** [Revit Standards](https://www.revitstandards.org/en/about/projects/basis-ils/)

#### CB-NL (Conceptenbibliotheek Nederland)

- **Organisatie:** digiGO
- **Doel:** Nationale conceptenbibliotheek als linked-data platform
- **Toepassing:** Koppeling van begrippen uit verschillende standaarden (NL/SfB, ETIM, RAW, STABU)

### 2.2 Verenigd Koninkrijk

#### NBS BIM Object Standard

- **Organisatie:** NBS (National Building Specification)
- **Doel:** Kwaliteitsstandaard voor BIM-objecten met IFC property sets
- **Versie:** v2.1
- **Bron:** [NBS BIM Object Standard](https://source.thenbs.com/bimlibrary/nbs-bim-object-standard)

**Vereiste Property Sets:**

| Property Set | Omschrijving |
|---|---|
| Pset_*Common (IFC4) | Standaard IFC common property sets per elementtype |
| Pset_BuildingElementProxyCommon | Fallback als geen specifieke Pset beschikbaar |
| COBie_Component | COBie componentgegevens |
| COBie_Type | COBie type-informatie |
| NBS_Properties | NBS-specifieke eigenschappen |

#### COBie UK (Construction Operations Building Information Exchange)

- **Organisatie:** UK Government / BS 1192-4
- **Doel:** Informatieoverdracht naar Facility Management
- **Standaard:** BS 1192-4:2014
- **Bron:** [COBie Designing Buildings](https://www.designingbuildings.co.uk/wiki/COBie)

**COBie Property Sets:**

| Property Set | Omschrijving |
|---|---|
| COBie_Facility | Gebouwinformatie |
| COBie_Floor | Verdiepingsgegevens |
| COBie_Space | Ruimte-informatie |
| COBie_Type | Objecttype-informatie (Manufacturer, ModelNumber, Warranty) |
| COBie_Component | Componentgegevens (SerialNumber, InstallationDate) |
| COBie_System | Systeemtoewijzing |
| COBie_Spare | Reserveonderdelen |
| COBie_Resource | Middelen |
| COBie_Job | Onderhoudstaken |

#### Uniclass 2015

- **Organisatie:** NBS / CPIC
- **Doel:** Classificatiesysteem voor de gehele gebouwde omgeving
- **Toepassing:** Classificatie via IfcClassification en IfcClassificationReference
- **Categorieën:** Ss (Systems), Pr (Products), EF (Entities/Facilities), SL (Spaces/Locations)

#### PAS 1192 / ISO 19650

- **Organisatie:** BSI (British Standards Institution)
- **Doel:** Informatiemanagement gedurende de gehele levenscyclus van bouwwerken
- **Opvolger:** ISO 19650-serie (internationaal)

### 2.3 Duitsland

#### DIN BIM Cloud

- **Organisatie:** DIN (Deutsches Institut für Normung) / Dr. Schiller & Partner
- **Doel:** Database met gestandaardiseerde kenmerken (Merkmale) voor BIM-modellen
- **Beschikbaar sinds:** Eind 2019
- **Dekking:** Hochbau, Tiefbau, Technische Gebäudeausrüstung (TGA)
- **Bron:** [DIN BIM Cloud](https://www.dinmedia.de/en/topics/bim/din-bim-cloud)

**Belangrijke classificaties in DIN BIM Cloud:**

| Standaard | Toepassing |
|---|---|
| DIN 276 | Kostengroepen (Bouwkosten) |
| DIN 277 | Grundflächen und Rauminhalte (Oppervlakten en volumes) |
| DIN 18599 | Energetische Bewertung (Energieprestatie) |
| DIN 4108 | Wärmeschutz (Warmtebescherming) |
| DIN 4109 | Schallschutz (Geluidsisolatie) |

#### VDI 2552 BIM-richtlijnenserie

- **Organisatie:** VDI (Verein Deutscher Ingenieure)
- **Doel:** Uniforme toepassing van BIM in Duitsland
- **Bron:** [VDI 2552](https://www.vdi.de/mitgliedschaft/vdi-richtlinien/unsere-richtlinien-highlights/vdi-2552)

| Blad | Onderwerp |
|---|---|
| VDI 2552 Blatt 1 | BIM Grondbegrippen |
| VDI 2552 Blatt 9 | Classificatiesystemen |
| VDI 2552 Blatt 12 | BIM-toepassingsgevallen metadata |

#### CAFM-Connect

- **Organisatie:** CAFM Ring e.V.
- **Doel:** Standaard voor data-uitwisseling van facilitaire gegevens op basis van IFC4
- **Bron:** [GitHub CAFM-Connect](https://github.com/CAFM-Connect/CAFM-Connect)

**BIM-Profielen (CAFM-Connect):**

| Classificatie | Bron |
|---|---|
| CAFM-Connect objecttypen | CAFM-Connect standaard |
| DIN 276 kostengroepen | DIN 276 |
| GEFMA 198 documenttypen | GEFMA standaard |
| GEFMA 924.10 gebouwtypen | GEFMA standaard |
| GEFMA 924.60 FM-documentatie | GEFMA standaard |

#### BIM-Merkmalserver

- **Organisatie:** BIM & More
- **Doel:** Server voor het beheren van gestandaardiseerde BIM-kenmerken
- **Toepassing:** Koppeling tussen DIN BIM Cloud en projectspecifieke kenmerken

### 2.4 Frankrijk

#### PPBIM (Propriétés et Performance BIM)

- **Organisatie:** Afnor (Commission PPBIM)
- **Doel:** Standaard voor het definiëren van producteigenschappen in BIM
- **Standaard:** XP P07-150 (december 2014)
- **Bron:** [Plan BIM 2022](https://plan-bim-2022.fr/actions/ptnb-axe-c-la-normalisation/la-normalisation/)

**Kenmerken:**

| Aspect | Omschrijving |
|---|---|
| Methodologie | Geharmoniseerd referentiesysteem voor producteigenschappen |
| Normkader | Gebaseerd op XP P07-150 en ISO 23386 |
| Toepassingsgebied | Bouwproducten en -materialen |
| Relatie tot IFC | Uitbreiding en lokalisatie van IFC property sets |

### 2.5 Scandinavië (Nordic)

#### Finland - COBIM (Common BIM Requirements)

- **Organisatie:** buildingSMART Finland / Senate Properties
- **Doel:** Nationale BIM-richtlijnen (13 series)
- **Versie:** COBIM 2012 v1.0
- **Bron:** [buildingSMART Finland COBIM](https://wiki.buildingsmart.fi/en/04_Guidelines_and_Standards/COBIM_Requirements)

**COBIM-series:**

| Serie | Onderwerp |
|---|---|
| Serie 1 | Algemene BIM-eisen |
| Serie 2 | Modellering startfase |
| Serie 3 | Architectonisch ontwerp |
| Serie 4 | MEP-ontwerp |
| Serie 5 | Constructief ontwerp |
| Serie 6 | Kwaliteitsborging |
| Serie 7-13 | Hoeveelheden, visualisatie, analyse, etc. |

#### Noorwegen

- **Organisatie:** Statsbygg, buildingSMART Norge
- **Doel:** IFC-verplichting voor alle openbare projecten sinds 2010
- **Bijzonderheid:** Noorwegen is onafhankelijk lid van buildingSMART International

#### Denemarken

- **Organisatie:** cuneco / Molio
- **Doel:** IFC-verplichting voor publiek gefinancierde projecten sinds 2010
- **Classificatie:** CCS (cuneco Classification System)

#### Zweden

- **Organisatie:** OpenBIM / BIM Alliance Sweden
- **Doel:** Nationale BIM-richtlijnen met IFC als uitwisselingsformaat
- **Classificatie:** CoClass (Construction Classification)

### 2.6 Verenigde Staten

#### NBIMS-US (National BIM Standard United States)

- **Organisatie:** NIBS (National Institute of Building Sciences)
- **Doel:** Nationaal BIM-standaardkader
- **Versie:** NBIMS-US V4
- **Bron:** [NIBS NBIMS](https://nibs.org/nbims/v4/faqs/)

#### COBie US

- **Organisatie:** USACE (U.S. Army Corps of Engineers) / GSA
- **Doel:** Verplichte FM-data overdracht voor federale projecten
- **Bron:** [WBDG COBie](https://www.wbdg.org/bim/cobie)

**COBie-vereisten (USACE):**

| Vereiste | Omschrijving |
|---|---|
| IFC Property Set Data | Export voor alle IFC-ondersteunde elementen |
| Equipment Data | Gedetailleerde apparatuurgegevens |
| Warranty Data | Garantie-informatie |
| O&M Information | Onderhoudsinformatie |
| FM Integration | Koppeling met TRIRIGA, BUILDER, Maximo |

#### GSA (General Services Administration)

- **Organisatie:** U.S. GSA
- **Doel:** BIM-vereisten voor federale gebouwen
- **Bijzonderheid:** COBie verplicht als deliverable sinds 2017

#### OmniClass

- **Organisatie:** CSI / CSC
- **Doel:** Classificatiesysteem voor de Noord-Amerikaanse bouwsector
- **Gebaseerd op:** ISO 12006-2
- **Bron:** [WBDG OmniClass](https://www.wbdg.org/resources/omniclass)

**OmniClass-tabellen:**

| Tabel | Onderwerp |
|---|---|
| Tabel 21 | Elements (vergelijkbaar met UniFormat) |
| Tabel 22 | Work Results (vergelijkbaar met MasterFormat) |
| Tabel 23 | Products |
| Tabel 11 | Facility Use |
| Tabel 12 | Facility Spaces |
| Tabel 13 | Spaces by Function |
| Tabel 14 | Spaces by Form |

#### UniFormat / MasterFormat

- **Organisatie:** CSI (Construction Specifications Institute)
- **UniFormat:** Classificatie op basis van bouwelementen en systemen
- **MasterFormat:** Classificatie op basis van werkresultaten en specificaties

### 2.7 Singapore

#### IFC-SG / CORENET X

- **Organisatie:** BCA (Building and Construction Authority)
- **Doel:** Verplichte BIM-indiening voor bouwvergunningen via IFC-SG
- **Standaard:** IFC4 Reference View + Singapore-specifieke extensies (SGPsets)
- **Bron:** [CORENET X](https://info.corenet.gov.sg)

**Singapore-specifieke Property Sets (SGPsets) - 700+ parameters:**

| SGPset | Toepassing | Belangrijke Properties |
|---|---|---|
| **SGPset_Door** | Deuren | Singapore-specifieke deurkenmerken voor regelgeving |
| **SGPset_Wall** | Wanden | Wandeigenschappen voor brandveiligheid en bouwverordening |
| **SGPset_SpaceDimension** | Ruimten | Ruimtedimensies voor plantoetsing |
| **SGPset_Window** | Ramen | Raamkenmerken voor ventilatieberekening |
| **SGPset_Staircase** | Trappen | Trapkenmerken voor vluchtwegentoets |
| **SGPset_Ramp** | Hellingbanen | Toegankelijkheidseisen |
| **SGPset_Building** | Gebouw | Algemene gebouwgegevens voor vergunningaanvraag |
| **SGPset_BuildingStorey** | Bouwlaag | Bouwlaaggegevens per verdieping |

**Regulerende instanties met eigen parameters:**

| Instantie | Domein |
|---|---|
| BCA | Bouwveiligheid en structurele integriteit |
| SCDF | Brandveiligheid |
| PUB | Watervoorziening en riolering |
| LTA | Verkeersinfrastructuur |
| NParks | Groenvoorziening |
| URA | Stedenbouwkundige plantoetsing |

### 2.8 Australië en Nieuw-Zeeland

#### NATSPEC / Open BIM Object Standard (OBOS)

- **Organisatie:** NATSPEC (Australië) / MasterSpec (Nieuw-Zeeland)
- **Doel:** Open BIM-objectstandaard gebaseerd op IFC
- **Bron:** [NATSPEC BIM](https://bim.natspec.org/documents/au-bim-standards)

**Vereiste Properties (OBOS):**

| Categorie | Omschrijving |
|---|---|
| IFC Properties (Tabel 4A) | Verplichte set IFC-eigenschappen voor alle objecten |
| IFC4 Add2 Properties | IFC-properties hebben voorrang boven andere bronnen |
| NATSPEC BIM Properties Generator | Tool voor het genereren van property-templates |
| Uniclass/OmniClass mapping | Classificatieafstemming |

#### buildingSMART Australasia

- **Organisatie:** buildingSMART Australasia
- **Doel:** Bevordering van openBIM-standaarden in Australië en Nieuw-Zeeland
- **Bron:** [buildingSMART Australasia](https://www.buildingsmart.org/community/chapter-directory/buildingsmart-australasia/)

### 2.9 China

#### CN-IFC

- **Organisatie:** buildingSMART China
- **Doel:** Chinese vertaling en uitbreiding van IFC4.3
- **Publicatie:** Juni 2022, samengesteld door meer dan 100 organisaties
- **Standaard:** GB/T 51447-2021 (BIM Storage Standard, geïmplementeerd januari 2022)

**Kenmerken:**

| Aspect | Omschrijving |
|---|---|
| Basis | Vertaling van IFC4.3 |
| Uitbreidingen | Chinese lokale vereisten |
| bSDD-integratie | Koppeling met buildingSMART Data Dictionary |
| Normkader | GB/T 51447-2021 |
| Toepassingen | Kadaster (3D), eigendomsregistratie, bouwvergunningen |

### 2.10 Japan

#### MLIT BIM-standaard

- **Organisatie:** MLIT (Ministry of Land, Infrastructure, Transport and Tourism)
- **Doel:** Verplichte BIM voor alle openbare werken vanaf 2023
- **Status:** "BIM-based Drawing Check" vanaf 2025 (IFC + PDF)
- **Planning:** Landelijke BIM Data Check op basis van IFC-gegevens richting 2027

**Kenmerken:**

| Aspect | Omschrijving |
|---|---|
| Indiening | IFC-gegevens + 2D PDF gegenereerd uit BIM |
| Doel | Eliminatie van handmatige kruiscontrole van tekeningen |
| Toekomst | Volledig geautomatiseerde bouwcodecontrole op IFC |

### 2.11 Zuid-Korea

#### KBIMS (Korea BIM Standard)

- **Organisatie:** Korea Institute of Construction Technology
- **Doel:** Nationale BIM-bibliotheek en IFC property name conversie
- **Bron:** [Korea Science KBIMS](https://koreascience.kr/article/JAKO202008540579302.page)

**Kenmerken:**

| Aspect | Omschrijving |
|---|---|
| Bibliotheek | 12 categorieën, 793 elementen |
| Data | Geometrische en numerieke gegevens |
| IFC-conversie | Speciale naamgevingssystemen met ASCII-code mapping |
| Toepassingen | BIM-based Building Permit System |

---

## 3. Sectorspecifieke PSETs

### 3.1 Infrastructuur (Bruggen, Wegen, Tunnels, Spoor)

IFC4x3 heeft uitgebreide ondersteuning voor infrastructuur toegevoegd:

#### Bruggen (IfcBridge)

| Property Set | Toepassing |
|---|---|
| Pset_BridgeCommon | Algemene brugeigenschappen |
| Pset_BridgePartCommon | Brugonderdelen |
| Pset_ConcreteElementGeneral | Betonnen constructie-elementen |
| Pset_PrecastConcreteElementGeneral | Prefab betonelementen |

#### Wegen (IfcRoad)

| Property Set | Toepassing |
|---|---|
| Pset_RoadCommon | Algemene wegeigenschappen |
| Pset_PavementCommon | Verhardingseigenschappen |
| Pset_CourseCommon | Weglagen |
| Pset_KerbCommon | Trottoirbanden |
| Pset_EarthworksCutCommon | Grondwerk (ontgraving) |
| Pset_EarthworksFillCommon | Grondwerk (ophoging) |
| Pset_SignCommon | Verkeersborden |
| Pset_SignalCommon | Verkeersignalen |

#### Spoorwegen (IfcRailway)

| Property Set | Toepassing |
|---|---|
| Pset_RailwayCommon | Algemene spoorwegeigenschappen |
| Pset_RailCommon | Spooreigenschappen |

#### Maritiem (IfcMarineFacility)

| Property Set | Toepassing |
|---|---|
| Pset_MarineFacilityCommon | Havenfaciliteiten |

### 3.2 MEP / HVAC

De IFC HVAC-domein bevat de meeste property sets van alle domeinen (~103 PSETs). Belangrijke categorieën:

| Categorie | Voorbeelden van PSETs | Aantal |
|---|---|---|
| **Luchtbehandeling** | Pset_AirTerminalTypeCommon, Pset_AirToAirHeatRecoveryTypeCommon | ~15 |
| **Verwarming** | Pset_BoilerTypeCommon, Pset_SpaceHeaterTypeCommon | ~10 |
| **Koeling** | Pset_ChillerTypeCommon, Pset_CoolingTowerTypeCommon, Pset_CondenserTypeCommon | ~10 |
| **Leidingwerk** | Pset_PipeSegmentTypeCommon, Pset_PipeFittingTypeCommon, Pset_ValveTypeCommon | ~15 |
| **Kanaalwerk** | Pset_DuctSegmentTypeCommon, Pset_DuctFittingTypeCommon, Pset_DuctSilencerTypeCommon | ~10 |
| **Pompen/Ventilatoren** | Pset_PumpTypeCommon, Pset_FanTypeCommon, Pset_CompressorTypeCommon | ~10 |
| **Overig** | Pset_FilterTypeCommon, Pset_HumidifierTypeCommon, Pset_TankTypeCommon | ~33 |

### 3.3 Constructief (Structural Engineering)

| Property Set | Toepassing | Belangrijke Properties |
|---|---|---|
| Pset_BeamCommon | Balken | LoadBearing, Span, Slope, Roll |
| Pset_ColumnCommon | Kolommen | LoadBearing, Slope |
| Pset_SlabCommon | Vloerplaten | LoadBearing, FireRating |
| Pset_FootingCommon | Funderingen | LoadBearing |
| Pset_PileCommon | Palen | LoadBearing |
| Pset_ConcreteElementGeneral | Betonconstructies | ConstructionMethod, StrengthClass, ExposureClass |
| Pset_PrecastConcreteElementGeneral | Prefab beton | TypeDesignator, CornerChamfer |
| Pset_ReinforcementBarPitchOfBeam | Wapening balken | Stafverdeling |
| Pset_ReinforcementBarPitchOfColumn | Wapening kolommen | Stafverdeling |
| Pset_ReinforcementBarPitchOfSlab | Wapening vloeren | Stafverdeling |
| Pset_ReinforcementBarPitchOfWall | Wapening wanden | Stafverdeling |
| Pset_ProfileMechanical | Staalprofielen | MassPerLength, CrossSectionArea, MomentOfInertia |
| Pset_MaterialSteel | Staaleigenschappen | YieldStress, UltimateStress, UltimateStrain |
| Pset_MaterialConcrete | Betoneigenschappen | CompressiveStrength, MaxAggregateSize |

### 3.4 Facility Management (FM)

| Property Set | Toepassing | Domein |
|---|---|---|
| Pset_ManufacturerTypeInformation | Fabrikantgegevens | Algemeen |
| Pset_ManufacturerOccurrence | Exemplaargegevens | Algemeen |
| Pset_Warranty | Garantie-informatie | FM |
| Pset_ServiceLife | Levensduurgegevens | FM |
| Pset_Condition | Conditiebeoordeling | FM |
| Pset_Asset | Activabeheer | FM |
| COBie_Type | Type-informatie (COBie) | FM |
| COBie_Component | Componentgegevens (COBie) | FM |
| COBie_System | Systeemtoewijzing (COBie) | FM |
| COBie_Spare | Reserveonderdelen (COBie) | FM |
| COBie_Job | Onderhoudstaken (COBie) | FM |
| CAFM-Connect profielen | FM-gegevens (IFC4 XML) | FM (Duitsland) |

### 3.5 Energie en Duurzaamheid

#### IFC Property Sets voor Energieanalyse

| Property Set | Toepassing | Belangrijke Properties |
|---|---|---|
| Pset_SpaceThermalRequirements | Thermische eisen | SpaceTemperature, SpaceHumidity, NaturalVentilation |
| Pset_SpaceThermalLoad | Thermische belasting | People, Lighting, EquipmentSensible, VentilationIndoorAir |
| Pset_SpaceThermalDesign | Thermisch ontwerp | CoolingDesignAirFlow, HeatingDesignAirFlow |
| Pset_EnvironmentalImpactIndicators | Milieu-impact | ExpectedServiceLife, TotalPrimaryEnergyConsumption |
| Pset_EnvironmentalImpactValues | Milieuwaarden | NonRenewableEnergyConsumption, WaterConsumption |
| Pset_MaterialCommon | Materiaaleigenschappen | MassDensity, Porosity |
| Pset_ThermalMaterialProperties | Thermische materiaaleigenschappen | ThermalConductivity, SpecificHeatCapacity |

#### BREEAM, LEED, WELL - Relatie met IFC

| Certificering | Organisatie | Relatie met IFC-PSETs |
|---|---|---|
| **BREEAM** | BRE (UK) | Energie, gezondheid, materialen, water, afval |
| **LEED** | USGBC (USA) | Energiebesparing, waterefficiëntie, materiaalgebruik |
| **WELL** | IWBI | Luchtkwaliteit, watercontrole, verlichting, comfort |
| **EDGE** | IFC (Intl Finance Corporation) | Energie, water, materialen (opkomende markten) |
| **Green Star** | GBCSA (Zuid-Afrika) | Vergelijkbaar met BREEAM/LEED |
| **Green Mark** | BCA (Singapore) | Geïntegreerd in CORENET X / IFC-SG |

> **NB:** Deze certificeringssystemen hebben geen eigen IFC-PSETs, maar gebruiken informatie uit bestaande PSETs (met name thermische, materiaal- en energiegerelateerde properties) voor hun beoordelingscriteria. Sommige organisaties werken aan bSDD-dictionaries om certificeringscriteria te koppelen aan IFC-properties.

---

## 4. Open-source PSET-bibliotheken

### 4.1 GitHub Repositories

| Repository | Organisatie | Omschrijving | URL |
|---|---|---|---|
| **IFC4.3.x-development** | buildingSMART | Ontwikkelrepository voor IFC4.3 specificatie met alle Pset-definities in Markdown | [GitHub](https://github.com/buildingSMART/IFC4.3.x-development) |
| **IFC4.3.x-output** | buildingSMART | Automatisch gegenereerde IFC4.3 output inclusief property set schemas | [GitHub](https://github.com/buildingSMART/IFC4.3.x-output) |
| **IFC** | buildingSMART | IFC-schema management en versioning repository | [GitHub](https://github.com/buildingSMART/IFC) |
| **bSDD** | buildingSMART | buildingSMART Data Dictionary documentatie en voorbeelden | [GitHub](https://github.com/buildingSMART/bSDD) |
| **NextGen-IFC** | buildingSMART | Volgende generatie IFC (inclusief discussies over Pset-naamgeving) | [GitHub](https://github.com/buildingSMART/NextGen-IFC) |
| **IfcOpenShell** | IfcOpenShell | Open source IFC-toolkit met Pset API (Python, C++) | [GitHub](https://github.com/IfcOpenShell/IfcOpenShell) |
| **BIM-Profiles** | CAFM-Connect | FM BIM-profielen als IFC4 XML-bestanden | [GitHub](https://github.com/CAFM-Connect/BIM-Profiles) |
| **CAFM-Connect** | CAFM-Connect | FM data-uitwisseling standaard op basis van IFC4 | [GitHub](https://github.com/CAFM-Connect/CAFM-Connect) |

### 4.2 IfcOpenShell PSET-API

IfcOpenShell biedt een uitgebreide API voor het werken met property sets:

| Functie | Omschrijving |
|---|---|
| `ifcopenshell.api.pset.add_pset()` | Nieuwe property set toevoegen |
| `ifcopenshell.api.pset.edit_pset()` | Bestaande property set bewerken |
| `ifcopenshell.util.element.get_pset()` | Property set uitlezen |
| Ondersteunde schemas | IFC2x3 TC1, IFC4 Add2 TC1, IFC4x1, IFC4x2, IFC4x3 Add2 |

### 4.3 PSD Schema (Property Set Definition)

Het PSD-schema biedt een XML-schemadefinitie voor het definiëren van properties buiten de IFC-specificatie:

- **Doel:** Regionale of projectspecifieke property sets definiëren
- **Formaat:** XML
- **Gebruik:** Mapping tussen PSD-schema en applicatiespecifieke property-definities
- **Locatie:** buildingSMART standaardenrepository

---

## 5. buildingSMART Data Dictionary (bSDD)

### 5.1 Overzicht

De buildingSMART Data Dictionary (bSDD) is een online platform voor het hosten van data dictionaries met classificaties, properties, toegestane waarden, eenheden en vertalingen.

| Kenmerk | Omschrijving |
|---|---|
| **Type** | Online RESTful API |
| **Standaarden** | ISO 23386, ISO 12006-3 |
| **Kosten** | Gratis voor zowel publiceren als raadplegen van publieke content |
| **Omvang (2023)** | ~80.000 classificaties in 108 domeinen |
| **Terminologie** | 'Domains' heten nu 'Dictionaries', 'Classifications' heten nu 'Classes' |
| **Zoekportaal** | [bSDD Search](https://search.bsdd.buildingsmart.org/) |
| **Identifier** | [bSDD Identifier](https://identifier.buildingsmart.org/) |

### 5.2 Belangrijke Dictionaries in bSDD

| Dictionary | Organisatie | Domein | Land |
|---|---|---|---|
| **IFC** | buildingSMART | Basis IFC-entiteiten en properties | Internationaal |
| **ETIM** | ETIM International | Elektrotechnische producten | Internationaal |
| **Uniclass 2015** | NBS/CPIC | Gebouwclassificatie | VK |
| **OmniClass** | CSI/CSC | Bouwclassificatie | Noord-Amerika |
| **NL/SfB** | BIM Loket | Bouwelementen classificatie | Nederland |
| **CCS** | cuneco/Molio | Bouwclassificatie | Denemarken |
| **CoClass** | BIM Alliance Sweden | Bouwclassificatie | Zweden |
| **DIN-normen** | DIN | Bouwnormen | Duitsland |
| **CAFM-Connect** | CAFM Ring | Facility Management | Duitsland |
| **CN-IFC** | buildingSMART China | Chinese IFC-uitbreiding | China |
| **IFC-SG** | BCA Singapore | Singapore regelgeving | Singapore |

### 5.3 bSDD Data Model

```
Dictionary (voorheen Domain)
  └── Class (voorheen Classification)
       ├── ClassProperty
       │    ├── PropertySet (tekstveld)
       │    ├── AllowedValues
       │    └── Units
       └── ClassRelation
            └── RelatedClass (naar andere Dictionary)
```

### 5.4 Semantic bSDD

- **Platform:** [Semantic bSDD](https://bsdd.ontotext.com/)
- **Doel:** Linked-data representatie van bSDD-inhoud
- **Technologie:** RDF/OWL semantisch web

---

## 6. Bronnen

### Officiële buildingSMART-documentatie
- [IFC 4.3.2 Documentatie](https://ifc43-docs.standards.buildingsmart.org/)
- [IFC 4.3.2 Annex B - Alfabetische lijst Property Sets](https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/annex-b3.html)
- [IFC2x3 Property Sets Definition Index](https://standards.buildingsmart.org/IFC/RELEASE/IFC2x3/TC1/HTML/psd/psd_index.htm)
- [IFC Schema Specifications](https://technical.buildingsmart.org/standards/ifc/ifc-schema-specifications/)
- [buildingSMART Data Dictionary](https://www.buildingsmart.org/users/services/buildingsmart-data-dictionary/)
- [bSDD Data Structure](https://technical.buildingsmart.org/services/bsdd/data-structure/)
- [bSDD Search Portal](https://search.bsdd.buildingsmart.org/)
- [bSDD API](https://technical.buildingsmart.org/services/bsdd/using-the-bsdd-api/)

### Nederland
- [digiGO BIM Basis ILS](https://www.digigo.nu/ilsen-en-richtlijnen/bim-basis-ils/)
- [digiGO Property Sets](https://www.digigo.nu/en/ilsen-en-richtlijnen/bim-base-ids/3-7-use-property-sets/)
- [Revit Standards (NLRS)](https://www.revitstandards.org/en/about/projects/basis-ils/)

### Verenigd Koninkrijk
- [NBS BIM Object Standard](https://source.thenbs.com/bimlibrary/nbs-bim-object-standard)
- [COBie](https://www.designingbuildings.co.uk/wiki/COBie)
- [PAS 1192-2](https://www.designingbuildings.co.uk/wiki/PAS_1192-2)
- [NBS BIM Object Standard Information Requirements](https://www.thenbs.com/knowledge/exploring-the-nbs-bim-object-standard-information-requirements)

### Duitsland
- [DIN BIM Cloud](https://www.dinmedia.de/en/topics/bim/din-bim-cloud)
- [VDI 2552](https://www.vdi.de/mitgliedschaft/vdi-richtlinien/unsere-richtlinien-highlights/vdi-2552)
- [CAFM-Connect BIM Profiles (GitHub)](https://github.com/CAFM-Connect/BIM-Profiles)
- [CAFM-Connect (GitHub)](https://github.com/CAFM-Connect/CAFM-Connect)
- [BIM-Merkmalserver](https://bim-more.com/en/bim-merkmalserver)
- [buildingSMART Deutschland IFC-vertaling](https://www.bsde-tech.de/mitarbeiten/projektgruppen/ifc-uebersetzung-eng-de/)

### Frankrijk
- [Plan BIM 2022 - Normalisatie](https://plan-bim-2022.fr/actions/ptnb-axe-c-la-normalisation/la-normalisation/)

### Scandinavië
- [buildingSMART Finland COBIM](https://wiki.buildingsmart.fi/en/04_Guidelines_and_Standards/COBIM_Requirements)
- [buildingSMART Finland Wiki](https://wiki.buildingsmart.fi/)
- [Nordic Innovation BISI rapport](https://www.nordicinnovation.org/sites/default/files/inline-images/BISI%20Final%20report%20final.pdf)

### Verenigde Staten
- [WBDG COBie](https://www.wbdg.org/bim/cobie)
- [NIBS NBIMS-US](https://nibs.org/nbims/v4/faqs/)
- [OmniClass](https://www.wbdg.org/resources/omniclass)
- [USACE BIM Requirements](https://www.sas.usace.army.mil/Portals/61/docs/Engineering/EngineeringCriteria/V2_a16%20BIM.pdf)

### Singapore
- [CORENET X](https://info.corenet.gov.sg)
- [IFC-SG Resource Toolkit](https://info.corenet.gov.sg/ifc-sg/bim-data-(ifc-sg)/ifc-sg-resource-toolkit)
- [CORENET X Parameter Lookup](https://senibina.com.sg/corenet-x-lookup)

### Australië en Nieuw-Zeeland
- [NATSPEC BIM](https://bim.natspec.org/documents/au-bim-standards)
- [Open BIM Object Standard (NZ)](https://masterspec.co.nz/filescust/CMS/Open%20BIM%20Object%20Standard%20Consultation%20Draft%20NZ.pdf)
- [buildingSMART Australasia](https://www.buildingsmart.org/community/chapter-directory/buildingsmart-australasia/)

### Azië
- [KBIMS (Korea)](https://koreascience.kr/article/JAKO202008540579302.page)
- [Global openBIM Mandates 2025](https://www.buildingsmart.org/wp-content/uploads/2025/03/IFC-Mandate_2025.pdf)

### Open Source
- [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell)
- [IfcOpenShell Pset API](https://docs.ifcopenshell.org/autoapi/ifcopenshell/api/pset/index.html)
- [buildingSMART IFC4.3.x-development](https://github.com/buildingSMART/IFC4.3.x-development)
- [buildingSMART IFC4.3.x-output](https://github.com/buildingSMART/IFC4.3.x-output)

### Overige
- [BIM Corner - Properties in IFC](https://bimcorner.com/properties-in-ifc/)
- [BIM Corner - IFC 4.3 for Infrastructure](https://bimcorner.com/ifc-4-3-for-infrastructure/)
- [OSArch Wiki - IFC attributes and properties](https://wiki.osarch.org/index.php?title=IFC_attributes_and_properties)
- [BIM me UP - Common IFC Property Sets](https://bim-me-up.com/en/general-ifc-property-sets-common-property-sets/)
- [IFC Bridge - buildingSMART](https://www.buildingsmart.org/standards/domains/infrastructure/ifc-bridge/)
- [DeepWiki - IFC4.3 Property and Quantity Sets](https://deepwiki.com/buildingSMART/IFC4.3.x-output/3-property-and-quantity-sets)

---

## Samenvatting

| Categorie | Aantal PSETs (ca.) | Opmerkingen |
|---|---|---|
| Officieel IFC4x3 | 645+ | ISO 16739-1:2024 standaard |
| HVAC-domein | ~103 | Grootste domein qua PSETs |
| Elektrotechnisch domein | ~33 | Inclusief verlichting en bekabeling |
| Gebouwelementen | ~17 | Wanden, deuren, ramen, etc. |
| Infrastructuur (nieuw in 4x3) | ~20+ | Bruggen, wegen, spoor, maritiem |
| Ruimtelijk/Energie | ~15 | Thermisch, bezetting, verlichting |
| FM/Beheer | ~10 | Garantie, levensduur, conditie |
| Singapore SGPsets | 700+ parameters | CORENET X verplicht |
| KBIMS (Korea) | 793 elementen | 12 categorieën |
| bSDD Dictionaries | 108+ domeinen | ~80.000 classificaties |
| CAFM-Connect (Duitsland) | Open bibliotheek | IFC4 XML-profielen |
| COBie | ~9 tabbladen | FM-data overdracht |
| NBS BIM Object Standard (UK) | Variabel | Per productcategorie |
| BIM Basis ILS (NL) | ~5 kernproperties | Minimale verplichte set |

> **Totaal geschat unieke property-definities wereldwijd:** Meer dan **5.000+** wanneer alle nationale uitbreidingen, sectorspecifieke sets, bSDD-dictionaries en projectspecifieke aanvullingen worden meegeteld.

---

*Dit rapport is samengesteld op basis van openbaar beschikbare informatie van buildingSMART International, nationale BIM-organisaties, academische publicaties en open-source repositories. De vermelde aantallen zijn indicatief en kunnen variëren door voortdurende ontwikkeling van standaarden.*
