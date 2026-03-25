# IFC Ontbrekende Functies en Bekende Problemen

> Uitgebreid onderzoeksrapport op basis van forums, academische papers, buildingSMART-community,
> blogposts en ervaringen van BIM-managers, architecten, ingenieurs en softwareontwikkelaars.
>
> Datum: maart 2026

---

## Inhoudsopgave

1. [Geen 2D-tekeningondersteuning](#1-geen-2d-tekeningondersteuning)
2. [Annotaties, maatvoering en arceringen ontbreken](#2-annotaties-maatvoering-en-arceringen-ontbreken)
3. [Round-trip dataverlies](#3-round-trip-dataverlies)
4. [Bestandsgrootte en prestatieproblemen](#4-bestandsgrootte-en-prestatieproblemen)
5. [Versiebeheer en samenwerking](#5-versiebeheer-en-samenwerking)
6. [GIS-integratie en georeferentie](#6-gis-integratie-en-georeferentie)
7. [Geometrie: NURBS, krommen en tessellatie](#7-geometrie-nurbs-krommen-en-tessellatie)
8. [Property sets en classificatiesystemen](#8-property-sets-en-classificatiesystemen)
9. [MEP-beperkingen](#9-mep-beperkingen)
10. [Constructieve engineering beperkingen](#10-constructieve-engineering-beperkingen)
11. [Schemacomplexiteit en implementatieproblemen](#11-schemacomplexiteit-en-implementatieproblemen)
12. [Infrastructuur en civiele techniek](#12-infrastructuur-en-civiele-techniek)
13. [Software-interoperabiliteit](#13-software-interoperabiliteit)
14. [Ontbrekende entiteitstypen en domeinen](#14-ontbrekende-entiteitstypen-en-domeinen)
15. [Samenvatting en IFCX-kansen](#15-samenvatting-en-ifcx-kansen)

---

## 1. Geen 2D-tekeningondersteuning

### Wat ontbreekt
IFC is ontworpen als 3D-modelformaat voor BIM-gegevensuitwisseling. Het formaat biedt **geen native ondersteuning voor 2D-tekeningen**. Plattegronden, doorsneden, gevels en detailtekeningen -- de dagelijkse werktekeningen van architecten en aannemers -- kunnen niet direct in IFC worden opgeslagen. Alle 2D-informatie moet worden afgeleid uit de 3D-geometrie, wat een complex en foutgevoelig proces is.

Specifieke ontbrekende functies:
- **Paper space / modelspace-scheiding** (zoals in DWG/DXF)
- **Viewports en bladindelingen** (sheets)
- **2D plattegrondlijnen** -- ArcGIS en andere GIS-tools melden dat floorplan-datasets ontbreken in IFC
- **Tekenbladen met titelblokken**
- **Plotstijlen en lijngewichten** voor print

### Wie klaagt
- **Architecten**: hebben 2D-tekeningen nodig voor vergunningsaanvragen en bouwplaatscommunicatie
- **Aannemers**: werken primair met 2D-werktekeningen op de bouwplaats
- **BIM-managers**: moeten parallel DWG-bestanden onderhouden naast IFC

### Ernst: **Kritiek**
Dit is een van de meest genoemde beperkingen. In de praktijk dwingt het projectteams om naast IFC altijd DWG/DXF-bestanden te onderhouden.

### Kan IFCX dit oplossen?
**Ja.** IFCX is specifiek ontworpen om 2D-tekeningen en 3D-modellen in een enkel bestand te combineren. Met het `ifcx::purpose`-veld wordt expliciet onderscheid gemaakt tussen drawing, model, annotation en sheet. Dit is een van de kernvoordelen van IFCX.

---

## 2. Annotaties, maatvoering en arceringen ontbreken

### Wat ontbreekt
Annotatie-entiteiten zijn grotendeels **verwijderd uit de IFC-specificatie** in recente versies. Dit omvat:

- **Maatvoering**: lineair, hoek, radius, diameter
- **Arceringen (hatching)**: worden niet natively opgeslagen; in sommige tools worden ze als CSS/SVG at runtime toegepast
- **Tekst en tekststijlen**: standalone tekst, tekst met leiders, symbolen
- **Referentiesymbolen**: doorsnede-symbolen, gevelmarkeringen, detailmarkeringen
- **Gridlijnen**: gebruikers melden problemen met het exporteren van grids naar IFC
- **Pijlen voor trappen/hellingen**
- **Hoogtemarkeringen**: relatieve peilen, absolute peilen, plafondpeilen

Op het buildingSMART-forum is er een actief debat over of annotatie "terug" moet in de IFC-specificatie, waarbij sommigen vinden dat IFC puur een datamodel moet blijven.

### Wie klaagt
- **Architecten**: maatvoering en arceringen zijn essentieel voor elke bouwtekening
- **Tekenbureau's**: kunnen IFC niet gebruiken als vervanging van DWG
- **Softwareontwikkelaars**: IfcOpenShell-community noemt tekeningen genereren uit IFC "pijnlijk"

### Ernst: **Kritiek**
Zonder annotaties is IFC onbruikbaar als tekeningformaat. Het is de voornaamste reden dat DWG/DXF niet kan worden vervangen door IFC.

### Kan IFCX dit oplossen?
**Ja.** IFCX breidt IFC uit met het volledige DWG/DXF-entiteitenset, inclusief dimensies, arceringen, tekststijlen, leiders en symbolen. Annotaties worden expliciet als purpose-type opgeslagen.

---

## 3. Round-trip dataverlies

### Wat is kapot
Bij het exporteren van een model naar IFC en vervolgens weer importeren in dezelfde of andere software gaan **significante hoeveelheden data verloren**. Dit is een van de meest gedocumenteerde problemen in zowel academische literatuur als gebruikersforums.

Concrete problemen:
- **Revit naar ArchiCAD**: wanden worden geconverteerd naar .gsm-objecten (onbruikbaar), profielwanden verliezen hun definitie, pipework en ductwork verdwijnen deels
- **Brep-representatie**: elementen met Brep-geometrie worden als In-Place Families geimporteerd, waarbij **alle parameters verloren gaan**
- **NURBS-objecten**: worden slecht getesselleerd en worden low-poly meshes
- **Materiaaldata**: het label wordt correct overgedragen, maar alle structurele en fysische eigenschappen gaan verloren
- **Vendor-specifieke metadata**: elk BIM-pakket voegt eigen metadata toe die niet vertaalt naar andere pakketten
- **Foutmeldingen**: korte segmenten die niet gerepareerd kunnen worden, overlappende elementen

### Wie klaagt
- **BIM-managers**: besteden uren aan het handmatig herstellen van geimporteerde modellen
- **Constructeurs**: verliezen materiaalgegevens en belastingen bij overdracht
- **Architecten**: moeten wanden en objecten opnieuw tekenen na import

### Ernst: **Hoog**
Academisch onderzoek (MDPI, ResearchGate) toont aan dat IFC niet in staat is om volledige data-uitwisseling te garanderen. Meerdere studies rapporteren informatievervalsing en -verlies op zowel entiteits- als attribuutniveau.

### Kan IFCX dit oplossen?
**Gedeeltelijk.** IFCX gebruikt een strikt JSON Schema waardoor data-interpretatie eenduidiger is. De node-gebaseerde v2-architectuur met `attributes` en `inherits` maakt rijkere dataoverdracht mogelijk. Echter, round-trip-problemen zijn deels een software-implementatieprobleem dat niet alleen door een formaat kan worden opgelost.

---

## 4. Bestandsgrootte en prestatieproblemen

### Wat is kapot
IFC-bestanden zijn **5-10x groter** dan hun native tegenhangers. Het meest gebruikte formaat (IFC-SPF/STEP) is ASCII-gebaseerd en heeft ernstige prestatieproblemen:

- **Sequentieel lezen vereist**: het bestand moet van begin tot eind worden gelezen
- **Geen mid-file extractie**: je kunt niet een specifiek object ophalen zonder het hele bestand te parsen
- **Niet-hierarchische definities**: objecten staan in willekeurige volgorde
- **Enorme bestanden**: projecten van 200MB-1GB+ zijn gebruikelijk
- **Browser crashes**: web-gebaseerde viewers crashen bij grote IFC-bestanden
- **Parsing-prestaties**: IfcOpenShell heeft 1m40s nodig voor een 450MB-bestand vs. 5.4s met geoptimaliseerde alternatieven
- **Geheugengebruik**: grote bestanden leggen zware druk op CPU en geheugen

### Wie klaagt
- **Softwareontwikkelaars**: IfcOpenShell GitHub heeft tientallen issues over trage parsing
- **BIM-managers**: overdracht van grote bestanden over netwerk is problematisch
- **Webbouwers**: IFC.js en web-IFC kampen met prestatieproblemen

### Ernst: **Hoog**
Bij grote infrastructuurprojecten is dit een dagelijks probleem dat workflows aanzienlijk vertraagt.

### Kan IFCX dit oplossen?
**Ja.** IFCX biedt twee formaten: `.ifcx` (JSON, leesbaar) en `.ifcxb` (CBOR + Zstandard binair). Het binaire formaat is **94% kleiner dan DXF** en rivalisert met DWG-bestandsgroottes. De JSON-structuur maakt bovendien incrementeel parsen en lazy loading mogelijk.

---

## 5. Versiebeheer en samenwerking

### Wat ontbreekt
IFC heeft **geen ingebouwd versiebeheer**. Dit leidt tot fundamentele samenwerkingsproblemen:

- **Geen diff-mogelijkheid**: standaard git merge vindt altijd conflicten bij IFC-bestanden omdat git naar de hash van het volledige bestand kijkt, niet naar individuele objecten
- **Geen merge-functionaliteit**: gelijktijdige wijzigingen door verschillende disciplines worden niet gedetecteerd
- **Geen concurrency control**: er is geen fijnmazig bijhouden van wijzigingen op objectniveau
- **STEP-lijnidentificatie**: de STEP-definitie stelt niet dat regelnummers vast moeten zijn, waardoor twee exports van hetzelfde model totaal andere regelnummers kunnen hebben
- **Handmatige coordinatie**: het samenvoegen van modellen is een "foutgevoelig en arbeidsintensief handmatig proces"
- **Geen branching**: er is geen concept van parallelle ontwikkellijnen binnen een bestand

Externe tools zoals `ifcmerge` bestaan, maar zijn workarounds voor een fundamentele tekortkoming.

### Wie klaagt
- **BIM-managers**: coordinatie tussen disciplines is tijdrovend
- **Projectleiders**: geen audittrail van wie wat wanneer heeft gewijzigd
- **Softwareontwikkelaars**: BIMserver en OSArch-community werken actief aan oplossingen

### Ernst: **Hoog**
In de moderne bouwpraktijk met meerdere disciplines die gelijktijdig werken is dit een groot obstakel.

### Kan IFCX dit oplossen?
**Ja.** IFCX heeft een ingebouwd GitDiff-systeem: semantische diffs, branching en merging direct in het bestand. De JSON-structuur maakt het bovendien git-diffable, zodat standaard versiebeheertools bruikbaar zijn.

---

## 6. GIS-integratie en georeferentie

### Wat ontbreekt
De integratie tussen BIM (IFC) en GIS is problematisch door fundamentele verschillen:

- **Lokaal coordinatenstelsel**: IFC gebruikt lokale Cartesische coordinaten; GIS gebruikt geodetische systemen (WGS84, RD, etc.)
- **IfcMapConversion beperkt**: toegevoegd in IFC4, maar kan niet omgaan met kaartprojectie vanuit het geodetische coordinatensysteem
- **Schaalvariatie**: bij projectie van een ellipsoidaal aardmodel naar een lokaal Cartesisch systeem varieert de schaal binnen het model
- **Ontbrekende georeferentie**: veel IFC-modellen bevatten geen of onnauwkeurige geolocatie
- **CityGML-conversie**: bij conversie van IFC naar CityGML gaan zowel geometrische als semantische gegevens verloren
- **Floorplan-data afwezig**: alleen 3D multipatch features beschikbaar bij directe lezing

### Wie klaagt
- **GIS-specialisten**: Esri/ArcGIS-gebruikers melden dat IFC-bestanden niet bruikbaar zijn zonder significante nabewerking
- **Stedenbouwkundigen**: moeten gebouwmodellen handmatig plaatsen in GIS-omgevingen
- **Infra-ingenieurs**: bij lijninfrastructuur is georeferentie cruciaal

### Ernst: **Gemiddeld tot Hoog**
Met de toenemende vraag naar digital twins en smart cities wordt dit steeds urgenter.

### Kan IFCX dit oplossen?
**Gedeeltelijk.** IFCX ondersteunt GIS-data in het formaat en is IFC5-compatibel, dat betere georeferentie-ondersteuning biedt. Echter, de fundamentele mismatch tussen BIM- en GIS-coordinatensystemen is een breder probleem.

---

## 7. Geometrie: NURBS, krommen en tessellatie

### Wat is kapot
IFC heeft een complexe geschiedenis met geometrie-representatie:

- **IFC 2x3**: geen B-rep ondersteuning; objecten alleen als polyhedra, sweeps of basis-CSG
- **IFC 4**: voegt B-rep en NURBS toe, maar implementatie in software is inconsistent
- **Tessellatieproblemen**: bij conversie van NURBS naar meshes ontstaan:
  - Scheuren (cracks) tussen aangrenzende oppervlakken
  - Zelfdoorsniijdingen bij sterk gekromde oppervlakken
  - Ongewenste vervormingen
  - Low-poly resultaten bij NURBS-objecten
- **NURBS beperkingen**: kan sinusoiden (helix-lijnen en -oppervlakken) niet nauwkeurig beschrijven
- **Inconsistente geometrie-representatie**: verschillende software gebruikt verschillende methoden om dezelfde geometrie te representeren

### Wie klaagt
- **Architecten**: complexe vrije vormen (bv. Zaha Hadid-stijl) verliezen detail
- **Constructeurs**: nauwkeurigheid van geometrie is cruciaal voor analyses
- **Softwareontwikkelaars**: Rhino/Grasshopper-gebruikers (VisualARQ) melden tolerantieproblemen

### Ernst: **Gemiddeld**
Voor rechtoekige gebouwen is dit geen groot probleem, maar bij complexe architectuur en infrastructuur is het beperkend.

### Kan IFCX dit oplossen?
**Gedeeltelijk.** IFCX erft de IFC5-geometriestack en voegt vereenvoudigde driehoeksmeshes toe voor betere prestaties. Fundamentele NURBS-beperkingen zijn echter wiskundig van aard.

---

## 8. Property sets en classificatiesystemen

### Wat ontbreekt
- **Onvolledige property sets**: niet alle relevante eigenschappen zijn gestandaardiseerd; software toont standaard slechts een subset
- **IfcComplexProperty niet ondersteund**: in de IFC Reference View wordt IfcComplexProperty niet ondersteund in de property set templates
- **Classificatiesystemen beperkt**: ISO 12006-2 biedt slechts basisprincipes, resulterend in een onvolledig classificatiesysteem
- **Landscaping ontbreekt**: de IFC-specificatie beschrijft landschapsondersteuning slecht
- **Custom properties problematisch**: het toevoegen van nieuwe properties aan bestaande property sets is lastig
- **Geen gestandaardiseerd vocabulaire**: het vocabulaire moet per project worden afgesproken
- **Materiaaldata incompleet**: materiaallabels worden overgedragen maar structurele/fysische eigenschappen niet

### Wie klaagt
- **BIM-managers**: besteden veel tijd aan het correct configureren van property mappings
- **Opdrachtgevers**: krijgen niet de data die ze nodig hebben voor asset management
- **FM-managers**: facility management vereist rijke property data die IFC niet standaard levert

### Ernst: **Gemiddeld tot Hoog**
Property data is cruciaal voor BIM-volwassenheid (LOI/LOD-niveaus). Zonder betrouwbare properties is het "I" in BIM inhoudsloos.

### Kan IFCX dit oplossen?
**Gedeeltelijk.** IFCX's node-gebaseerde architectuur met `attributes` maakt flexibele en uitbreidbare property-definities mogelijk. Het JSON-formaat maakt custom properties eenvoudiger toe te voegen en te valideren tegen een schema.

---

## 9. MEP-beperkingen

### Wat ontbreekt
Mechanical, Electrical en Plumbing (MEP) is een van de zwakste domeinen in IFC:

- **Pipework en ductwork verdwijnen**: bij import vanuit Revit MEP naar ArchiCAD gaan delen verloren
- **In-Place Families**: geimporteerde MEP-elementen worden In-Place Families die niet bewerkbaar zijn
- **Beperkte schema-mapping**: IfcPipe, IfcPipeFittings, IfcDuct, IfcDuctFittings moeten correct geconfigureerd worden in de brontoepassing
- **Elektrische systemen**: beperkte ondersteuning voor kabelbanen, schakelschema's en installatietekeningen
- **Systeemrelaties**: de verbindingen tussen MEP-componenten (flow direction, systeemhierarchie) gaan vaak verloren
- **Berekeningen**: geen ondersteuning voor het overdragen van berekende waarden (debiet, drukval, etc.)

### Wie klaagt
- **Installatie-adviseurs**: moeten modellen handmatig herstellen na IFC-import
- **MEP-engineers**: verliezen systeeminformatie bij overdracht
- **Aannemers**: kunnen MEP-coordinatie niet betrouwbaar doen op basis van IFC

### Ernst: **Hoog**
MEP is een van de meest kostenintensieve disciplines in de bouw. Slechte IFC-ondersteuning leidt tot cofinatie-fouten en faalkosten.

### Kan IFCX dit oplossen?
**Gedeeltelijk.** IFCX erft de IFC5-entiteiten en kan aanvullende MEP-specifieke attributen definieen. De uitbreidbaarheid van het JSON-schema maakt het mogelijk om domeinspecifieke extensies toe te voegen.

---

## 10. Constructieve engineering beperkingen

### Wat ontbreekt
Academisch onderzoek (MDPI, 2021) toont specifieke problemen voor constructief ingenieurs:

- **Verticale interoperabiliteit faalt**: de overgang van architectuurmodel naar constructiemodel vertoont "wijdverspreide entiteits-interpretatiefouten"
- **Load-bearing property beperkt**: wordt alleen ondersteund voor Wall, Slab, Column, Beam en Roof -- niet voor andere constructieve elementen
- **Belastingen niet overdraagbaar**: IFC kan lasten (loads) niet overdragen naar CAE-software
- **CAE-naar-CAD niet efficient**: wijzigingen in de constructieve analyse kunnen niet direct terugkeren naar het CAD-model
- **Materiaalgegevens verloren**: labels correct, maar sterkte-eigenschappen, elasticiteitsmoduli etc. ontbreken
- **Wapeningsdata beperkt**: detaillering van wapening is onvoldoende ondersteund in IFC

### Wie klaagt
- **Constructeurs**: kunnen IFC niet gebruiken als bron voor FEM-analyses
- **Wapeningsspecialisten**: moeten wapening apart modelleren
- **Academici**: meerdere peer-reviewed papers documenteren deze tekortkomingen

### Ernst: **Hoog**
De kloof tussen architectuur en constructie is een van de grootste obstakels voor echt geintegreerd BIM.

### Kan IFCX dit oplossen?
**Beperkt.** Dit is primair een domeinspecifiek probleem in de IFC-entiteitsdefinities. IFCX kan wel rijkere attributen toevoegen, maar de fundamentele constructieve entiteiten moeten vanuit buildingSMART/IFC5 komen.

---

## 11. Schemacomplexiteit en implementatieproblemen

### Wat is kapot
Het IFC-schema is buitengewoon complex en moeilijk te implementeren:

- **Monolithische structuur**: het volledige schema is een enkel groot blok; je kunt niet selectief implementeren
- **STEP/EXPRESS-erfenis**: de afhankelijkheid van STEP-technologie beperkt modernisering
- **Implementatietijd**: volledige IFC4-implementatie kost **maanden tot jaren**
- **Versie-incompatibiliteit**: nieuwe concepten toevoegen leidt tot incompatibiliteiten tussen versies
- **900+ entiteitstypen**: het schema is overweldigend voor nieuwe implementeerders
- **Onvoorspelbare export**: export vereist correct geconfigureerde parameters; fouten zijn zichtbaar op sommige platforms maar niet op andere

### Wie klaagt
- **Softwareontwikkelaars**: de primaire doelgroep van dit probleem
- **Kleine BIM-softwarebedrijven**: kunnen de investering in IFC-implementatie niet rechtvaardigen
- **Open-source community**: IfcOpenShell, BlenderBIM en anderen worstelen met de complexiteit

### Ernst: **Hoog**
Als het te moeilijk is om te implementeren, blijft de kwaliteit van IFC-exports slecht -- wat alle andere problemen verergert.

### Kan IFCX dit oplossen?
**Ja.** IFCX gebruikt JSON met een strict JSON Schema, wat implementatie in dagen mogelijk maakt in plaats van maanden. Het biedt libraries in 6 talen (Python, TypeScript, Rust, C++, C#, JavaScript) en from-scratch parsers zonder externe afhankelijkheden.

---

## 12. Infrastructuur en civiele techniek

### Wat ontbreekt
Tot IFC 4.3 was IFC uitsluitend gericht op gebouwen. Inmiddels is er verbetering, maar er blijven gaten:

- **Tunnels**: nog niet in IFC 4.3; gepland voor IFC 4.4
- **Geotechniek**: de interoperabiliteit tussen IFC en geotechnische modellen (GeoSciML) is nog in ontwikkeling
- **Lijninfrastructuur**: IFC 4.3 verbetert dit, maar implementatie in software loopt achter
- **Terreinmodellen**: beperkte ondersteuning voor Digital Terrain Models
- **Waterwerken**: basisondersteuning in IFC 4.3, maar nog niet volwassen

### Wie klaagt
- **Civiel ingenieurs**: konden tot recent IFC niet gebruiken voor infra-projecten
- **Wegenbouwers**: hebben specifieke entiteiten nodig (wegvakken, kruisingen, markering)
- **Tunnelbouwers**: moeten wachten op IFC 4.4

### Ernst: **Gemiddeld**
IFC 4.3 heeft veel verbeterd; de resterende gaten worden actief aangepakt.

### Kan IFCX dit oplossen?
**Beperkt.** IFCX richt zich primair op gebouwen en 2D-tekeningen. Infrastructuur-extensies zijn mogelijk via het uitbreidbare schema, maar dit is niet de primaire focus.

---

## 13. Software-interoperabiliteit

### Wat is kapot
Het kernprobleem van IFC -- betrouwbare data-uitwisseling -- werkt in de praktijk onvoldoende:

- **Elke software interpreteert IFC anders**: objecten van de ene discipline worden slecht begrepen door software van een andere discipline
- **Vendor-specifieke extensies**: elk pakket voegt eigen metadata toe die niet overdraagbaar is
- **Exportconfiguratie cruciaal**: dezelfde Revit-model geeft totaal andere IFC-exports met verschillende instellingen
- **Model "fundamenteel onbruikbaar"**: academisch onderzoek rapporteert gevallen waarin modellen na conversie compleet onbruikbaar zijn
- **Read-only karakter**: IFC wordt gezien als niet-bewerkbaar formaat, wat de bruikbaarheid beperkt

### Wie klaagt
- **Iedereen**: dit is het meest universele IFC-probleem
- **BIM-managers**: besteden disproportioneel veel tijd aan IFC-kwaliteitscontrole
- **Opdrachtgevers**: hebben het gevoel dat openBIM niet levert wat het belooft

### Ernst: **Kritiek**
Dit ondermijnt het fundamentele bestaansrecht van IFC als open uitwisselingsstandaard.

### Kan IFCX dit oplossen?
**Gedeeltelijk.** IFCX's strikte JSON Schema reduceert interpretatie-ambiguiteit. De eenduidige structuur met `path`, `children`, `attributes` en `inherits` maakt het moeilijker om data "verkeerd" te interpreteren. Echter, volledige interoperabiliteit vereist ook software-implementatiekwaliteit.

---

## 14. Ontbrekende entiteitstypen en domeinen

### Wat ontbreekt
Naast de grote categorieen zijn er specifieke entiteitstypen die ontbreken of onderontwikkeld zijn:

- **Landschapsarchitectuur**: beplanting, terreinmeubilair, waterpartijen
- **Interieurontwerp**: meubels, afwerkingen, kleurenschema's
- **Tijdelijke constructies**: steigers, bekisting, bouwplaatsinrichting
- **Sloopfase**: entiteiten voor sloopsequencing en afvalbeheer
- **Bestaande bouw**: scan-to-BIM objecten, historische constructies
- **Akoestiek**: geluidsabsorptie, flanktransmissie, akoestische zones
- **Brandveiligheid**: vluchtroutes, brandcompartimenten, sprinkler-zones
- **Kostencalculatie**: hoeveelheden gekoppeld aan kostenposten
- **Planning (4D)**: beperkte koppeling tussen objecten en tijdsschema's

### Wie klaagt
- **Landschapsarchitecten**: moeten eigen workarounds bedenken
- **Interieurarchitecten**: IFC is niet ontworpen voor hun domein
- **Calculators**: 5D BIM is niet haalbaar met standaard IFC
- **Planners**: 4D BIM vereist externe tools

### Ernst: **Gemiddeld**
Veel van deze domeinen worden in IFC5 geadresseerd, maar het is een langlopend proces.

### Kan IFCX dit oplossen?
**Gedeeltelijk.** IFCX's uitbreidbare schema maakt het mogelijk om custom entiteitstypen en domeinen toe te voegen zonder de kernspecificatie te wijzigen. De node-gebaseerde architectuur is hier flexibeler dan IFC4's monolithische structuur.

---

## 15. Samenvatting en IFCX-kansen

### Overzicht probleemcategorieen

| # | Categorie | Ernst | IFCX-oplossing |
|---|-----------|-------|----------------|
| 1 | Geen 2D-tekeningen | Kritiek | **Volledig** |
| 2 | Annotaties ontbreken | Kritiek | **Volledig** |
| 3 | Round-trip dataverlies | Hoog | Gedeeltelijk |
| 4 | Bestandsgrootte/prestaties | Hoog | **Volledig** |
| 5 | Versiebeheer ontbreekt | Hoog | **Volledig** |
| 6 | GIS-integratie | Gemiddeld-Hoog | Gedeeltelijk |
| 7 | Geometrieproblemen | Gemiddeld | Gedeeltelijk |
| 8 | Property sets incompleet | Gemiddeld-Hoog | Gedeeltelijk |
| 9 | MEP-beperkingen | Hoog | Gedeeltelijk |
| 10 | Constructieve beperkingen | Hoog | Beperkt |
| 11 | Schemacomplexiteit | Hoog | **Volledig** |
| 12 | Infrastructuur | Gemiddeld | Beperkt |
| 13 | Interoperabiliteit | Kritiek | Gedeeltelijk |
| 14 | Ontbrekende domeinen | Gemiddeld | Gedeeltelijk |

### Waar IFCX het verschil maakt

De vier gebieden waar IFCX een **volledige oplossing** biedt, zijn precies de gebieden die het meest klagen genereren:

1. **2D-tekeningen + annotaties**: de reden dat DWG/DXF niet kan worden vervangen
2. **Bestandsgrootte**: IFCXB is 94% kleiner dan DXF
3. **Versiebeheer**: ingebouwd GitDiff met branching en merging
4. **Implementatie-eenvoud**: JSON i.p.v. STEP, libraries in 6 talen, dagen i.p.v. maanden

Dit maakt IFCX niet alleen een IFC-verbetering, maar een **serieus alternatief voor het DWG/DXF + IFC dubbelsysteem** dat de industrie nu hanteert.

---

## Bronnen

### Forums en community
- [buildingSMART Forums - IFC](https://forums.buildingsmart.org/c/users/ifc/9)
- [OSArch Community - 2D drawings in DWG from IFC](https://community.osarch.org/discussion/1450/2d-drawings-in-dwg-from-ifc-files)
- [OSArch Community - Resurrecting annotation storage in IFC](https://community.osarch.org/discussion/63/resurrecting-annotation-storage-in-ifc)
- [buildingSMART Forums - Annotation shouldn't be added back](https://forums.buildingsmart.org/t/annotation-shouldnt-be-added-back-into-the-ifc-spec/2177)
- [Graphisoft Community - Revit IFC to ArchiCAD is fundamentally flawed](https://community.graphisoft.com/t5/Collaboration-with-other/Revit-IFC-to-Archicad-is-fundamentally-flawed/td-p/589713)
- [Graphisoft Community - IFC Import Missing Objects](https://community.graphisoft.com/t5/Collaboration-with-other/IFC-Import-Missing-Objects-Unpredictability/td-p/360913)
- [BricsCAD Forum - BC slow working with IFC files](https://forum.bricsys.com/discussion/34887/bc-slow-in-working-with-ifc-files)

### Blogs en artikelen
- [BIM Corner - 10 Common IFC Export Mistakes (part 1)](https://bimcorner.com/10-common-ifc-export-mistakes-to-avoid-part-1/)
- [BIM Corner - 10 Common IFC Export Mistakes (part 2)](https://bimcorner.com/10-common-ifc-export-mistakes-to-avoid-part-2/)
- [BIM Corner - Best BIM Format: IFC or DWG?](https://bimcorner.com/the-best-bim-format/)
- [Ondsel - Autodesk's way of handling the IFC standard](https://www.ondsel.com/blog/native-ifc/)
- [AlterSquare - IFC4 vs IFC5](https://www.altersquare.io/ifc4-vs-ifc5-what-the-upcoming-standard-means-for-your-roadmap/)
- [AlterSquare - Handling Large IFC Files](https://altersquare.medium.com/handling-large-ifc-files-in-web-applications-performance-optimization-guide-66de9e63506f)
- [buildingSMART Spain - Evolution of IFC: path to IFC5](https://www.buildingsmart.es/2024/12/03/the-evolution-of-ifc-the-path-to-ifc5/)
- [AEC Magazine - IFC for Infrastructure](https://aecmag.com/collaboration/ifc-for-infrastructure/)

### Academische bronnen
- [MDPI - On BIM Interoperability via IFC: Assessment from Structural Engineering Viewpoint](https://www.mdpi.com/2076-3417/11/23/11430)
- [ResearchGate - Interoperability analysis of IFC-based data exchange](https://www.researchgate.net/publication/328958962_Interoperability_analysis_of_ifc-based_data_exchange_between_heterogeneous_BIM_software)
- [ResearchGate - Data Interoperability Assessment Through IFC for BIM in Structural Design](https://www.academia.edu/76973557/Data_Interoperability_Assessment_Though_Ifc_for_Bim_in_Structural_Design_a_Five_Year_Gap_Analysis)
- [ScienceDirect - Version control for asynchronous BIM collaboration](https://www.sciencedirect.com/science/article/pii/S0926580523003230)
- [Springer - BIM/GIS Integration: IFC to CityJSON conversion](https://link.springer.com/article/10.1007/s12145-024-01343-1)
- [MDPI - Georeferencing BIM Models for BIM/GIS Integration](https://www.mdpi.com/2220-9964/14/5/180)
- [buildingSMART - Future of IFC: towards IFC5 (PDF)](https://www.buildingsmart.org/wp-content/uploads/2021/06/IFC_5.pdf)

### Software issues
- [IfcOpenShell #664 - Slow to open large file](https://github.com/IfcOpenShell/IfcOpenShell/issues/664)
- [IfcOpenShell #569 - Performance issue 100k elements](https://github.com/IfcOpenShell/IfcOpenShell/issues/569)
- [IfcOpenShell #1153 - Construction drawing generation](https://github.com/IfcOpenShell/IfcOpenShell/issues/1153)
- [GitHub - buildingSMART/IFC5-development](https://github.com/buildingSMART/IFC5-development)
- [GitHub - ifcmerge: three-way-merge tool](https://github.com/brunopostle/ifcmerge)

### buildingSMART officeel
- [buildingSMART Technical - IFC Standards](https://technical.buildingsmart.org/standards/ifc/)
- [buildingSMART - IFC Formats](https://technical.buildingsmart.org/standards/ifc/ifc-formats/)
- [buildingSMART - IFC 4.3 status and IFC 4.4](https://www.buildingsmart.org/the-status-of-ifc-4-3-and-the-benefit-of-further-extensions-as-ifc-4-4/)
- [IFC 4.3.2 Documentation](https://ifc43-docs.standards.buildingsmart.org/)
