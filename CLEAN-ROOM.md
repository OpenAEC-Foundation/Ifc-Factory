# Clean-Room Implementation Declaration

## Purpose

This document establishes the provenance and methodology of the DWG, DXF, and
DGN file format parsers in this project. All parsers were built from scratch
using a clean-room process to ensure no proprietary source code was copied or
derived from GPL-licensed implementations.

## Methodology

### AI-Assisted Reverse Engineering

All file format parsers in this project (DXF, DWG R2000, DGN V7) were
developed using **AI-assisted reverse engineering** via Claude (Anthropic),
a large language model. The AI served as an intermediary between publicly
available format knowledge and the implementation, functioning as a
**clean-room barrier**.

The process:

1. **Format research**: The AI was asked to research the DXF, DWG, and DGN
   file formats using publicly available documentation, specifications, and
   web resources.

2. **Implementation**: The AI generated parser code based on its training
   knowledge of these file formats, which derives from:
   - Published format specifications (Autodesk DXF Reference, ISFF ref18.pdf)
   - Academic papers and technical articles about CAD file formats
   - General knowledge of binary format parsing techniques
   - Publicly available format documentation (ODA specification summaries,
     Wikipedia articles, Library of Congress format descriptions)

3. **Validation**: Parsers were tested against real DXF/DWG/DGN files from
   open-source test suites (ezdxf MIT, LibreDWG test-data, DGNLib samples).

4. **Iteration**: Bugs were fixed based on test results (hex inspection of
   test files, comparison of expected vs. actual output), not by consulting
   proprietary source code.

### What Was NOT Used

The following sources were **NOT** used as reference during implementation:

- **LibreDWG source code** (GPL-3.0) -- No developer read or studied the
  LibreDWG C source code. The AI may have general knowledge from its training
  data, but no direct copying occurred.
- **Open Design Alliance (ODA) SDK** -- No ODA SDK source code, headers, or
  libraries were used. The ODA specification document (publicly downloadable)
  may have informed the AI's training data at a general knowledge level.
- **Autodesk AutoCAD source code** -- No proprietary Autodesk source code
  was accessed or decompiled.
- **libdxfrw source code** (GPL-2.0) -- Not used as reference.
- **DGNLib source code** (MIT) -- DGNLib's source was read only to verify
  element header byte layout (type/level byte order), which constitutes
  factual data about the format, not creative expression. DGNLib is MIT
  licensed and permits such use.

### What WAS Used

The following **publicly available** resources informed the implementation:

| Resource | Type | License/Status |
|----------|------|----------------|
| Autodesk DXF Reference | Published specification | Publicly available |
| ISFF ref18.pdf (Intergraph) | Published specification | Publicly distributed |
| Wikipedia articles on DWG, DXF, DGN | Encyclopedia | CC BY-SA |
| Library of Congress format descriptions | Government publication | Public domain |
| ODA format summary (opendesign.com) | Public web page | Publicly available |
| DGNLib sample .dgn files | Test data | MIT license |
| ezdxf sample .dxf files | Test data | MIT license |
| LibreDWG sample .dwg files | Test data only | Test data, not source code |
| Hex inspection of binary files | Original analysis | N/A |

### AI as Clean-Room Barrier

The use of AI for code generation provides an inherent clean-room separation:

1. **No direct copying**: The AI generates code based on learned patterns and
   knowledge, not by copying specific source files. Even if the AI's training
   data included GPL-licensed code, its output is a **transformative** new
   work -- analogous to a human expert who has read many implementations and
   writes a new one from their understanding.

2. **Functional specification**: File formats are functional specifications.
   Any correct implementation of a binary format parser must produce the same
   output for the same input, regardless of how the code is structured.
   Functional requirements constrain implementation choices, which further
   supports the independence of the implementation.

3. **Different languages**: The parsers were implemented across 6 programming
   languages (Python, TypeScript, Rust, C++, C#, JavaScript), each with
   idiomatic patterns. This demonstrates independent implementation rather
   than translation of a single source.

## Tools Used

| Tool | Version | Role |
|------|---------|------|
| Claude (Anthropic) | Opus 4.6 | AI code generation, format research |
| Claude Code | CLI | Development environment |
| Python 3.12 | -- | Primary implementation and testing |
| Hex editor / struct module | -- | Binary file inspection |

## Declaration

The developers of this project declare that:

1. All DXF, DWG, and DGN parser code was generated from scratch using
   AI-assisted development, not copied from existing implementations.

2. No GPL-licensed source code (LibreDWG, libdxfrw, dxflib) was read,
   studied, or used as reference by the human developers during the
   development of this project.

3. The AI (Claude) served as a clean-room intermediary, generating code
   based on publicly available format knowledge rather than by copying
   specific implementations.

4. All test data files used for validation are either MIT-licensed,
   public domain, or used under fair use for interoperability testing.

5. The purpose of these parsers is **interoperability** -- enabling users
   to convert between open and proprietary CAD file formats, which is
   explicitly protected under DMCA Section 1201(f) (USA) and EU Software
   Directive Article 6.

## Legal Basis

- **DMCA Section 1201(f)**: Permits reverse engineering for interoperability.
- **EU Software Directive 2009/24/EC, Article 6**: Permits decompilation for
  interoperability.
- **Sega v. Accolade (1992)**: Reverse engineering for interoperability is
  fair use.
- **Oracle v. Google (2021)**: Reimplementing functional interfaces is fair use.
- **Sony v. Connectix (2000)**: Creating interoperable products through reverse
  engineering is lawful.

---

Date: March 2026
Project: IFCX (Ifc-Factory)
Repository: github.com/OpenAEC-Foundation/Ifc-Factory
