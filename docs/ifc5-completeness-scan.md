# IFC5 Compleetheid Scan - Schema Graph

**Datum:** 2026-03-25
**Doel:** Controleren of de huidige schema-graph (`schema-graph.html`) compleet is ten opzichte van de IFC5-specificatie.

---

## 1. Huidige Staat

De schema-graph bevat **186 nodes** verdeeld over de volgende categorieen:

### Spatial (8 nodes)
- IfcProject, IfcSite, IfcBuilding, IfcBuildingStorey, IfcSpace, IfcZone, IfcGrid, IfcGridAxis

### Building Elements (19 nodes)
- IfcWall, IfcDoor, IfcWindow, IfcColumn, IfcBeam, IfcSlab, IfcRoof, IfcStair, IfcStairFlight, IfcRamp, IfcRailing, IfcCurtainWall, IfcCovering, IfcPlate, IfcMember, IfcFooting, IfcPile, IfcOpeningElement, IfcFurnishingElement

### Types (6 nodes)
- IfcWallType, IfcDoorType, IfcWindowType, IfcColumnType, IfcBeamType, IfcSlabType

### MEP (16 nodes)
- IfcDistributionSystem, IfcDistributionElement, IfcFlowSegment, IfcFlowFitting, IfcFlowTerminal, IfcFlowController, IfcEnergyConversionDevice, IfcSanitaryTerminal, IfcLightFixture, IfcOutlet, IfcSensor, IfcValve, IfcBoiler, IfcAirTerminal, IfcDuctSegment, IfcPipeSegment

### Structural (12 nodes)
- IfcStructuralAnalysisModel, IfcStructuralCurveMember, IfcStructuralSurfaceMember, IfcStructuralConnection, IfcReinforcingElement, IfcReinforcingBar, IfcReinforcingBarType, IfcReinforcingMesh, IfcReinforcingMeshType, IfcTendon, IfcTendonAnchor, IfcTendonConduit

### Infrastructure (7 nodes)
- IfcFacility, IfcAlignment, IfcRoad, IfcRailway, IfcBridge, IfcTunnel, IfcMarineFacility

### Material & Properties (8 nodes)
- IfcMaterial, IfcMaterialLayerSet, IfcMaterialProfileSet, IfcMaterialConstituentSet, IfcPropertySet, IfcElementQuantity, IfcClassification, IfcClassificationReference

### Cost (4 nodes)
- IfcCostSchedule, IfcCostItem, IfcCostValue, IfcConstructionResource

### IFC Geometrie (11 nodes)
- IfcRepresentation, IfcExtrudedAreaSolid, IfcFacetedBrep, IfcCsgSolid, IfcSweptAreaSolid, IfcRevolvedAreaSolid, IfcProfileDef, IfcRectangleProfileDef, IfcCircleProfileDef, IfcIShapeProfileDef, IfcMappedItem

### USD (6 nodes)
- UsdGeomMesh, UsdGeomBasisCurves, UsdGeomPoints, UsdXformOp, UsdGeomVisibility, UsdShadeMaterial

### IfcX-eigen concepten (~95 nodes)
- Drawings, Views, Geometry types, Annotations, Hatches, Styles, Layers, Sheets, Components, Branding, Reports, BCF, Standards/Rules, Calc/Formulas, Package formats, Git, Revisions, GIS, Images

---

## 2. Wat Ontbreekt

### 2.1 Proces & Planning (4D) -- VOLLEDIG AFWEZIG

De graph bevat **geen enkele** proces- of planningsentiteit. In IFC4x3 (en naar verwachting ook in IFC5) zijn dit kernentiteiten:

