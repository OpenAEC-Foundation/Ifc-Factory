# IfcX Universal Property Set Voorstel

> **Versie:** 1.0
> **Datum:** 25 maart 2026
> **Status:** Concept-specificatie
> **Auteur:** IfcX Project Team
> **Taal:** Nederlands

---

## Inhoudsopgave

1. [Analyse: Kritiek op huidige IFC PSETs](#1-analyse-kritiek-op-huidige-ifc-psets)
2. [Inventarisatie: Wereldwijd overzicht bestaande PSETs](#2-inventarisatie-wereldwijd-overzicht-bestaande-psets)
3. [Gaps: Wat ontbreekt in het huidige PSET-landschap](#3-gaps-wat-ontbreekt-in-het-huidige-pset-landschap)
4. [Voorstel: IfcX Universal Property Set](#4-voorstel-ifcx-universal-property-set)
5. [Per-element Property Tabellen](#5-per-element-property-tabellen)
6. [NL-specifieke PSETs](#6-nl-specifieke-psets)
7. [Implementatie en Migratie](#7-implementatie-en-migratie)

---

## 1. Analyse: Kritiek op huidige IFC PSETs

### 1.1 Samenvatting van de problemen

Op basis van uitgebreid onderzoek naar forums (buildingSMART, OSArch), academische papers (MDPI, ResearchGate), blogposts (BIM Corner, AlterSquare) en ervaringen van BIM-managers, architecten, ingenieurs en softwareontwikkelaars zijn de volgende kernproblemen geidentificeerd met het huidige IFC Property Set-systeem:

#### 1.1.1 Onvolledige property sets

De standaard IFC property sets dekken slechts een **fractie** van de eigenschappen die in de praktijk nodig zijn. Software toont standaard slechts een subset van de beschikbare properties, en veel relevante eigenschappen zijn simpelweg niet gestandaardiseerd.

**Impact:** BIM-managers besteden veel tijd aan het handmatig configureren van property mappings. Opdrachtgevers krijgen niet de data die ze nodig hebben voor asset management.

#### 1.1.2 IfcComplexProperty niet ondersteund

In de IFC Reference View wordt `IfcComplexProperty` niet ondersteund in de property set templates. Dit beperkt de mogelijkheid om samengestelde eigenschappen (bijv. een materiaalsamenstelling met meerdere lagen) gestructureerd op te slaan.

#### 1.1.3 Classificatiesystemen beperkt

ISO 12006-2 biedt slechts basisprincipes, resulterend in een onvolledig classificatiesysteem. Elk land heeft vervolgens een eigen classificatiesysteem ontwikkeld (NL/SfB, Uniclass, OmniClass, CCS, CoClass) die onderling niet compatibel zijn.

#### 1.1.4 Materiaaldata incompleet

Bij IFC-uitwisseling worden materiaal-**labels** correct overgedragen, maar de structurele en fysische **eigenschappen** (sterkte, thermische geleidbaarheid, dichtheid, elasticiteitsmodulus) gaan verloren. Dit maakt het onmogelijk om op basis van een IFC-model direct berekeningen uit te voeren.

#### 1.1.5 Geen gestandaardiseerd vocabulaire

Het vocabulaire voor properties moet per project worden afgesproken. Er is geen universele definitie van wat een "FireRating" precies inhoudt -- de waarde "REI 60" in Nederland heeft een andere testmethode dan "60/60/60" in het Verenigd Koninkrijk.

#### 1.1.6 Custom properties problematisch

Het toevoegen van nieuwe properties aan bestaande property sets is lastig. Gebruikers maken hun eigen property sets aan, maar deze zijn niet gestandaardiseerd en worden door andere software genegeerd of verkeerd geinterpreteerd.

#### 1.1.7 Domeinspecifieke tekortkomingen

| Domein | Ernst | Kernprobleem |
|--------|-------|-------------|
| **MEP** | Hoog | Systeemrelaties gaan verloren; pipework en ductwork verdwijnen bij import |
| **Constructief** | Hoog | Belastingen niet overdraagbaar; materiaalsterkte ontbreekt; wapeningsdetaillering onvoldoende |
| **FM** | Hoog | Onvoldoende garantie-, onderhouds- en levensduurdata |
| **Duurzaamheid** | Gemiddeld-Hoog | Geen BREEAM/LEED/WELL-specifieke properties; energiedata versnipperd |
| **Infra** | Gemiddeld | Pas sinds IFC4x3 basisondersteuning; tunnels ontbreken |
| **Akoestiek** | Gemiddeld | Alleen AcousticRating als tekstveld; geen gedetailleerde akoestische data |
| **Brandveiligheid** | Gemiddeld | FireRating is een tekstveld zonder gestructureerde waarden |

#### 1.1.8 Ernst-classificatie

| Probleem | Ernst | IFCX-oplossingsmogelijkheid |
|----------|-------|---------------------------|
| Property sets incompleet | Gemiddeld-Hoog | **Volledig** -- via uitbreidbaar `ifcx::prop::*` namespace-systeem |
| Materiaaldata ontbreekt | Hoog | **Volledig** -- gestructureerde materiaal-properties |
| Classificatie-wildgroei | Gemiddeld | **Gedeeltelijk** -- meerdere classificaties per node mogelijk |
| MEP-beperkingen | Hoog | **Gedeeltelijk** -- rijkere attributen, maar entiteiten komen van IFC5 |
| Constructieve beperkingen | Hoog | **Gedeeltelijk** -- uitbreidbare constructieve properties |
| FM-data tekort | Hoog | **Volledig** -- complete FM property sets |

---

## 2. Inventarisatie: Wereldwijd overzicht bestaande PSETs

### 2.1 Officieel buildingSMART (IFC4x3)

De IFC 4.3.2-standaard (ISO 16739-1:2024) bevat **645+ voorgedefinieerde Property Sets** en meer dan **2.500 individuele properties** in meer dan **750 sets** (inclusief Quantity Sets).

| Categorie | Aantal PSETs | Voorbeelden |
|-----------|-------------|-------------|
| **Gebouwelementen** | ~17 | Pset_WallCommon, Pset_DoorCommon, Pset_WindowCommon, Pset_SlabCommon, Pset_BeamCommon, Pset_ColumnCommon |
| **Ruimtelijke elementen** | ~13 | Pset_BuildingCommon, Pset_SpaceCommon, Pset_SpaceThermalRequirements, Pset_SpaceFireSafetyRequirements |
| **HVAC** | ~103 | Pset_BoilerTypeCommon, Pset_ChillerTypeCommon, Pset_FanTypeCommon, Pset_PumpTypeCommon |
| **Elektrotechnisch** | ~33 | Pset_ElectricalDeviceCommon, Pset_CableSegmentTypeCommon, Pset_LightFixtureTypeCommon |
| **Gebouwautomatisering** | ~8 | Pset_ActuatorTypeCommon, Pset_SensorTypeCommon, Pset_ControllerTypeCommon |
| **Sanitair/brandbeveiliging** | ~12 | Pset_FireSuppressionTerminalTypeCommon, Pset_SanitaryTerminalTypeCommon |
| **Architectuur** | ~6 | Pset_DoorWindowGlazingType, Pset_DoorWindowShadingType |
| **FM** | ~10 | Pset_ManufacturerTypeInformation, Pset_Warranty, Pset_ServiceLife, Pset_Condition |
| **Distributiesystemen** | ~8 | Pset_DistributionPortCommon, Pset_FlowMeterTypeCommon |
| **Materiaal** | ~8 | Pset_MaterialCommon, Pset_MaterialConcrete, Pset_MaterialSteel, Pset_MaterialWood |
| **Milieu** | ~4 | Pset_EnvironmentalImpactIndicators, Pset_EnvironmentalImpactValues |
| **Infrastructuur** | ~20 | Pset_BridgeCommon, Pset_RoadCommon, Pset_RailwayCommon, Pset_PavementCommon |
| **Overig** | ~400+ | Domeinspecifieke PSETs voor alle IFC-entiteiten |

### 2.2 Per land

#### Nederland (NL)

| Standaard/Systeem | Organisatie | Beschrijving |
|-------------------|------------|-------------|
| **BIM Basis ILS** | digiGO | Basisafspraken BIM-informatieuitwisseling; vereist LoadBearing, IsExternal, FireRating, Material, NL/SfB |
| **NL/SfB** | BIM Loket / STABU | 4-cijferige elementcodering (21=buitenwanden, 22=binnenwanden, etc.) |
| **NLRS** | Stichting Revit Standards | Gestandaardiseerde Revit-templates met IFC-export conform BIM Basis ILS |
| **CB-NL** | digiGO | Nationale conceptenbibliotheek als linked-data platform (koppeling NL/SfB, ETIM, RAW, STABU) |

#### Verenigd Koninkrijk (UK)

| Standaard/Systeem | Organisatie | Beschrijving |
|-------------------|------------|-------------|
| **NBS BIM Object Standard** | NBS | Kwaliteitsstandaard voor BIM-objecten (v2.1); vereist Pset_*Common + COBie + NBS_Properties |
| **COBie UK** | BS 1192-4 | FM-data overdracht: COBie_Facility, COBie_Type, COBie_Component, COBie_System, COBie_Job |
| **Uniclass 2015** | NBS/CPIC | Classificatiesysteem: Ss (Systems), Pr (Products), EF (Entities), SL (Spaces) |
| **PAS 1192 / ISO 19650** | BSI | Informatiemanagement gedurende de gehele levenscyclus |

#### Duitsland (DE)

| Standaard/Systeem | Organisatie | Beschrijving |
|-------------------|------------|-------------|
| **DIN BIM Cloud** | DIN / Dr. Schiller & Partner | Database met gestandaardiseerde kenmerken (Merkmale) voor Hochbau, Tiefbau, TGA |
| **VDI 2552** | VDI | BIM-richtlijnenserie (Blatt 1: grondbegrippen, Blatt 9: classificatie, Blatt 12: metadata) |
| **CAFM-Connect** | CAFM Ring e.V. | FM data-uitwisseling op basis van IFC4; BIM-profielen gekoppeld aan DIN 276, GEFMA 198/924 |
| **BIM-Merkmalserver** | BIM & More | Server voor beheer gestandaardiseerde BIM-kenmerken |

**Relevante DIN-normen:**

| Norm | Onderwerp |
|------|----------|
| DIN 276 | Kostengroepen (bouwkosten) |
| DIN 277 | Oppervlakten en volumes |
| DIN 18599 | Energieprestatie |
| DIN 4108 | Warmtebescherming |
| DIN 4109 | Geluidsisolatie |

#### Frankrijk (FR)

| Standaard/Systeem | Organisatie | Beschrijving |
|-------------------|------------|-------------|
| **PPBIM** | Afnor (XP P07-150) | Geharmoniseerd referentiesysteem voor producteigenschappen; uitbreiding van IFC PSETs |

#### Scandinavie (Nordic)

| Land | Standaard | Organisatie | Bijzonderheden |
|------|----------|------------|----------------|
| **Finland** | COBIM | buildingSMART Finland | 13 series met nationale BIM-richtlijnen (architectuur, MEP, constructief, QA) |
| **Noorwegen** | Statsbygg-richtlijnen | buildingSMART Norge | IFC verplicht voor alle openbare projecten sinds 2010 |
| **Denemarken** | CCS | cuneco/Molio | IFC verplicht voor publiek gefinancierde projecten sinds 2010 |
| **Zweden** | CoClass | BIM Alliance Sweden | Nationale classificatie gekoppeld aan IFC |

#### Verenigde Staten (US)

| Standaard/Systeem | Organisatie | Beschrijving |
|-------------------|------------|-------------|
| **NBIMS-US V4** | NIBS | Nationaal BIM-standaardkader |
| **COBie US** | USACE / GSA | Verplichte FM-data overdracht voor federale projecten; koppeling met TRIRIGA, BUILDER, Maximo |
| **OmniClass** | CSI/CSC | Classificatiesysteem (Tabel 21: Elements, Tabel 22: Work Results, Tabel 23: Products) |
| **UniFormat / MasterFormat** | CSI | Classificatie op basis van bouwelementen resp. werkresultaten |

#### Singapore (SG)

| Standaard/Systeem | Organisatie | Beschrijving |
|-------------------|------------|-------------|
| **IFC-SG / CORENET X** | BCA | Verplichte BIM-indiening voor bouwvergunningen; **700+ parameters** in SGPsets |
| **SGPsets** | BCA/SCDF/PUB/LTA/NParks/URA | Per instantie specifieke parameters voor regelgevingstoetsing |

#### Australie (AU)

| Standaard/Systeem | Organisatie | Beschrijving |
|-------------------|------------|-------------|
| **OBOS** | NATSPEC / MasterSpec | Open BIM Object Standard; verplichte IFC-properties (Tabel 4A) |
| **buildingSMART Australasia** | bSA | Bevordering openBIM-standaarden |

#### China (CN)

| Standaard/Systeem | Organisatie | Beschrijving |
|-------------------|------------|-------------|
| **CN-IFC** | buildingSMART China | Chinese vertaling en uitbreiding van IFC4.3; GB/T 51447-2021 |
| **Toepassingen** | Overheid | 3D kadaster, eigendomsregistratie, bouwvergunningen |

#### Japan (JP)

| Standaard/Systeem | Organisatie | Beschrijving |
|-------------------|------------|-------------|
| **MLIT BIM-standaard** | MLIT | Verplicht BIM voor alle openbare werken vanaf 2023; BIM-based Drawing Check vanaf 2025 |

#### Zuid-Korea (KR)

| Standaard/Systeem | Organisatie | Beschrijving |
|-------------------|------------|-------------|
| **KBIMS** | Korea Institute of Construction Technology | 12 categorieen, 793 elementen; speciale IFC naamgevingssystemen |

### 2.3 Per sector

#### Infrastructuur

| PSETs/Standaarden | Toepassingsgebied |
|-------------------|------------------|
| Pset_BridgeCommon, Pset_BridgePartCommon | Bruggen |
| Pset_RoadCommon, Pset_PavementCommon, Pset_CourseCommon, Pset_KerbCommon | Wegen |
| Pset_RailwayCommon, Pset_RailCommon | Spoorwegen |
| Pset_MarineFacilityCommon | Havens/maritiem |
| Pset_EarthworksCutCommon, Pset_EarthworksFillCommon | Grondwerk |
| Pset_SignCommon, Pset_SignalCommon | Verkeersmaatregelen |

#### MEP (Mechanical, Electrical, Plumbing)

| Categorie | Aantal PSETs | Dekking |
|-----------|-------------|---------|
| Luchtbehandeling | ~15 | AirTerminal, HeatRecovery, Humidifier |
| Verwarming | ~10 | Boiler, SpaceHeater, HeatExchanger |
| Koeling | ~10 | Chiller, CoolingTower, Condenser |
| Leidingwerk | ~15 | PipeSegment, PipeFitting, Valve |
| Kanaalwerk | ~10 | DuctSegment, DuctFitting, DuctSilencer |
| Elektrotechnisch | ~33 | CableSegment, LightFixture, SwitchingDevice |
| Pompen/Ventilatoren | ~10 | Pump, Fan, Compressor |

#### Constructief

| PSETs | Dekking |
|-------|---------|
| Pset_BeamCommon, Pset_ColumnCommon, Pset_SlabCommon, Pset_FootingCommon, Pset_PileCommon | Basiselementen |
| Pset_ConcreteElementGeneral, Pset_PrecastConcreteElementGeneral | Beton |
| Pset_ReinforcementBarPitchOf* | Wapening |
| Pset_ProfileMechanical | Staalprofielen |
| Pset_MaterialSteel, Pset_MaterialConcrete, Pset_MaterialWood | Materiaaleigenschappen |

#### Facility Management

| PSETs | Dekking |
|-------|---------|
| Pset_ManufacturerTypeInformation, Pset_ManufacturerOccurrence | Fabrikantdata |
| Pset_Warranty, Pset_ServiceLife, Pset_Condition, Pset_Asset | Levenscyclusdata |
| COBie_Type, COBie_Component, COBie_System, COBie_Spare, COBie_Job | COBie FM-data |
| CAFM-Connect profielen | Duitse FM-standaard |

#### Energie en duurzaamheid

| PSETs | Dekking |
|-------|---------|
| Pset_SpaceThermalRequirements, Pset_SpaceThermalLoad, Pset_SpaceThermalDesign | Thermische analyse |
| Pset_EnvironmentalImpactIndicators, Pset_EnvironmentalImpactValues | Milieu-impact |
| Pset_MaterialCommon (thermische properties) | Materiaalthermiek |

**Certificeringssystemen zonder eigen IFC-PSETs:**

| Systeem | Organisatie | Relatie met IFC |
|---------|-----------|----------------|
| BREEAM | BRE (UK) | Gebruikt thermische, materiaal- en energieproperties |
| LEED | USGBC (US) | Idem |
| WELL | IWBI | Luchtkwaliteit, comfort |
| Green Mark | BCA (SG) | Geintegreerd in CORENET X |

---

## 3. Gaps: Wat ontbreekt in het huidige PSET-landschap

### 3.1 Properties die gebruikers vragen maar niet bestaan

| Categorie | Ontbrekende property | Wie vraagt het | Urgentie |
|-----------|---------------------|---------------|----------|
| **Thermisch** | U-waarde per materiaallaag (niet alleen totaal) | Energieadviseurs | Hoog |
| **Thermisch** | Lineaire koudebrugwaarde (psi-waarde) | BENG-berekenaars | Hoog |
| **Thermisch** | Rc-waarde (thermische weerstand NL) | Nederlandse bouwfysici | Hoog |
| **Akoestisch** | Rw (gewogen geluidsisolatie) als getal, niet tekst | Akoestisch adviseurs | Hoog |
| **Akoestisch** | Ln,w (contactgeluid) | Akoestisch adviseurs | Hoog |
| **Akoestisch** | Ctr (spectrumcorrectie) | Akoestisch adviseurs | Gemiddeld |
| **Brandveiligheid** | Gestructureerde brandwerendheid (R, E, I apart) | Brandveiligheidadviseurs | Hoog |
| **Brandveiligheid** | Brandcompartiment-ID en -grootte | Gebouwbeheerders | Hoog |
| **Brandveiligheid** | Rookwerendheid (Sa, S200) | Brandveiligheid NL | Gemiddeld |
| **Constructief** | Belastingen (permanent, variabel, wind, sneeuw) | Constructeurs | Hoog |
| **Constructief** | Doorbuiging (berekend en toegestaan) | Constructeurs | Hoog |
| **Constructief** | Unity check | Constructeurs | Gemiddeld |
| **Constructief** | Wapeningspercentage | Constructeurs | Gemiddeld |
| **Duurzaamheid** | CO2-equivalent (GWP) per element | Duurzaamheidsadviseurs | Hoog |
| **Duurzaamheid** | MKI-waarde (NL milieukosten) | NL opdrachtgevers | Hoog |
| **Duurzaamheid** | MPG-score (NL milieuprestatie) | NL gemeenten | Hoog |
| **Duurzaamheid** | EPD-referentie (Environmental Product Declaration) | BREEAM-assessors | Gemiddeld |
| **Duurzaamheid** | Circularity Index | Circulaire bouwers | Gemiddeld |
| **Kosten** | Eenheidsprijs per element | Calculators | Hoog |
| **Kosten** | Kostencategorie (RAW, STABU, NEN 2699) | NL aannemers | Hoog |
| **Onderhoud** | Onderhoudsinterval | FM-managers | Hoog |
| **Onderhoud** | Vervangingskosten | Asset managers | Gemiddeld |
| **Onderhoud** | NEN 2767 conditiescore | NL beheerders | Hoog |
| **Planning** | Bouwfase / montagevolgorde | Uitvoerders | Gemiddeld |
| **Planning** | Levertijd | Inkoop | Gemiddeld |
| **Toegankelijkheid** | Rolstoeltoegankelijk (gedetailleerd) | Gemeente / BWT | Gemiddeld |
| **Moisture** | Vochtwerendheid (Sd-waarde) | Bouwfysici | Gemiddeld |

### 3.2 Landen/sectoren zonder adequate PSETs

| Land/Sector | Probleem | Impact |
|-------------|---------|--------|
| **Nederland** | Geen gestandaardiseerde PSETs voor BBL/Bouwbesluit-toetsing | Hoog -- handmatige verificatie nodig |
| **Nederland** | Geen BENG-specifieke properties in IFC | Hoog -- energieberekening buiten model |
| **Nederland** | Geen Aerius/stikstof-gerelateerde properties | Gemiddeld -- aparte berekening vereist |
| **Midden-Oosten** | Geen regionale PSETs voor woestijnklimaat | Gemiddeld |
| **Afrika** | Vrijwel geen lokale BIM-standaarden | Laag (nu), stijgend |
| **Zuid-Amerika** | Beperkte lokale PSETs (Brazilie begint) | Gemiddeld |
| **Tunnelbouw** | Pas in IFC 4.4 gepland | Hoog voor infra-sector |
| **Landschapsarchitectuur** | Geen PSETs voor beplanting, terreininrichting | Gemiddeld |
| **Tijdelijke constructies** | Geen PSETs voor steigers, bekisting | Gemiddeld |
| **Sloopfase** | Geen PSETs voor sloopsequencing, afvalbeheer | Gemiddeld |
| **Bestaande bouw** | Geen PSETs voor scan-to-BIM objecten | Gemiddeld |

### 3.3 Inconsistenties tussen nationale PSETs

| Aspect | Probleem |
|--------|---------|
| **Brandwerendheid** | NL: WBDBO (minuten); UK: minutes; DE: Feuerwiderstandsklasse (REI xx); FR: classement au feu |
| **Classificatie** | NL: NL/SfB; UK: Uniclass; DE: DIN 276; US: OmniClass/UniFormat; DK: CCS; SE: CoClass |
| **Energielabels** | NL: BENG 1/2/3; UK: SAP/EPC; DE: DIN 18599/EnEV; FR: RT 2020 |
| **Geluidsisolatie** | NL: NEN 5077/NEN-EN-ISO 717; DE: DIN 4109; UK: Approved Document E |
| **Materiaalnaamgeving** | Geen universele conventie; "Beton C30/37" vs "Concrete C30/37" vs "Beton C30/37" |
| **Eenheden** | Metrisch vs imperiaal; mm vs m; kN vs lbs |
| **Property-naamgeving** | Geen consistentie: "ThermalTransmittance" vs "U-waarde" vs "Waermedurchgangskoeffizient" |

---

## 4. Voorstel: IfcX Universal Property Set

### 4.1 Ontwerpprincipes

1. **Backwards-compatibel**: Alle bestaande `bsi::ifc::prop::*` properties blijven geldig en worden niet gedupliceerd
2. **Uitbreidbaar**: Nieuwe properties worden toegevoegd via het `ifcx::prop::*` namespace-systeem
3. **Gestructureerd**: Properties hebben getypeerde waarden (getal, boolean, enumeratie), geen vrije tekstvelden
4. **Meertalig**: Property-namen zijn in het Engels; vertalingen via een apart dictionary-systeem
5. **Valideerbaar**: Elk property heeft een JSON Schema-definitie met type, eenheid en bereik
6. **Nationaal uitbreidbaar**: Landspecifieke extensies via sub-namespaces (bijv. `ifcx::prop::nl::*`)

### 4.2 Namespace-structuur

```
ifcx::prop::<domein>::<property>          # Universele IfcX properties
ifcx::prop::nl::<domein>::<property>      # NL-specifiek
ifcx::prop::uk::<domein>::<property>      # UK-specifiek
ifcx::prop::de::<domein>::<property>      # DE-specifiek
ifcx::prop::fr::<domein>::<property>      # FR-specifiek
ifcx::prop::sg::<domein>::<property>      # SG-specifiek
ifcx::prop::us::<domein>::<property>      # US-specifiek

bsi::ifc::prop::<property>                # Bestaande IFC5-properties (ongewijzigd)
```

**Domeinen:**

| Domein | Prefix | Beschrijving |
|--------|--------|-------------|
| `thermal` | `ifcx::prop::thermal::*` | Thermische eigenschappen |
| `acoustic` | `ifcx::prop::acoustic::*` | Akoestische eigenschappen |
| `fire` | `ifcx::prop::fire::*` | Brandeigenschappen |
| `structural` | `ifcx::prop::structural::*` | Constructieve eigenschappen |
| `sustainability` | `ifcx::prop::sustainability::*` | Duurzaamheid (CO2, MKI, EPD) |
| `cost` | `ifcx::prop::cost::*` | Kosten en calculatie |
| `maintenance` | `ifcx::prop::maintenance::*` | Onderhoud en beheer |
| `lifecycle` | `ifcx::prop::lifecycle::*` | Levenscyclus |
| `moisture` | `ifcx::prop::moisture::*` | Vochthuishouding |
| `accessibility` | `ifcx::prop::accessibility::*` | Toegankelijkheid |
| `logistics` | `ifcx::prop::logistics::*` | Logistiek en planning |
| `classification` | `ifcx::prop::classification::*` | Classificatie-koppelingen |
| `manufacturer` | `ifcx::prop::manufacturer::*` | Fabrikantdata (uitbreiding van Pset_Manufacturer*) |
| `mep` | `ifcx::prop::mep::*` | MEP-specifieke uitbreidingen |

### 4.3 Universele IfcX Properties

#### 4.3.1 Thermische properties (`ifcx::prop::thermal::*`)

| Property | Type | Eenheid | Beschrijving |
|----------|------|---------|-------------|
| `thermalTransmittance` | number | W/(m2.K) | U-waarde (totaal van opbouw) |
| `thermalResistance` | number | m2.K/W | Rc-waarde (thermische weerstand) |
| `thermalConductivity` | number | W/(m.K) | Lambda-waarde (per materiaallaag) |
| `linearThermalBridge` | number | W/(m.K) | Lineaire koudebrug (psi-waarde) |
| `pointThermalBridge` | number | W/K | Punt-koudebrug (chi-waarde) |
| `specificHeatCapacity` | number | J/(kg.K) | Specifieke warmtecapaciteit |
| `thermalMass` | number | kJ/(m2.K) | Thermische massa |
| `solarHeatGainCoefficient` | number | - | ZTA-waarde / g-waarde (0-1) |
| `shadingCoefficient` | number | - | Zonweringscoefficient (0-1) |
| `temperatureFactorInner` | number | - | Temperatuurfactor (fRsi) |

#### 4.3.2 Akoestische properties (`ifcx::prop::acoustic::*`)

| Property | Type | Eenheid | Beschrijving |
|----------|------|---------|-------------|
| `airborneSound` | number | dB | Rw -- gewogen geluidsisolatie (luchtgeluid) |
| `impactSound` | number | dB | Ln,w -- gewogen contactgeluidniveau |
| `spectrumAdaptation_C` | number | dB | Spectrumaanpassingsterm C |
| `spectrumAdaptation_Ctr` | number | dB | Spectrumaanpassingsterm Ctr (verkeer) |
| `soundAbsorption` | number | - | Geluidsabsorptiecoefficient alpha-w (0-1) |
| `soundReduction` | number | dB | Geluidsreductie-index (RA) |
| `flanking` | number | dB | Flanktransmissie (Dn,f,w) |
| `reverberation` | number | s | Nagalmtijd (T60) |
| `noiseRating` | string | - | Geluidscategorie (bijv. "NR 35", "NC 30") |

#### 4.3.3 Brandeigenschappen (`ifcx::prop::fire::*`)

| Property | Type | Eenheid | Beschrijving |
|----------|------|---------|-------------|
| `loadBearingMinutes` | number | min | R -- draagvermogen bij brand |
| `integrityMinutes` | number | min | E -- vlamdichtheid |
| `insulationMinutes` | number | min | I -- thermische isolatie bij brand |
| `fireResistanceClass` | string | - | Samengestelde klasse (bijv. "REI 60") |
| `reactionToFire` | string | - | Euroclass (A1, A2, B, C, D, E, F) |
| `smokeProduction` | string | - | Rookklasse (s1, s2, s3) |
| `burningDroplets` | string | - | Brandend druppelen (d0, d1, d2) |
| `smokeResistance` | string | - | Rookwerendheid (Sa, S200) |
| `fireCompartmentId` | string | - | Brandcompartiment-identificatie |
| `fireCompartmentArea` | number | m2 | Oppervlakte brandcompartiment |
| `escapeRouteType` | string | - | Type vluchtroute (hoofd, nood, extra beschermd) |
| `sprinklerProtected` | boolean | - | Sprinklerbescherming aanwezig |

#### 4.3.4 Constructieve properties (`ifcx::prop::structural::*`)

| Property | Type | Eenheid | Beschrijving |
|----------|------|---------|-------------|
| `permanentLoad` | number | kN/m2 | Permanente belasting |
| `variableLoad` | number | kN/m2 | Variabele belasting |
| `windLoad` | number | kN/m2 | Windbelasting |
| `snowLoad` | number | kN/m2 | Sneeuwbelasting |
| `seismicZone` | string | - | Seismische zone |
| `deflection` | number | mm | Berekende doorbuiging |
| `deflectionLimit` | number | mm | Toegestane doorbuiging |
| `unityCheck` | number | - | Unity check (0-1) |
| `consequenceClass` | string | - | Gevolgklasse (CC1, CC2, CC3) |
| `reliabilityClass` | string | - | Betrouwbaarheidsklasse (RC1, RC2, RC3) |
| `exposureClass` | string | - | Milieuklasse beton (XC1, XS2, XD3, etc.) |
| `strengthClass` | string | - | Sterkteklasse (C30/37, S355, GL24h, etc.) |
| `reinforcementRatio` | number | % | Wapeningspercentage |
| `concretecover` | number | mm | Betondekking |
| `crackWidth` | number | mm | Scheurwijdte |
| `effectiveSpan` | number | mm | Effectieve overspanning |

#### 4.3.5 Duurzaamheid (`ifcx::prop::sustainability::*`)

| Property | Type | Eenheid | Beschrijving |
|----------|------|---------|-------------|
| `gwp` | number | kg CO2-eq | Global Warming Potential per eenheid |
| `gwpTotal` | number | kg CO2-eq | GWP totaal over levenscyclus |
| `embodiedEnergy` | number | MJ | Gebonden energie |
| `embodiedCarbon` | number | kg CO2-eq | Gebonden koolstof |
| `epdReference` | string | - | EPD-referentienummer |
| `epdUrl` | string | - | URL naar Environmental Product Declaration |
| `circularityIndex` | number | % | Circulariteitsindex (0-100) |
| `recycledContent` | number | % | Percentage gerecycled materiaal |
| `reusePotential` | number | % | Hergebruikpotentieel |
| `wasteCategory` | string | - | Afvalcategorie bij sloop |
| `biobased` | boolean | - | Biobased materiaal |
| `toxicSubstances` | string | - | Gevaarlijke stoffen (REACH) |

**NL-specifieke duurzaamheid:** zie sectie 6.

#### 4.3.6 Kosten (`ifcx::prop::cost::*`)

| Property | Type | Eenheid | Beschrijving |
|----------|------|---------|-------------|
| `unitCost` | number | EUR | Eenheidsprijs |
| `unitCostCurrency` | string | - | Valutacode (EUR, GBP, USD) |
| `totalCost` | number | EUR | Totaalkosten element |
| `costCategory` | string | - | Kostencategorie (NEN 2699, DIN 276, UniFormat) |
| `costDate` | string | ISO 8601 | Peildatum kostprijzen |
| `costIndex` | number | - | Indexcijfer t.o.v. basisjaar |
| `laborCost` | number | EUR | Arbeidskosten |
| `materialCost` | number | EUR | Materiaalkosten |
| `installationCost` | number | EUR | Installatiekosten |

#### 4.3.7 Onderhoud en beheer (`ifcx::prop::maintenance::*`)

| Property | Type | Eenheid | Beschrijving |
|----------|------|---------|-------------|
| `maintenanceInterval` | number | maanden | Onderhoudsinterval |
| `maintenanceType` | string | - | Type onderhoud (inspectie, reiniging, vervanging) |
| `maintenanceCost` | number | EUR | Kosten per onderhoudsbeurt |
| `replacementCost` | number | EUR | Vervangingskosten |
| `replacementYear` | number | jaar | Verwacht vervangingsjaar |
| `conditionScore` | number | 1-6 | Conditiescore (NEN 2767) |
| `conditionDate` | string | ISO 8601 | Datum conditiemeting |
| `cleaningMethod` | string | - | Reinigingsmethode |
| `accessForMaintenance` | string | - | Bereikbaarheid voor onderhoud |

#### 4.3.8 Levenscyclus (`ifcx::prop::lifecycle::*`)

| Property | Type | Eenheid | Beschrijving |
|----------|------|---------|-------------|
| `designLife` | number | jaar | Ontwerplevensduur |
| `expectedLife` | number | jaar | Verwachte levensduur |
| `installationDate` | string | ISO 8601 | Installatiedatum |
| `commissioningDate` | string | ISO 8601 | Opleveringsdatum |
| `decommissioningDate` | string | ISO 8601 | Buitengebruikstellingsdatum |
| `phase` | string | - | Bouwfase (ontwerp, uitvoering, beheer, sloop) |
| `constructionSequence` | number | - | Montagevolgorde |
| `leadTime` | number | dagen | Levertijd |

#### 4.3.9 Vochthuishouding (`ifcx::prop::moisture::*`)

| Property | Type | Eenheid | Beschrijving |
|----------|------|---------|-------------|
| `vapourResistance` | number | - | Dampweerstandsgetal (mu) |
| `sdValue` | number | m | Sd-waarde (equivalente luchtlaagdikte) |
| `waterAbsorption` | number | kg/m2 | Wateropname |
| `waterPenetration` | string | - | Waterdichtheidsklasse |
| `condensationRisk` | boolean | - | Condensatierisico |

#### 4.3.10 Toegankelijkheid (`ifcx::prop::accessibility::*`)

| Property | Type | Eenheid | Beschrijving |
|----------|------|---------|-------------|
| `wheelchairAccessible` | boolean | - | Rolstoeltoegankelijk |
| `doorClearWidth` | number | mm | Vrije doorgang breedte |
| `thresholdHeight` | number | mm | Drempelhoogte |
| `tactilePaving` | boolean | - | Geleidestrook aanwezig |
| `hearingLoop` | boolean | - | Ringleiding aanwezig |
| `brailleSignage` | boolean | - | Braille-bewegwijzering |

#### 4.3.11 MEP-uitbreidingen (`ifcx::prop::mep::*`)

| Property | Type | Eenheid | Beschrijving |
|----------|------|---------|-------------|
| `flowRate` | number | m3/h | Volumestroom |
| `pressureDrop` | number | Pa | Drukverlies |
| `powerConsumption` | number | W | Elektrisch vermogen |
| `efficiency` | number | % | Rendement |
| `noiseLevel` | number | dB(A) | Geluidsniveau |
| `refrigerantType` | string | - | Koudemiddeltype |
| `gwpRefrigerant` | number | - | GWP van koudemiddel |
| `seer` | number | - | Seasonal Energy Efficiency Ratio |
| `scop` | number | - | Seasonal Coefficient of Performance |
| `insulationThickness` | number | mm | Isolatiedikte leiding/kanaal |
| `systemType` | string | - | Systeemtype (verwarming, koeling, ventilatie, etc.) |
| `systemPressure` | number | bar | Systeemdruk |
| `designTemperature` | number | C | Ontwerptemperatuur |

### 4.4 Naamgevingsconventie

**Regels:**

1. Property-namen zijn in **camelCase** (overeenkomend met JSON-conventie)
2. Namen zijn in het **Engels** (internationaal gebruik)
3. Afkortingen worden vermeden tenzij universeel erkend (bijv. `gwp`, `seer`, `scop`)
4. Eenheden worden **niet** in de property-naam opgenomen maar als metadata meegegeven
5. Booleans beginnen met `is`, `has`, of een beschrijvend woord

**Structuur van een property-definitie (JSON Schema):**

```json
{
  "ifcx::prop::thermal::thermalTransmittance": {
    "type": "number",
    "unit": "W/(m2.K)",
    "description": "Thermal transmittance (U-value) of the element assembly",
    "description_nl": "Warmtedoorgangscoefficient (U-waarde) van de elementopbouw",
    "minimum": 0,
    "maximum": 10,
    "precision": 2,
    "source": "EN ISO 6946",
    "compatibleWith": ["Pset_WallCommon.ThermalTransmittance", "Pset_WindowCommon.ThermalTransmittance"]
  }
}
```

### 4.5 Relatie met bestaande PSETs

Het `compatibleWith`-veld koppelt elke IfcX property aan bestaande IFC PSETs. Hierdoor:

1. **Importpad:** Bij het inlezen van een IFC4x3-bestand wordt `Pset_WallCommon.ThermalTransmittance` automatisch gemapped naar `ifcx::prop::thermal::thermalTransmittance`
2. **Exportpad:** Bij het exporteren naar IFC4x3 wordt de IfcX property teruggemapped naar de juiste Pset
3. **Geen duplicatie:** Properties die al bestaan in `bsi::ifc::prop::*` worden niet gedupliceerd maar aangevuld

### 4.6 Nationale extensies

Nationale extensies volgen dezelfde structuur maar met een landencode:

```json
{
  "ifcx::prop::nl::sustainability::mkiValue": {
    "type": "number",
    "unit": "EUR/m2",
    "description": "Milieukostenindicator according to Dutch NMD methodology",
    "description_nl": "Milieukostenindicator volgens Nationale Milieudatabase",
    "source": "Bepalingsmethode Milieuprestatie Bouwwerken",
    "regulation": "Bouwbesluit 2012, art. 5.9"
  }
}
```

---

## 5. Per-element Property Tabellen

Onderstaande tabellen geven per elementtype een **compleet overzicht** van alle properties:
- **[IFC]** = bestaande property uit de officiele IFC4x3 Pset_*Common
- **[IFC5]** = verwacht in IFC5 (bsi::ifc::prop)
- **[IfcX]** = nieuw voorstel in ifcx::prop namespace

### 5.1 Wand (IfcWall)

#### Bestaande properties (Pset_WallCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| IsExternal | boolean | bsi::ifc::prop | [IFC] |
| LoadBearing | boolean | bsi::ifc::prop | [IFC] |
| FireRating | string | bsi::ifc::prop | [IFC] |
| ThermalTransmittance | number (W/m2K) | bsi::ifc::prop | [IFC] |
| AcousticRating | string | bsi::ifc::prop | [IFC] |
| Combustible | boolean | bsi::ifc::prop | [IFC] |
| SurfaceSpreadOfFlame | string | bsi::ifc::prop | [IFC] |
| ExtendToStructure | boolean | bsi::ifc::prop | [IFC] |

#### Nationale toevoegingen (bestaand)

| Property | Type | Land | Bron |
|----------|------|------|------|
| NL/SfB code | string | NL | BIM Basis ILS |
| WBDBO | number (min) | NL | Bouwbesluit |
| Uniclass code | string | UK | Uniclass 2015 |
| COBie_Type props | diverse | UK/US | COBie |
| DIN 4108 warmteschutz | string | DE | DIN BIM Cloud |
| SGPset_Wall props | diverse | SG | CORENET X |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| thermalResistance | number | m2.K/W | ifcx::prop::thermal | [IfcX] |
| linearThermalBridge | number | W/(m.K) | ifcx::prop::thermal | [IfcX] |
| temperatureFactorInner | number | - | ifcx::prop::thermal | [IfcX] |
| airborneSound | number | dB | ifcx::prop::acoustic | [IfcX] |
| spectrumAdaptation_Ctr | number | dB | ifcx::prop::acoustic | [IfcX] |
| loadBearingMinutes | number | min | ifcx::prop::fire | [IfcX] |
| integrityMinutes | number | min | ifcx::prop::fire | [IfcX] |
| insulationMinutes | number | min | ifcx::prop::fire | [IfcX] |
| reactionToFire | string | - | ifcx::prop::fire | [IfcX] |
| smokeProduction | string | - | ifcx::prop::fire | [IfcX] |
| fireCompartmentId | string | - | ifcx::prop::fire | [IfcX] |
| permanentLoad | number | kN/m2 | ifcx::prop::structural | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| mkiValue | number | EUR/m2 | ifcx::prop::nl::sustainability | [IfcX] |
| unitCost | number | EUR | ifcx::prop::cost | [IfcX] |
| maintenanceInterval | number | maanden | ifcx::prop::maintenance | [IfcX] |
| conditionScore | number | 1-6 | ifcx::prop::maintenance | [IfcX] |
| designLife | number | jaar | ifcx::prop::lifecycle | [IfcX] |
| vapourResistance | number | - | ifcx::prop::moisture | [IfcX] |
| sdValue | number | m | ifcx::prop::moisture | [IfcX] |

### 5.2 Deur (IfcDoor)

#### Bestaande properties (Pset_DoorCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| IsExternal | boolean | bsi::ifc::prop | [IFC] |
| FireRating | string | bsi::ifc::prop | [IFC] |
| AcousticRating | string | bsi::ifc::prop | [IFC] |
| SecurityRating | string | bsi::ifc::prop | [IFC] |
| HandicapAccessible | boolean | bsi::ifc::prop | [IFC] |
| FireExit | boolean | bsi::ifc::prop | [IFC] |
| SelfClosing | boolean | bsi::ifc::prop | [IFC] |
| SmokeStop | boolean | bsi::ifc::prop | [IFC] |
| GlazingAreaFraction | number | bsi::ifc::prop | [IFC] |
| HasDrive | boolean | bsi::ifc::prop | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| thermalTransmittance | number | W/(m2.K) | ifcx::prop::thermal | [IfcX] |
| airborneSound | number | dB | ifcx::prop::acoustic | [IfcX] |
| loadBearingMinutes | number | min | ifcx::prop::fire | [IfcX] |
| integrityMinutes | number | min | ifcx::prop::fire | [IfcX] |
| insulationMinutes | number | min | ifcx::prop::fire | [IfcX] |
| smokeResistance | string | - | ifcx::prop::fire | [IfcX] |
| reactionToFire | string | - | ifcx::prop::fire | [IfcX] |
| doorClearWidth | number | mm | ifcx::prop::accessibility | [IfcX] |
| thresholdHeight | number | mm | ifcx::prop::accessibility | [IfcX] |
| wheelchairAccessible | boolean | - | ifcx::prop::accessibility | [IfcX] |
| securityClass | string | - | ifcx::prop::fire | [IfcX] |
| burglarResistanceClass | string | - | ifcx::prop::fire | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| unitCost | number | EUR | ifcx::prop::cost | [IfcX] |
| maintenanceInterval | number | maanden | ifcx::prop::maintenance | [IfcX] |
| designLife | number | jaar | ifcx::prop::lifecycle | [IfcX] |
| operationCycles | number | - | ifcx::prop::lifecycle | [IfcX] |

### 5.3 Raam (IfcWindow)

#### Bestaande properties (Pset_WindowCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| IsExternal | boolean | bsi::ifc::prop | [IFC] |
| FireRating | string | bsi::ifc::prop | [IFC] |
| AcousticRating | string | bsi::ifc::prop | [IFC] |
| ThermalTransmittance | number (W/m2K) | bsi::ifc::prop | [IFC] |
| GlazingAreaFraction | number | bsi::ifc::prop | [IFC] |
| SmokeStop | boolean | bsi::ifc::prop | [IFC] |
| HasSillExternal | boolean | bsi::ifc::prop | [IFC] |
| HasSillInternal | boolean | bsi::ifc::prop | [IFC] |
| HasDrive | boolean | bsi::ifc::prop | [IFC] |
| Infiltration | number | bsi::ifc::prop | [IFC] |

#### Aanvullend (Pset_DoorWindowGlazingType)

| Property | Type | Bron |
|----------|------|------|
| GlassLayers | number | [IFC] |
| GlassThickness | number (mm) | [IFC] |
| GlassColour | string | [IFC] |
| IsTempered | boolean | [IFC] |
| IsLaminated | boolean | [IFC] |
| IsCoated | boolean | [IFC] |
| FillGas | string | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| thermalTransmittanceFrame | number | W/(m2.K) | ifcx::prop::thermal | [IfcX] |
| thermalTransmittanceGlazing | number | W/(m2.K) | ifcx::prop::thermal | [IfcX] |
| solarHeatGainCoefficient | number | - | ifcx::prop::thermal | [IfcX] |
| linearThermalBridge | number | W/(m.K) | ifcx::prop::thermal | [IfcX] |
| lightTransmittance | number | - | ifcx::prop::thermal | [IfcX] |
| airborneSound | number | dB | ifcx::prop::acoustic | [IfcX] |
| spectrumAdaptation_Ctr | number | dB | ifcx::prop::acoustic | [IfcX] |
| loadBearingMinutes | number | min | ifcx::prop::fire | [IfcX] |
| integrityMinutes | number | min | ifcx::prop::fire | [IfcX] |
| insulationMinutes | number | min | ifcx::prop::fire | [IfcX] |
| burglarResistanceClass | string | - | ifcx::prop::fire | [IfcX] |
| ventilationArea | number | m2 | ifcx::prop::mep | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| unitCost | number | EUR | ifcx::prop::cost | [IfcX] |
| maintenanceInterval | number | maanden | ifcx::prop::maintenance | [IfcX] |
| designLife | number | jaar | ifcx::prop::lifecycle | [IfcX] |
| shadingFactor | number | - | ifcx::prop::thermal | [IfcX] |

### 5.4 Kolom (IfcColumn)

#### Bestaande properties (Pset_ColumnCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| IsExternal | boolean | bsi::ifc::prop | [IFC] |
| LoadBearing | boolean | bsi::ifc::prop | [IFC] |
| FireRating | string | bsi::ifc::prop | [IFC] |
| Slope | number | bsi::ifc::prop | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| loadBearingMinutes | number | min | ifcx::prop::fire | [IfcX] |
| reactionToFire | string | - | ifcx::prop::fire | [IfcX] |
| strengthClass | string | - | ifcx::prop::structural | [IfcX] |
| exposureClass | string | - | ifcx::prop::structural | [IfcX] |
| consequenceClass | string | - | ifcx::prop::structural | [IfcX] |
| permanentLoad | number | kN | ifcx::prop::structural | [IfcX] |
| variableLoad | number | kN | ifcx::prop::structural | [IfcX] |
| unityCheck | number | - | ifcx::prop::structural | [IfcX] |
| deflection | number | mm | ifcx::prop::structural | [IfcX] |
| concretecover | number | mm | ifcx::prop::structural | [IfcX] |
| reinforcementRatio | number | % | ifcx::prop::structural | [IfcX] |
| effectiveLength | number | mm | ifcx::prop::structural | [IfcX] |
| bucklingCurve | string | - | ifcx::prop::structural | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| unitCost | number | EUR | ifcx::prop::cost | [IfcX] |
| conditionScore | number | 1-6 | ifcx::prop::maintenance | [IfcX] |
| designLife | number | jaar | ifcx::prop::lifecycle | [IfcX] |

### 5.5 Balk (IfcBeam)

#### Bestaande properties (Pset_BeamCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| IsExternal | boolean | bsi::ifc::prop | [IFC] |
| LoadBearing | boolean | bsi::ifc::prop | [IFC] |
| FireRating | string | bsi::ifc::prop | [IFC] |
| Slope | number | bsi::ifc::prop | [IFC] |
| Roll | number | bsi::ifc::prop | [IFC] |
| Span | number (m) | bsi::ifc::prop | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| loadBearingMinutes | number | min | ifcx::prop::fire | [IfcX] |
| reactionToFire | string | - | ifcx::prop::fire | [IfcX] |
| strengthClass | string | - | ifcx::prop::structural | [IfcX] |
| exposureClass | string | - | ifcx::prop::structural | [IfcX] |
| permanentLoad | number | kN/m | ifcx::prop::structural | [IfcX] |
| variableLoad | number | kN/m | ifcx::prop::structural | [IfcX] |
| unityCheck | number | - | ifcx::prop::structural | [IfcX] |
| deflection | number | mm | ifcx::prop::structural | [IfcX] |
| deflectionLimit | number | mm | ifcx::prop::structural | [IfcX] |
| effectiveSpan | number | mm | ifcx::prop::structural | [IfcX] |
| concretecover | number | mm | ifcx::prop::structural | [IfcX] |
| reinforcementRatio | number | % | ifcx::prop::structural | [IfcX] |
| shearForce | number | kN | ifcx::prop::structural | [IfcX] |
| bendingMoment | number | kNm | ifcx::prop::structural | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| unitCost | number | EUR | ifcx::prop::cost | [IfcX] |
| designLife | number | jaar | ifcx::prop::lifecycle | [IfcX] |

### 5.6 Vloer/Plaat (IfcSlab)

#### Bestaande properties (Pset_SlabCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| IsExternal | boolean | bsi::ifc::prop | [IFC] |
| LoadBearing | boolean | bsi::ifc::prop | [IFC] |
| FireRating | string | bsi::ifc::prop | [IFC] |
| AcousticRating | string | bsi::ifc::prop | [IFC] |
| ThermalTransmittance | number (W/m2K) | bsi::ifc::prop | [IFC] |
| Combustible | boolean | bsi::ifc::prop | [IFC] |
| SurfaceSpreadOfFlame | string | bsi::ifc::prop | [IFC] |
| PitchAngle | number | bsi::ifc::prop | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| thermalResistance | number | m2.K/W | ifcx::prop::thermal | [IfcX] |
| airborneSound | number | dB | ifcx::prop::acoustic | [IfcX] |
| impactSound | number | dB | ifcx::prop::acoustic | [IfcX] |
| spectrumAdaptation_C | number | dB | ifcx::prop::acoustic | [IfcX] |
| loadBearingMinutes | number | min | ifcx::prop::fire | [IfcX] |
| integrityMinutes | number | min | ifcx::prop::fire | [IfcX] |
| insulationMinutes | number | min | ifcx::prop::fire | [IfcX] |
| reactionToFire | string | - | ifcx::prop::fire | [IfcX] |
| strengthClass | string | - | ifcx::prop::structural | [IfcX] |
| permanentLoad | number | kN/m2 | ifcx::prop::structural | [IfcX] |
| variableLoad | number | kN/m2 | ifcx::prop::structural | [IfcX] |
| unityCheck | number | - | ifcx::prop::structural | [IfcX] |
| deflection | number | mm | ifcx::prop::structural | [IfcX] |
| deflectionLimit | number | mm | ifcx::prop::structural | [IfcX] |
| concretecover | number | mm | ifcx::prop::structural | [IfcX] |
| reinforcementRatio | number | % | ifcx::prop::structural | [IfcX] |
| crackWidth | number | mm | ifcx::prop::structural | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| mkiValue | number | EUR/m2 | ifcx::prop::nl::sustainability | [IfcX] |
| unitCost | number | EUR | ifcx::prop::cost | [IfcX] |
| vapourResistance | number | - | ifcx::prop::moisture | [IfcX] |
| designLife | number | jaar | ifcx::prop::lifecycle | [IfcX] |

### 5.7 Dak (IfcRoof)

#### Bestaande properties (Pset_RoofCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| IsExternal | boolean | bsi::ifc::prop | [IFC] |
| FireRating | string | bsi::ifc::prop | [IFC] |
| ThermalTransmittance | number (W/m2K) | bsi::ifc::prop | [IFC] |
| ProjectedArea | number (m2) | bsi::ifc::prop | [IFC] |
| TotalArea | number (m2) | bsi::ifc::prop | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| thermalResistance | number | m2.K/W | ifcx::prop::thermal | [IfcX] |
| solarHeatGainCoefficient | number | - | ifcx::prop::thermal | [IfcX] |
| airborneSound | number | dB | ifcx::prop::acoustic | [IfcX] |
| loadBearingMinutes | number | min | ifcx::prop::fire | [IfcX] |
| reactionToFire | string | - | ifcx::prop::fire | [IfcX] |
| permanentLoad | number | kN/m2 | ifcx::prop::structural | [IfcX] |
| variableLoad | number | kN/m2 | ifcx::prop::structural | [IfcX] |
| snowLoad | number | kN/m2 | ifcx::prop::structural | [IfcX] |
| windLoad | number | kN/m2 | ifcx::prop::structural | [IfcX] |
| waterPenetration | string | - | ifcx::prop::moisture | [IfcX] |
| condensationRisk | boolean | - | ifcx::prop::moisture | [IfcX] |
| vapourResistance | number | - | ifcx::prop::moisture | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| greenRoof | boolean | - | ifcx::prop::sustainability | [IfcX] |
| solarPanelReady | boolean | - | ifcx::prop::sustainability | [IfcX] |
| unitCost | number | EUR | ifcx::prop::cost | [IfcX] |
| designLife | number | jaar | ifcx::prop::lifecycle | [IfcX] |
| maintenanceInterval | number | maanden | ifcx::prop::maintenance | [IfcX] |

### 5.8 Trap (IfcStair)

#### Bestaande properties (Pset_StairCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| FireRating | string | bsi::ifc::prop | [IFC] |
| NumberOfRiser | number | bsi::ifc::prop | [IFC] |
| NumberOfTreads | number | bsi::ifc::prop | [IFC] |
| RiserHeight | number (mm) | bsi::ifc::prop | [IFC] |
| TreadLength | number (mm) | bsi::ifc::prop | [IFC] |
| HandicapAccessible | boolean | bsi::ifc::prop | [IFC] |
| RequiredHeadroom | number (mm) | bsi::ifc::prop | [IFC] |
| HasNonSkidSurface | boolean | bsi::ifc::prop | [IFC] |
| IsExternal | boolean | bsi::ifc::prop | [IFC] |
| NosingLength | number (mm) | bsi::ifc::prop | [IFC] |
| WalkingLineOffset | number (mm) | bsi::ifc::prop | [IFC] |
| TreadLengthAtOffset | number (mm) | bsi::ifc::prop | [IFC] |
| TreadLengthAtInnerSide | number (mm) | bsi::ifc::prop | [IFC] |
| WaistThickness | number (mm) | bsi::ifc::prop | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| loadBearingMinutes | number | min | ifcx::prop::fire | [IfcX] |
| escapeRouteType | string | - | ifcx::prop::fire | [IfcX] |
| escapeRouteWidth | number | mm | ifcx::prop::fire | [IfcX] |
| tactilePaving | boolean | - | ifcx::prop::accessibility | [IfcX] |
| contrastStrip | boolean | - | ifcx::prop::accessibility | [IfcX] |
| handrailHeight | number | mm | ifcx::prop::accessibility | [IfcX] |
| stairAngle | number | graden | ifcx::prop::structural | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| unitCost | number | EUR | ifcx::prop::cost | [IfcX] |
| maintenanceInterval | number | maanden | ifcx::prop::maintenance | [IfcX] |

### 5.9 Balustrade (IfcRailing)

#### Bestaande properties (Pset_RailingCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| IsExternal | boolean | bsi::ifc::prop | [IFC] |
| Height | number (mm) | bsi::ifc::prop | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| infillType | string | - | ifcx::prop::structural | [IfcX] |
| infillSpacing | number | mm | ifcx::prop::structural | [IfcX] |
| horizontalLoad | number | kN/m | ifcx::prop::structural | [IfcX] |
| climbable | boolean | - | ifcx::prop::accessibility | [IfcX] |
| childSafe | boolean | - | ifcx::prop::accessibility | [IfcX] |
| fireRating | string | - | ifcx::prop::fire | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| unitCost | number | EUR/m | ifcx::prop::cost | [IfcX] |
| designLife | number | jaar | ifcx::prop::lifecycle | [IfcX] |

### 5.10 Paal (IfcPile)

#### Bestaande properties (Pset_PileCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| LoadBearing | boolean | bsi::ifc::prop | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| pileType | string | - | ifcx::prop::structural | [IfcX] |
| pileDiameter | number | mm | ifcx::prop::structural | [IfcX] |
| pileLength | number | m | ifcx::prop::structural | [IfcX] |
| designLoad | number | kN | ifcx::prop::structural | [IfcX] |
| bearingCapacity | number | kN | ifcx::prop::structural | [IfcX] |
| frictionCapacity | number | kN | ifcx::prop::structural | [IfcX] |
| tipCapacity | number | kN | ifcx::prop::structural | [IfcX] |
| negativeFriction | number | kN | ifcx::prop::structural | [IfcX] |
| settlementCalculated | number | mm | ifcx::prop::structural | [IfcX] |
| strengthClass | string | - | ifcx::prop::structural | [IfcX] |
| exposureClass | string | - | ifcx::prop::structural | [IfcX] |
| concretecover | number | mm | ifcx::prop::structural | [IfcX] |
| installationMethod | string | - | ifcx::prop::logistics | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| unitCost | number | EUR | ifcx::prop::cost | [IfcX] |
| designLife | number | jaar | ifcx::prop::lifecycle | [IfcX] |

### 5.11 Fundering (IfcFooting)

#### Bestaande properties (Pset_FootingCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| LoadBearing | boolean | bsi::ifc::prop | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| designLoad | number | kN | ifcx::prop::structural | [IfcX] |
| soilBearingCapacity | number | kN/m2 | ifcx::prop::structural | [IfcX] |
| strengthClass | string | - | ifcx::prop::structural | [IfcX] |
| exposureClass | string | - | ifcx::prop::structural | [IfcX] |
| concretecover | number | mm | ifcx::prop::structural | [IfcX] |
| reinforcementRatio | number | % | ifcx::prop::structural | [IfcX] |
| settlementCalculated | number | mm | ifcx::prop::structural | [IfcX] |
| waterproofing | string | - | ifcx::prop::moisture | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| unitCost | number | EUR | ifcx::prop::cost | [IfcX] |
| designLife | number | jaar | ifcx::prop::lifecycle | [IfcX] |

### 5.12 Vliesgevel (IfcCurtainWall)

#### Bestaande properties (Pset_CurtainWallCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| IsExternal | boolean | bsi::ifc::prop | [IFC] |
| FireRating | string | bsi::ifc::prop | [IFC] |
| AcousticRating | string | bsi::ifc::prop | [IFC] |
| ThermalTransmittance | number (W/m2K) | bsi::ifc::prop | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| thermalTransmittanceFrame | number | W/(m2.K) | ifcx::prop::thermal | [IfcX] |
| thermalTransmittanceGlazing | number | W/(m2.K) | ifcx::prop::thermal | [IfcX] |
| solarHeatGainCoefficient | number | - | ifcx::prop::thermal | [IfcX] |
| lightTransmittance | number | - | ifcx::prop::thermal | [IfcX] |
| airborneSound | number | dB | ifcx::prop::acoustic | [IfcX] |
| spectrumAdaptation_Ctr | number | dB | ifcx::prop::acoustic | [IfcX] |
| loadBearingMinutes | number | min | ifcx::prop::fire | [IfcX] |
| integrityMinutes | number | min | ifcx::prop::fire | [IfcX] |
| insulationMinutes | number | min | ifcx::prop::fire | [IfcX] |
| windLoad | number | kN/m2 | ifcx::prop::structural | [IfcX] |
| deflection | number | mm | ifcx::prop::structural | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| unitCost | number | EUR/m2 | ifcx::prop::cost | [IfcX] |
| maintenanceInterval | number | maanden | ifcx::prop::maintenance | [IfcX] |
| designLife | number | jaar | ifcx::prop::lifecycle | [IfcX] |

### 5.13 Plaat (IfcPlate)

#### Bestaande properties (Pset_PlateCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| IsExternal | boolean | bsi::ifc::prop | [IFC] |
| LoadBearing | boolean | bsi::ifc::prop | [IFC] |
| FireRating | string | bsi::ifc::prop | [IFC] |
| AcousticRating | string | bsi::ifc::prop | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| thermalTransmittance | number | W/(m2.K) | ifcx::prop::thermal | [IfcX] |
| airborneSound | number | dB | ifcx::prop::acoustic | [IfcX] |
| loadBearingMinutes | number | min | ifcx::prop::fire | [IfcX] |
| reactionToFire | string | - | ifcx::prop::fire | [IfcX] |
| strengthClass | string | - | ifcx::prop::structural | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| unitCost | number | EUR | ifcx::prop::cost | [IfcX] |
| designLife | number | jaar | ifcx::prop::lifecycle | [IfcX] |

### 5.14 Staf/Ligger (IfcMember)

#### Bestaande properties (Pset_MemberCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| IsExternal | boolean | bsi::ifc::prop | [IFC] |
| LoadBearing | boolean | bsi::ifc::prop | [IFC] |
| FireRating | string | bsi::ifc::prop | [IFC] |
| Slope | number | bsi::ifc::prop | [IFC] |
| Roll | number | bsi::ifc::prop | [IFC] |
| Span | number (m) | bsi::ifc::prop | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| loadBearingMinutes | number | min | ifcx::prop::fire | [IfcX] |
| strengthClass | string | - | ifcx::prop::structural | [IfcX] |
| permanentLoad | number | kN/m | ifcx::prop::structural | [IfcX] |
| variableLoad | number | kN/m | ifcx::prop::structural | [IfcX] |
| unityCheck | number | - | ifcx::prop::structural | [IfcX] |
| deflection | number | mm | ifcx::prop::structural | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| unitCost | number | EUR | ifcx::prop::cost | [IfcX] |
| designLife | number | jaar | ifcx::prop::lifecycle | [IfcX] |

### 5.15 Afwerking (IfcCovering)

#### Bestaande properties (Pset_CoveringCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| IsExternal | boolean | bsi::ifc::prop | [IFC] |
| FireRating | string | bsi::ifc::prop | [IFC] |
| AcousticRating | string | bsi::ifc::prop | [IFC] |
| FlammabilityRating | string | bsi::ifc::prop | [IFC] |
| Combustible | boolean | bsi::ifc::prop | [IFC] |
| SurfaceSpreadOfFlame | string | bsi::ifc::prop | [IFC] |
| ThermalTransmittance | number (W/m2K) | bsi::ifc::prop | [IFC] |
| Finish | string | bsi::ifc::prop | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| soundAbsorption | number | - | ifcx::prop::acoustic | [IfcX] |
| reactionToFire | string | - | ifcx::prop::fire | [IfcX] |
| smokeProduction | string | - | ifcx::prop::fire | [IfcX] |
| slipResistance | string | - | ifcx::prop::accessibility | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| recycledContent | number | % | ifcx::prop::sustainability | [IfcX] |
| unitCost | number | EUR/m2 | ifcx::prop::cost | [IfcX] |
| maintenanceInterval | number | maanden | ifcx::prop::maintenance | [IfcX] |
| cleaningMethod | string | - | ifcx::prop::maintenance | [IfcX] |
| designLife | number | jaar | ifcx::prop::lifecycle | [IfcX] |

### 5.16 Hellingbaan (IfcRamp)

#### Bestaande properties (Pset_RampCommon)

| Property | Type | Namespace | Bron |
|----------|------|-----------|------|
| Reference | string | bsi::ifc::prop | [IFC] |
| Status | enum | bsi::ifc::prop | [IFC] |
| FireRating | string | bsi::ifc::prop | [IFC] |
| HandicapAccessible | boolean | bsi::ifc::prop | [IFC] |
| RequiredSlope | number | bsi::ifc::prop | [IFC] |
| RequiredWidth | number (mm) | bsi::ifc::prop | [IFC] |
| IsExternal | boolean | bsi::ifc::prop | [IFC] |
| HasNonSkidSurface | boolean | bsi::ifc::prop | [IFC] |

#### Nieuwe IfcX properties

| Property | Type | Eenheid | Namespace | Status |
|----------|------|---------|-----------|--------|
| actualSlope | number | % | ifcx::prop::accessibility | [IfcX] |
| landingLength | number | mm | ifcx::prop::accessibility | [IfcX] |
| tactilePaving | boolean | - | ifcx::prop::accessibility | [IfcX] |
| wheelchairAccessible | boolean | - | ifcx::prop::accessibility | [IfcX] |
| escapeRouteType | string | - | ifcx::prop::fire | [IfcX] |
| gwp | number | kg CO2-eq | ifcx::prop::sustainability | [IfcX] |
| unitCost | number | EUR | ifcx::prop::cost | [IfcX] |

---

## 6. NL-specifieke PSETs

### 6.1 BBL (Besluit bouwwerken leefomgeving) / Bouwbesluit

Het BBL (opvolger van het Bouwbesluit 2012 onder de Omgevingswet) stelt eisen aan bouwwerken op het gebied van veiligheid, gezondheid, bruikbaarheid, energiezuinigheid en milieu.

#### `ifcx::prop::nl::bbl::*`

| Property | Type | Eenheid | Beschrijving | BBL-artikel |
|----------|------|---------|-------------|-------------|
| `wbdbo` | number | min | Weerstand tegen branddoorslag en brandoverslag | Afd. 2.2 |
| `fireCompartmentMaxArea` | number | m2 | Maximale oppervlakte brandcompartiment | Art. 2.83-2.88 |
| `escapeRouteLength` | number | m | Loopafstand tot veilige plek | Art. 2.107 |
| `escapeRouteWidth` | number | mm | Vrije breedte vluchtroute | Art. 2.108 |
| `subbrandcompartiment` | boolean | - | Subbrandcompartiment | Art. 2.89 |
| `daglichtfactor` | number | % | Equivalente daglichtoppervlakte | Afd. 3.5 |
| `ventilationCapacity` | number | dm3/s | Ventilatiecapaciteit | Afd. 3.4 |
| `spuiCapacity` | number | dm3/s | Spuiventilatiecapaciteit | Afd. 3.4 |
| `airborneSound_ilu` | number | dB | Luchtgeluidsisolatie (Ilu;k) | Afd. 3.1 |
| `impactSound_ico` | number | dB | Contactgeluidniveau (Ico) | Afd. 3.1 |
| `facadeSound_ga` | number | dB | Geluidwering gevel (GA;k) | Afd. 3.2 |
| `thermalResistance_rc` | number | m2.K/W | Warmteweerstand Rc | Afd. 5.1 |
| `thermalTransmittance_u` | number | W/(m2.K) | Warmtedoorgangscoefficient U | Afd. 5.1 |
| `moisturePerformance` | string | - | Vochtwerendheid | Afd. 3.6 |
| `accessibilityCompliant` | boolean | - | Voldoet aan toegankelijkheidseisen | Afd. 4.3-4.5 |
| `minFloorArea` | number | m2 | Minimaal gebruiksoppervlak | Afd. 4.1 |
| `minCeilingHeight` | number | m | Minimale vrije hoogte | Afd. 4.2 |

### 6.2 BENG (Bijna Energieneutrale Gebouwen)

BENG-eisen gelden voor alle nieuwbouw sinds 1 januari 2021. De drie BENG-indicatoren moeten per gebouw worden vastgesteld.

#### `ifcx::prop::nl::beng::*`

| Property | Type | Eenheid | Beschrijving |
|----------|------|---------|-------------|
| `beng1` | number | kWh/(m2.jaar) | Energiebehoefte (maximale energievraag) |
| `beng2` | number | kWh/(m2.jaar) | Primair fossiel energiegebruik |
| `beng3` | number | % | Aandeel hernieuwbare energie |
| `to` | number | h | Temperatuuroverschrijding (TO juli) |
| `energyLabel` | string | - | Energielabel (A++++ t/m G) |
| `energyIndex` | number | - | Energie-index (bestaande bouw) |
| `gebouwfunctie` | string | - | Gebruiksfunctie (wonen, kantoor, onderwijs, etc.) |
| `verwarmingsysteem` | string | - | Type verwarmingssysteem |
| `koudesysteem` | string | - | Type koudesysteem |
| `ventilatiesysteem` | string | - | Type ventilatiesysteem (A, B, C, D) |
| `warmteterugwinning` | number | % | Rendement warmteterugwinning |
| `zonnepanelen` | number | Wp | Opgesteld vermogen PV |
| `zonneboiler` | number | m2 | Oppervlakte zonnecollectoren |
| `warmtepomp` | boolean | - | Warmtepomp aanwezig |
| `warmtepompCOP` | number | - | COP warmtepomp |
| `warmtenet` | boolean | - | Aangesloten op warmtenet |

### 6.3 Aerius (Stikstof)

Sinds de PAS-uitspraak van de Raad van State (2019) is stikstofdepositie een cruciale factor bij bouwvergunningen.

#### `ifcx::prop::nl::aerius::*`

| Property | Type | Eenheid | Beschrijving |
|----------|------|---------|-------------|
| `noxEmission` | number | kg/jaar | NOx-emissie per jaar (gebruiksfase) |
| `nh3Emission` | number | kg/jaar | NH3-emissie per jaar |
| `noxConstruction` | number | kg | NOx-emissie bouwfase |
| `aeruisCalculationId` | string | - | Aerius-berekeningsnummer |
| `natura2000Impact` | boolean | - | Significant effect op Natura 2000-gebied |
| `depositionValue` | number | mol/ha/jaar | Berekende stikstofdepositie |
| `emissionSource` | string | - | Emissiebron (verwarming, verkeer, bouwmaterieel) |
| `naturalGasFree` | boolean | - | Aardgasvrij |
| `heatingEmissionClass` | string | - | Emissieklasse verwarmingssysteem |

### 6.4 NL-SfB Mapping

De koppeling tussen IfcX-nodes en NL/SfB-classificatie verloopt via het bestaande `bsi::ifc::classification`-mechanisme, aangevuld met IfcX-specifieke velden.

#### `ifcx::prop::nl::classification::*`

| Property | Type | Beschrijving |
|----------|------|-------------|
| `nlsfbCode` | string | NL/SfB-elementcode (bijv. "21" = buitenwanden) |
| `nlsfbTable1` | string | Tabel 1: Functionele elementen |
| `nlsfbTable2` | string | Tabel 2: Producten |
| `nlsfbTable3` | string | Tabel 3: Materialen |
| `stabuCode` | string | STABU-code |
| `rawCode` | string | RAW-code (GWW-sector) |
| `etimCode` | string | ETIM-artikelcode (elektrotechnisch) |
| `cbNlUri` | string | CB-NL URI (linked-data koppeling) |

**Voorbeeld NL/SfB-mapping:**

| NL/SfB | Omschrijving | IfcClass | IfcX-type |
|--------|-------------|----------|-----------|
| 13 | Vloeren op grondslag | IfcSlab | BASESLAB |
| 21 | Buitenwanden | IfcWall | (IsExternal=true) |
| 22 | Binnenwanden | IfcWall | (IsExternal=false) |
| 23 | Vloeren | IfcSlab | FLOOR |
| 24 | Trappen en hellingen | IfcStair / IfcRamp | - |
| 27 | Daken | IfcRoof | - |
| 28 | Hoofddraagconstructie | IfcBeam / IfcColumn | (LoadBearing=true) |
| 31 | Buitenwandopeningen | IfcDoor / IfcWindow | (IsExternal=true) |
| 32 | Binnenwandopeningen | IfcDoor / IfcWindow | (IsExternal=false) |
| 33 | Vloeropeningen | IfcOpening | - |
| 41 | Buitenwandafwerkingen | IfcCovering | (IsExternal=true) |
| 42 | Binnenwandafwerkingen | IfcCovering | (IsExternal=false) |
| 43 | Vloerafwerkingen | IfcCovering | FLOORING |
| 45 | Plafondafwerkingen | IfcCovering | CEILING |
| 52 | Riolering/afvoer | IfcPipeSegment | - |
| 56 | Verwarming | IfcSpaceHeater / IfcBoiler | - |
| 57 | Ventilatie/luchtbehandeling | IfcAirTerminal / IfcFan | - |
| 61 | Elektrische installatie | IfcCableSegment / IfcOutlet | - |
| 64 | Verlichting | IfcLightFixture | - |
| 65 | Communicatie-installatie | IfcCommunicationsAppliance | - |

### 6.5 BIM Basis ILS Compliance

De BIM Basis ILS definieert minimale informatievereisten voor BIM-modellen in Nederland. IfcX garandeert compliance door de volgende vereisten als validatieregels te implementeren.

#### Verplichte properties per element (BIM Basis ILS)

| Vereiste | IfcX Property | Validatieregel |
|----------|--------------|----------------|
| NL/SfB-classificatie | `ifcx::prop::nl::classification::nlsfbCode` | Verplicht voor alle bouwelementen |
| LoadBearing | `bsi::ifc::prop::LoadBearing` | Verplicht voor wanden, vloeren, kolommen, balken |
| IsExternal | `bsi::ifc::prop::IsExternal` | Verplicht voor wanden, vloeren, daken, deuren, ramen |
| FireRating | `bsi::ifc::prop::FireRating` of `ifcx::prop::fire::fireResistanceClass` | Verplicht voor scheidingsconstructies |
| Material | `bsi::ifc::material` | Verplicht voor alle bouwelementen |

#### Aanbevolen aanvullende properties (BIM Basis ILS+)

| Vereiste | IfcX Property | Toelichting |
|----------|--------------|-------------|
| Rc-waarde | `ifcx::prop::thermal::thermalResistance` | Aanbevolen voor uitwendige scheidingsconstructies |
| U-waarde | `ifcx::prop::thermal::thermalTransmittance` | Aanbevolen voor ramen, deuren, vliesgevels |
| Akoestiek | `ifcx::prop::acoustic::airborneSound` | Aanbevolen voor scheidingsconstructies |
| BENG | `ifcx::prop::nl::beng::beng1` t/m `beng3` | Aanbevolen voor nieuwbouw op gebouwniveau |
| MKI | `ifcx::prop::nl::sustainability::mkiValue` | Aanbevolen voor MPG-berekening |
| Conditie | `ifcx::prop::maintenance::conditionScore` | Aanbevolen voor bestaande bouw (NEN 2767) |

#### NL-specifieke duurzaamheidsextensie (`ifcx::prop::nl::sustainability::*`)

| Property | Type | Eenheid | Beschrijving |
|----------|------|---------|-------------|
| `mkiValue` | number | EUR | Milieukostenindicator (per functionele eenheid) |
| `mpgScore` | number | EUR/m2.jaar | Milieuprestatie Gebouwen score |
| `nmdProductId` | string | - | Product-ID in Nationale Milieudatabase |
| `nmdCategory` | number | 1-3 | NMD-categorie (1=merkgebonden, 2=merkongebonden, 3=generiek) |
| `circularityPassport` | string | - | Referentie naar materialenpaspoort |
| `madasterReference` | string | - | Madaster registratie-ID |
| `parisProofTarget` | number | kg CO2/m2.jaar | Paris Proof-doelstelling |
| `dutchGreenBuildingLabel` | string | - | GPR Gebouw score |

---

## 7. Implementatie en Migratie

### 7.1 Schema-import

De IfcX property schema's worden beschikbaar als importeerbare schema's:

```json
{
  "imports": [
    {"uri": "https://ifcx.dev/@standards.buildingsmart.org/ifc/core/prop@v5a.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/prop/thermal@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/prop/acoustic@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/prop/fire@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/prop/structural@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/prop/sustainability@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/prop/cost@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/prop/maintenance@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/prop/lifecycle@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/prop/nl@v1.ifcx"}
  ]
}
```

### 7.2 Mapping vanuit IFC4x3

Bij conversie van een IFC4x3 STEP-bestand naar IfcX worden bestaande Pset-properties automatisch gemapped:

| IFC4x3 Pset Property | IfcX Namespace | Transformatie |
|-----------------------|---------------|--------------|
| `Pset_WallCommon.ThermalTransmittance` | `bsi::ifc::prop::ThermalTransmittance` | Directe overname (IFC5-pad) |
| `Pset_WallCommon.FireRating` | `bsi::ifc::prop::FireRating` + `ifcx::prop::fire::*` | Tekst wordt geparsed naar R/E/I-waarden |
| `Pset_WallCommon.AcousticRating` | `bsi::ifc::prop::AcousticRating` + `ifcx::prop::acoustic::*` | Tekst wordt geparsed naar Rw/Ctr-waarden |
| Custom Pset properties | `ifcx::prop::custom::<psetName>::<propName>` | Onbekende properties als custom namespace |

### 7.3 Validatie

IfcX biedt JSON Schema-validatie voor alle properties:

```json
{
  "ifcx::prop::thermal::thermalTransmittance": {
    "type": "number",
    "minimum": 0,
    "maximum": 10,
    "unit": "W/(m2.K)"
  },
  "ifcx::prop::fire::loadBearingMinutes": {
    "type": "number",
    "minimum": 0,
    "maximum": 360,
    "enum_common": [0, 15, 20, 30, 45, 60, 90, 120, 180, 240],
    "unit": "min"
  },
  "ifcx::prop::fire::reactionToFire": {
    "type": "string",
    "enum": ["A1", "A2", "B", "C", "D", "E", "F"]
  }
}
```

### 7.4 bSDD-integratie

Alle IfcX property-definities worden gepubliceerd als een bSDD Dictionary, zodat ze:
- Vindbaar zijn via de bSDD Search Portal
- Koppelbaar zijn aan bestaande bSDD-dictionaries (IFC, ETIM, NL/SfB)
- Meertalig beschikbaar zijn (EN, NL, DE, FR)

### 7.5 Fasering

| Fase | Termijn | Scope |
|------|---------|-------|
| **Fase 1** | Q2 2026 | Thermische, akoestische en brandproperties (dekking BBL/BENG) |
| **Fase 2** | Q3 2026 | Constructieve en duurzaamheidsproperties (dekking MPG/MKI) |
| **Fase 3** | Q4 2026 | Kosten, onderhoud, levenscyclus (dekking FM/NEN 2767) |
| **Fase 4** | Q1 2027 | MEP-uitbreidingen en nationale extensies (UK, DE, FR) |
| **Fase 5** | Q2 2027 | bSDD-publicatie en validatietool |

---

## Bijlage A: Overzicht van alle IfcX Property Namespaces

```
ifcx::prop::thermal::thermalTransmittance
ifcx::prop::thermal::thermalResistance
ifcx::prop::thermal::thermalConductivity
ifcx::prop::thermal::linearThermalBridge
ifcx::prop::thermal::pointThermalBridge
ifcx::prop::thermal::specificHeatCapacity
ifcx::prop::thermal::thermalMass
ifcx::prop::thermal::solarHeatGainCoefficient
ifcx::prop::thermal::shadingCoefficient
ifcx::prop::thermal::temperatureFactorInner
ifcx::prop::thermal::thermalTransmittanceFrame
ifcx::prop::thermal::thermalTransmittanceGlazing
ifcx::prop::thermal::lightTransmittance
ifcx::prop::thermal::shadingFactor

ifcx::prop::acoustic::airborneSound
ifcx::prop::acoustic::impactSound
ifcx::prop::acoustic::spectrumAdaptation_C
ifcx::prop::acoustic::spectrumAdaptation_Ctr
ifcx::prop::acoustic::soundAbsorption
ifcx::prop::acoustic::soundReduction
ifcx::prop::acoustic::flanking
ifcx::prop::acoustic::reverberation
ifcx::prop::acoustic::noiseRating

ifcx::prop::fire::loadBearingMinutes
ifcx::prop::fire::integrityMinutes
ifcx::prop::fire::insulationMinutes
ifcx::prop::fire::fireResistanceClass
ifcx::prop::fire::reactionToFire
ifcx::prop::fire::smokeProduction
ifcx::prop::fire::burningDroplets
ifcx::prop::fire::smokeResistance
ifcx::prop::fire::fireCompartmentId
ifcx::prop::fire::fireCompartmentArea
ifcx::prop::fire::escapeRouteType
ifcx::prop::fire::sprinklerProtected
ifcx::prop::fire::securityClass
ifcx::prop::fire::burglarResistanceClass

ifcx::prop::structural::permanentLoad
ifcx::prop::structural::variableLoad
ifcx::prop::structural::windLoad
ifcx::prop::structural::snowLoad
ifcx::prop::structural::seismicZone
ifcx::prop::structural::deflection
ifcx::prop::structural::deflectionLimit
ifcx::prop::structural::unityCheck
ifcx::prop::structural::consequenceClass
ifcx::prop::structural::reliabilityClass
ifcx::prop::structural::exposureClass
ifcx::prop::structural::strengthClass
ifcx::prop::structural::reinforcementRatio
ifcx::prop::structural::concretecover
ifcx::prop::structural::crackWidth
ifcx::prop::structural::effectiveSpan
ifcx::prop::structural::effectiveLength
ifcx::prop::structural::bucklingCurve
ifcx::prop::structural::shearForce
ifcx::prop::structural::bendingMoment
ifcx::prop::structural::designLoad
ifcx::prop::structural::bearingCapacity
ifcx::prop::structural::frictionCapacity
ifcx::prop::structural::tipCapacity
ifcx::prop::structural::negativeFriction
ifcx::prop::structural::settlementCalculated
ifcx::prop::structural::soilBearingCapacity
ifcx::prop::structural::horizontalLoad
ifcx::prop::structural::infillType
ifcx::prop::structural::infillSpacing
ifcx::prop::structural::pileType
ifcx::prop::structural::pileDiameter
ifcx::prop::structural::pileLength
ifcx::prop::structural::stairAngle

ifcx::prop::sustainability::gwp
ifcx::prop::sustainability::gwpTotal
ifcx::prop::sustainability::embodiedEnergy
ifcx::prop::sustainability::embodiedCarbon
ifcx::prop::sustainability::epdReference
ifcx::prop::sustainability::epdUrl
ifcx::prop::sustainability::circularityIndex
ifcx::prop::sustainability::recycledContent
ifcx::prop::sustainability::reusePotential
ifcx::prop::sustainability::wasteCategory
ifcx::prop::sustainability::biobased
ifcx::prop::sustainability::toxicSubstances
ifcx::prop::sustainability::greenRoof
ifcx::prop::sustainability::solarPanelReady

ifcx::prop::cost::unitCost
ifcx::prop::cost::unitCostCurrency
ifcx::prop::cost::totalCost
ifcx::prop::cost::costCategory
ifcx::prop::cost::costDate
ifcx::prop::cost::costIndex
ifcx::prop::cost::laborCost
ifcx::prop::cost::materialCost
ifcx::prop::cost::installationCost

ifcx::prop::maintenance::maintenanceInterval
ifcx::prop::maintenance::maintenanceType
ifcx::prop::maintenance::maintenanceCost
ifcx::prop::maintenance::replacementCost
ifcx::prop::maintenance::replacementYear
ifcx::prop::maintenance::conditionScore
ifcx::prop::maintenance::conditionDate
ifcx::prop::maintenance::cleaningMethod
ifcx::prop::maintenance::accessForMaintenance

ifcx::prop::lifecycle::designLife
ifcx::prop::lifecycle::expectedLife
ifcx::prop::lifecycle::installationDate
ifcx::prop::lifecycle::commissioningDate
ifcx::prop::lifecycle::decommissioningDate
ifcx::prop::lifecycle::phase
ifcx::prop::lifecycle::constructionSequence
ifcx::prop::lifecycle::leadTime
ifcx::prop::lifecycle::operationCycles

ifcx::prop::moisture::vapourResistance
ifcx::prop::moisture::sdValue
ifcx::prop::moisture::waterAbsorption
ifcx::prop::moisture::waterPenetration
ifcx::prop::moisture::condensationRisk
ifcx::prop::moisture::waterproofing

ifcx::prop::accessibility::wheelchairAccessible
ifcx::prop::accessibility::doorClearWidth
ifcx::prop::accessibility::thresholdHeight
ifcx::prop::accessibility::tactilePaving
ifcx::prop::accessibility::hearingLoop
ifcx::prop::accessibility::brailleSignage
ifcx::prop::accessibility::contrastStrip
ifcx::prop::accessibility::handrailHeight
ifcx::prop::accessibility::landingLength
ifcx::prop::accessibility::actualSlope
ifcx::prop::accessibility::slipResistance
ifcx::prop::accessibility::climbable
ifcx::prop::accessibility::childSafe

ifcx::prop::mep::flowRate
ifcx::prop::mep::pressureDrop
ifcx::prop::mep::powerConsumption
ifcx::prop::mep::efficiency
ifcx::prop::mep::noiseLevel
ifcx::prop::mep::refrigerantType
ifcx::prop::mep::gwpRefrigerant
ifcx::prop::mep::seer
ifcx::prop::mep::scop
ifcx::prop::mep::insulationThickness
ifcx::prop::mep::systemType
ifcx::prop::mep::systemPressure
ifcx::prop::mep::designTemperature
ifcx::prop::mep::ventilationArea

ifcx::prop::logistics::installationMethod

ifcx::prop::nl::bbl::wbdbo
ifcx::prop::nl::bbl::fireCompartmentMaxArea
ifcx::prop::nl::bbl::escapeRouteLength
ifcx::prop::nl::bbl::escapeRouteWidth
ifcx::prop::nl::bbl::subbrandcompartiment
ifcx::prop::nl::bbl::daglichtfactor
ifcx::prop::nl::bbl::ventilationCapacity
ifcx::prop::nl::bbl::spuiCapacity
ifcx::prop::nl::bbl::airborneSound_ilu
ifcx::prop::nl::bbl::impactSound_ico
ifcx::prop::nl::bbl::facadeSound_ga
ifcx::prop::nl::bbl::thermalResistance_rc
ifcx::prop::nl::bbl::thermalTransmittance_u
ifcx::prop::nl::bbl::moisturePerformance
ifcx::prop::nl::bbl::accessibilityCompliant
ifcx::prop::nl::bbl::minFloorArea
ifcx::prop::nl::bbl::minCeilingHeight

ifcx::prop::nl::beng::beng1
ifcx::prop::nl::beng::beng2
ifcx::prop::nl::beng::beng3
ifcx::prop::nl::beng::to
ifcx::prop::nl::beng::energyLabel
ifcx::prop::nl::beng::energyIndex
ifcx::prop::nl::beng::gebouwfunctie
ifcx::prop::nl::beng::verwarmingsysteem
ifcx::prop::nl::beng::koudesysteem
ifcx::prop::nl::beng::ventilatiesysteem
ifcx::prop::nl::beng::warmteterugwinning
ifcx::prop::nl::beng::zonnepanelen
ifcx::prop::nl::beng::zonneboiler
ifcx::prop::nl::beng::warmtepomp
ifcx::prop::nl::beng::warmtepompCOP
ifcx::prop::nl::beng::warmtenet

ifcx::prop::nl::aerius::noxEmission
ifcx::prop::nl::aerius::nh3Emission
ifcx::prop::nl::aerius::noxConstruction
ifcx::prop::nl::aerius::aeruisCalculationId
ifcx::prop::nl::aerius::natura2000Impact
ifcx::prop::nl::aerius::depositionValue
ifcx::prop::nl::aerius::emissionSource
ifcx::prop::nl::aerius::naturalGasFree
ifcx::prop::nl::aerius::heatingEmissionClass

ifcx::prop::nl::classification::nlsfbCode
ifcx::prop::nl::classification::nlsfbTable1
ifcx::prop::nl::classification::nlsfbTable2
ifcx::prop::nl::classification::nlsfbTable3
ifcx::prop::nl::classification::stabuCode
ifcx::prop::nl::classification::rawCode
ifcx::prop::nl::classification::etimCode
ifcx::prop::nl::classification::cbNlUri

ifcx::prop::nl::sustainability::mkiValue
ifcx::prop::nl::sustainability::mpgScore
ifcx::prop::nl::sustainability::nmdProductId
ifcx::prop::nl::sustainability::nmdCategory
ifcx::prop::nl::sustainability::circularityPassport
ifcx::prop::nl::sustainability::madasterReference
ifcx::prop::nl::sustainability::parisProofTarget
ifcx::prop::nl::sustainability::dutchGreenBuildingLabel
```

---

## Bijlage B: Voorbeeld IfcX-bestand met properties

```json
{
  "header": {
    "ifcxVersion": "2.0",
    "id": "voorbeeld-project-001"
  },
  "imports": [
    {"uri": "https://ifcx.dev/@standards.buildingsmart.org/ifc/core/ifc@v5a.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/prop/thermal@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/prop/fire@v1.ifcx"},
    {"uri": "https://ifcx.openaec.org/schemas/prop/nl@v1.ifcx"}
  ],
  "data": [
    {
      "path": "/project/gebouw/verdieping-0/buitenwand-01",
      "inherits": ["/types/wand-buitengevel-hsb"],
      "attributes": {
        "bsi::ifc::class": {"code": "IfcWall"},
        "bsi::ifc::material": {"code": "Houtskeletbouw"},
        "bsi::ifc::prop::IsExternal": true,
        "bsi::ifc::prop::LoadBearing": true,
        "bsi::ifc::prop::FireRating": "REI 60",
        "bsi::ifc::prop::ThermalTransmittance": 0.22,

        "ifcx::prop::thermal::thermalResistance": 4.5,
        "ifcx::prop::thermal::linearThermalBridge": 0.05,

        "ifcx::prop::acoustic::airborneSound": 52,
        "ifcx::prop::acoustic::spectrumAdaptation_Ctr": -6,

        "ifcx::prop::fire::loadBearingMinutes": 60,
        "ifcx::prop::fire::integrityMinutes": 60,
        "ifcx::prop::fire::insulationMinutes": 60,
        "ifcx::prop::fire::reactionToFire": "B",
        "ifcx::prop::fire::smokeProduction": "s2",
        "ifcx::prop::fire::fireCompartmentId": "BC-01",

        "ifcx::prop::structural::permanentLoad": 1.8,

        "ifcx::prop::sustainability::gwp": 24.5,
        "ifcx::prop::sustainability::epdReference": "EPD-NL-2024-0456",

        "ifcx::prop::nl::classification::nlsfbCode": "21",
        "ifcx::prop::nl::bbl::wbdbo": 60,
        "ifcx::prop::nl::sustainability::mkiValue": 12.30,
        "ifcx::prop::nl::sustainability::nmdProductId": "NMD-HSB-0234",
        "ifcx::prop::nl::sustainability::nmdCategory": 2,

        "ifcx::prop::cost::unitCost": 285,
        "ifcx::prop::cost::unitCostCurrency": "EUR",

        "ifcx::prop::lifecycle::designLife": 75,
        "ifcx::prop::maintenance::conditionScore": 1
      }
    }
  ]
}
```

---

*Dit document is een levend specificatiedocument. Feedback en aanvullingen zijn welkom via het IfcX project repository.*