| Entiteit | Beschrijving |
|---|---|
| **IfcProcess** | Abstracte basis voor processen |
| **IfcTask** | Taak met duur, status, prioriteit |
| **IfcTaskTime** | Tijdsinformatie (start, einde, duur) |
| **IfcTaskTimeRecurring** | Herhalende taken |
| **IfcEvent** | Gebeurtenis (bijv. oplevering) |
| **IfcProcedure** | Procedure/werkwijze |
| **IfcWorkPlan** | Werkplan (container voor werkschema's) |
| **IfcWorkSchedule** | Werkschema / planning |
| **IfcWorkCalendar** | Werkkalender (werkdagen, feestdagen) |
| **IfcRelSequence** | Volgorde relatie (FS, SS, FF, SF) |
| **IfcRelAssignsToProcess** | Koppeling element aan taak |
| **IfcLagTime** | Wachttijd tussen taken |

**Impact:** Zonder deze entiteiten is 4D-planning (tijdgebonden bouwvolgorde) onmogelijk.

### 2.2 Actoren & Organisaties -- VOLLEDIG AFWEZIG

| Entiteit | Beschrijving |
|---|---|
| **IfcActor** | Persoon/organisatie in een rol |
| **IfcPerson** | Persoon (naam, adres, rollen) |
| **IfcOrganization** | Organisatie |
| **IfcPersonAndOrganization** | Combinatie persoon + organisatie |
| **IfcActorRole** | Rol (architect, aannemer, opdrachtgever) |
| **IfcRelAssignsToActor** | Toewijzing van objecten aan een actor |
| **IfcApplication** | Software-applicatie die het model genereerde |
| **IfcOwnerHistory** | Eigendomsgeschiedenis (wie, wanneer, welke app) |

**Impact:** Geen traceerbaarheid van wie wat heeft gemaakt of gewijzigd.

### 2.3 Goedkeuring & Beperkingen -- VOLLEDIG AFWEZIG

| Entiteit | Beschrijving |
|---|---|
| **IfcApproval** | Goedkeuringsobject (status, datum, goedkeurder) |
| **IfcRelAssociatesApproval** | Koppeling goedkeuring aan objecten |
| **IfcConstraint** | Beperking / eis (abstracte basis) |
| **IfcObjective** | Doelstelling (subtype van constraint) |
| **IfcMetric** | Meetbare eis met benchmark |
| **IfcRelAssociatesConstraint** | Koppeling beperking aan objecten |

### 2.4 Relatie-entiteiten -- GROTENDEELS AFWEZIG

De graph toont relaties als pijlen, maar de expliciete IFC-relatie-entiteiten ontbreken als nodes:

| Entiteit | Beschrijving |
|---|---|
| **IfcRelAggregates** | Decompositie (project > site > gebouw > verdieping) |
| **IfcRelContainedInSpatialStructure** | Element zit in ruimtelijke structuur |
| **IfcRelDefinesByType** | Element is gedefinieerd door een type |
| **IfcRelDefinesByProperties** | Propertysets gekoppeld aan element |
| **IfcRelAssociatesMaterial** | Materiaal gekoppeld aan element |
| **IfcRelAssociatesClassification** | Classificatie gekoppeld aan element |
| **IfcRelConnectsElements** | Verbinding tussen elementen |
| **IfcRelConnectsPortToElement** | Poort verbonden aan element (MEP) |
| **IfcRelFillsElement** | Deur/raam vult opening |
| **IfcRelVoidsElement** | Opening in een element |
| **IfcRelSpaceBoundary** | Ruimtegrens (in IFC5 wordt dit een object i.p.v. relatie) |
| **IfcRelNests** | Geneste objecten |
| **IfcRelDeclares** | Declaratie in project context |

**Opmerking:** In IFC5 wordt het relatie-model vereenvoudigd via de ECS-aanpak (Entity Component System), waarbij veel van deze relaties via de USD-achtige scene-hierarchie worden afgehandeld. Toch is het waardevol om de concepten te tonen.

### 2.5 Geotechniek -- VOLLEDIG AFWEZIG

Deze entiteiten zijn nieuw in IFC4x3 en worden ook in IFC5 verwacht:

| Entiteit | Beschrijving |
|---|---|
| **IfcBorehole** | Boring / sondering |
| **IfcGeomodel** | Geologisch model |
| **IfcGeoslice** | Geologische doorsnede |
| **IfcGeotechnicalAssembly** | Geotechnisch samengesteld element |
| **IfcGeotechnicalElement** | Geotechnisch element (basis) |
| **IfcGeotechnicalStratum** | Grondlaag |
| **IfcSolidStratum** | Vaste grondlaag |
| **IfcVoidStratum** | Holle ruimte in de grond |
| **IfcWaterStratum** | Watervoerende laag |

### 2.6 Grondwerk (Earthworks) -- VOLLEDIG AFWEZIG

| Entiteit | Beschrijving |
|---|---|
| **IfcEarthworksCut** | Ontgraving |
| **IfcEarthworksElement** | Grondwerk element (basis) |
| **IfcEarthworksFill** | Aanvulling |
| **IfcReinforcedSoil** | Gewapende grond |

### 2.7 Infra-aanvullingen -- ONTBREKEND

De graph heeft IfcAlignment, maar mist de sub-entiteiten:

| Entiteit | Beschrijving |
|---|---|
| **IfcAlignmentHorizontal** | Horizontaal traceringsverloop |
| **IfcAlignmentVertical** | Verticaal traceringsverloop |
| **IfcAlignmentCant** | Verkanting (spoor) |
| **IfcAlignmentSegment** | Traceringsegment |
| **IfcCourse** | Laag (bijv. asfaltlaag weg) |
| **IfcPavement** | Wegverharding |
| **IfcKerb** | Trottoirband |
| **IfcRail** | Spoorstaaf |
| **IfcTrackElement** | Spoorwegelement |
| **IfcFacilityPart** | Deel van een civiel bouwwerk |

### 2.8 Ontbrekende Building Elements

| Entiteit | Beschrijving |
|---|---|
| **IfcBuildingElementProxy** | Generiek/ongedefinieerd element |
| **IfcShadingDevice** | Zonwering |
| **IfcChimney** | Schoorsteen |
| **IfcRampFlight** | Hellingloop |
| **IfcBuildingElementPart** | Onderdeel van element |

### 2.9 Ontbrekende MEP-entiteiten

| Entiteit | Beschrijving |
|---|---|
| **IfcFlowStorageDevice** | Opslagapparaat (tank, reservoir) |
| **IfcFlowMovingDevice** | Bewegend apparaat (pomp, ventilator) |
| **IfcFlowTreatmentDevice** | Behandelingsapparaat (filter) |
| **IfcDistributionPort** | Aansluitpunt MEP |
| **IfcDistributionCircuit** | Elektrisch circuit |
| **IfcCableSegment** | Kabelsegment |
| **IfcCableCarrierSegment** | Kabelgoot |
| **IfcCableFitting** | Kabelfitting |
| **IfcSwitchingDevice** | Schakelaar |
| **IfcProtectiveDevice** | Beveiligingsapparaat (zekering) |
| **IfcElectricAppliance** | Elektrisch apparaat |
| **IfcPump** | Pomp |
| **IfcFan** | Ventilator |
| **IfcHeatExchanger** | Warmtewisselaar |
| **IfcChiller** | Koelmachine |
| **IfcSpaceHeater** | Radiator / convector |
| **IfcFireSuppressionTerminal** | Sprinkler / brandblusser |

### 2.10 USD / OpenUSD-uitbreiding -- BEPERKT

De graph heeft 6 USD-nodes. Voor een volledige IFC5-representatie ontbreken:

| Concept | Beschrijving |
|---|---|
| **UsdStage** | Root container (equivalent van scene) |
| **UsdLayer** | Composable layer (kern van IFC5 multi-author) |
| **UsdPrim** | Basisobject in de scene-hierarchie |
| **UsdRelationship** | Relatie tussen prims |
| **UsdAttribute** | Attribuut op een prim |
| **UsdSchema** | Schema-definitie (IsA, API) |
| **UsdReference** | Verwijzing naar ander bestand/prim |
| **UsdPayload** | Lazy-loaded verwijzing |
| **UsdVariantSet** | Varianten (bijv. LOD-niveaus) |
| **UsdCollection** | Verzameling prims |
| **UsdGeomXformable** | Transformeerbaar object (basis) |
| **UsdGeomScope** | Groepering zonder transform |

**Impact:** IFC5 is fundamenteel gebaseerd op de USD composition-architectuur. De Layer/Stage/Reference/Payload concepten zijn essentieel om het IFC5 multi-author model te begrijpen.

### 2.11 IFC5-specifieke nieuwe concepten -- AFWEZIG

IFC5 introduceert fundamenteel nieuwe architectuurconcepten:

| Concept | Beschrijving |
|---|---|
| **Entity Component System (ECS)** | Objecten = entiteit + losse componenten |
| **Layer Composition** | Multi-author via gestapelde lagen |
| **Space Boundary als Object** | In IFC5 is space boundary een object, geen relatie |
| **Schema via TypeSpec** | Schema gedefinieerd in TypeSpec, gepubliceerd als JSON Schema |
| **bSDD-referenties** | Classificatie via buildingSMART Data Dictionary links |
| **Mesh-first geometrie** | Primaire representatie is mesh, met optionele semantische overlay |

---

## 3. IFC5 vs IFC4x3 -- Belangrijkste Verschillen

### 3.1 Architectuur

| Aspect | IFC4x3 | IFC5 |
|---|---|---|
| **Serialisatie** | STEP (ISO 10303-21) | JSON (IFCX formaat) |
| **Schema-taal** | EXPRESS | TypeSpec / JSON Schema |
| **Datamodel** | Monolitisch, klasse-hierarchie | Entity Component System (ECS) |
| **Geometrie** | B-rep, extrusies, CSG (primair) | Mesh-first, met semantische overlay |
| **Samenwerking** | Enkel bestand, enkele auteur | Multi-author via layer composition |
| **Relaties** | Expliciete IfcRel* objecten | Scene-hierarchie (USD-stijl nesting) |
| **Compositie** | IfcRelAggregates | USD-stijl parent/child + references |
| **Scope** | BIM (gebouwen + infra) | BIM + GIS + puntenwolken + analyse |

### 3.2 Vereenvoudigingen in IFC5

- **Minder klassen nodig**: Het ECS-model vervangt veel van de 800+ IFC4x3 entiteiten door generieke componenten op een kleiner aantal entiteiten.
- **Geen STEP-syntax meer**: De overgang naar JSON verlaagt de implementatiedrempel drastisch.
- **Relaties via hierarchie**: Veel expliciete IfcRel*-objecten worden overbodig doordat de scene-hierarchie (parent/child) relaties impliciet maakt.
- **Type-inheritance via componenten**: In plaats van aparte Type-entiteiten per element worden type-eigenschappen als componenten overgeerfd van type naar occurrence.

### 3.3 Toevoegingen in IFC5

- **Layer composition**: Meerdere auteurs kunnen onafhankelijk aan hetzelfde model werken via gestapelde lagen (vergelijkbaar met USD layers).
- **bSDD-integratie**: Directe referenties naar het buildingSMART Data Dictionary voor classificatie en eigenschappen.
- **Mesh-geometrie als primair**: Vereenvoudigt implementatie en maakt real-time rendering haalbaarder.
- **Geotechniek & grondwerk**: Al beschikbaar in IFC4x3, maar verder uitgewerkt in IFC5 alpha-voorbeelden.

### 3.4 Ontwikkelingsstatus IFC5

- **Status**: Alpha (maart 2026)
- **Repository**: [github.com/buildingSMART/IFC5-development](https://github.com/buildingSMART/IFC5-development)
- **Viewer**: [ifc5.technical.buildingsmart.org/viewer](https://ifc5.technical.buildingsmart.org/viewer/)
- **Schema**: TypeSpec broncode onder `/schema`, JSON Schema op ifcx.dev (in ontwikkeling)
- **Voorbeelden**: Hello-wall, geotechnisch, infra -- nog niet productie-klaar
- **Parallel**: IFC 4.4 (minor update) wordt parallel ontwikkeld

---

## 4. Aanbevelingen

### Prioriteit 1 -- Direct toevoegen (hoge waarde, fundamenteel voor IFC5)

1. **USD Composition-laag uitbreiden**
   - UsdStage, UsdLayer, UsdPrim, UsdReference, UsdPayload, UsdVariantSet
   - Dit is de kern van het IFC5-datamodel; zonder deze concepten is het IFC5-verhaal onvolledig.

2. **IFC5 ECS-architectuur als concept-node**
   - Voeg een node toe die het Entity Component System-paradigma uitlegt.
   - Toon hoe een "wall" bestaat uit entiteit + geometrie-component + materiaal-component + property-component.

3. **Layer Composition als concept-node**
   - Multi-author samenwerking via gestapelde lagen is het onderscheidende kenmerk van IFC5.

### Prioriteit 2 -- Belangrijk voor compleetheid (ontbrekende IFC-kern)

4. **Proces & Planning (4D)**: IfcTask, IfcWorkSchedule, IfcWorkPlan, IfcRelSequence
   - Minimaal de 4-5 belangrijkste entiteiten toevoegen.

5. **Actoren**: IfcActor, IfcPerson, IfcOrganization, IfcOwnerHistory
   - Essentieel voor traceerbaarheid.

6. **Relatie-entiteiten**: Minimaal IfcRelAggregates, IfcRelContainedInSpatialStructure, IfcRelDefinesByType, IfcRelDefinesByProperties, IfcRelAssociatesMaterial als nodes toevoegen.
   - Deze zijn de "lijm" van het IFC-model.

### Prioriteit 3 -- Waardevol voor domein-dekking

7. **Geotechniek**: IfcBorehole, IfcGeomodel, IfcGeotechnicalStratum
   - Vooral relevant voor infra-projecten.

8. **Grondwerk**: IfcEarthworksCut, IfcEarthworksFill
   - Nieuwe IFC4x3-entiteiten die ook in IFC5 terugkomen.

9. **Infra-verdieping**: IfcAlignmentHorizontal, IfcAlignmentVertical, IfcCourse, IfcPavement
   - Maakt het infra-domein completer.

10. **Aanvullende MEP**: IfcFlowStorageDevice, IfcFlowMovingDevice, IfcDistributionPort, IfcPump, IfcFan
    - Maakt het MEP-domein completer.

### Prioriteit 4 -- Nice-to-have

11. **Goedkeuring & Beperkingen**: IfcApproval, IfcConstraint
12. **Ontbrekende building elements**: IfcBuildingElementProxy, IfcShadingDevice
13. **Ontbrekende types**: IfcRoofType, IfcStairType, IfcRampType, IfcRailingType, etc.

---

## Samenvatting

De huidige schema-graph is **sterk op het gebied van**:
- Spatial hierarchie
- Building elements + types
- MEP-basis
- Structureel (inclusief wapening)
- Infrastructuur (basis)
- Materialen, properties, classificatie
- Kosten
- IfcX-eigen concepten (drawings, BCF, branding, etc.)

De graph **mist fundamenteel**:
- Proces/planning (4D) -- geheel afwezig
- Actoren/organisaties -- geheel afwezig
- IFC5 ECS-architectuur -- niet uitgelegd
- USD composition-model (Stage/Layer/Reference) -- onvolledig
- Geotechniek & grondwerk -- geheel afwezig
- Relatie-entiteiten als expliciete nodes -- afwezig
- Goedkeuringen & beperkingen -- geheel afwezig

**Geschatte compleetheid**: ~60% van de relevante IFC5-concepten is vertegenwoordigd. Met toevoeging van prioriteit 1 en 2 stijgt dit naar ~85%.

---

*Bronnen:*
- [buildingSMART IFC5 Development (GitHub)](https://github.com/buildingSMART/IFC5-development)
- [IFC5 Learn & Viewer](https://ifc5.technical.buildingsmart.org/)
- [IFC5 Examples FAQ](https://github.com/buildingSMART/IFC5-development/blob/main/Examples_FAQ.md)
- [IFC5 Whitepaper 2021 (PDF)](https://www.buildingsmart.org/wp-content/uploads/2021/06/IFC_5.pdf)
- [IFC5 Denver Presentation 2024](https://www.buildingsmart.org/wp-content/uploads/2024/09/20240829_Denver_ImplementerAssembly_day2.4_IFC5_part4-hello_wall.pdf)
- [IFC4x3 Documentatie](https://ifc43-docs.standards.buildingsmart.org/)
- [IFC4 vs IFC5 (AlterSquare)](https://altersquare.medium.com/ifc4-vs-ifc5-what-the-upcoming-standard-means-for-your-roadmap-7dd6074dd2df)
- [IFC5 en OpenUSD (goto.archi)](https://goto.archi/blog/post/ifc-50-and-openusd)
- [Evolution of IFC (buildingSMART Spain)](https://www.buildingsmart.es/2024/12/03/the-evolution-of-ifc-the-path-to-ifc5/)
- [BibLus IFC5 Overzicht](https://biblus.accasoftware.com/en/what-is-ifc-5/)
