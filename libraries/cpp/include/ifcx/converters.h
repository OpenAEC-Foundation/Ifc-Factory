#ifndef IFCX_CONVERTERS_H
#define IFCX_CONVERTERS_H

#include "ifcx/document.h"
#include "ifcx/dxf_parser.h"
#include "ifcx/dxf_writer.h"
#include "ifcx/dwg_parser.h"
#include "ifcx/dgn_parser.h"

#include <cstdint>
#include <filesystem>
#include <fstream>
#include <string>
#include <vector>

namespace ifcx {

// ---------------------------------------------------------------------------
// Forward declarations for implementation functions (defined in .cpp files)
// ---------------------------------------------------------------------------

/// DXF import from string content.
IfcxDocument dxf_import_from_string(const std::string& dxf_content);

/// DXF import from file path.
IfcxDocument dxf_import_from_file(const std::string& path);

/// DXF export to string.
std::string dxf_export_to_string(const IfcxDocument& doc,
                                  const std::string& version = "AC1032");

/// DXF export to file.
void dxf_export_to_file(const IfcxDocument& doc, const std::string& path,
                         const std::string& version = "AC1032");

/// DWG import from raw bytes.
IfcxDocument dwg_import_from_bytes(const uint8_t* data, size_t size);

/// DWG import from file path.
IfcxDocument dwg_import_from_file(const std::string& path);

/// DGN import from raw bytes.
IfcxDocument dgn_import_from_bytes(const uint8_t* data, size_t size);

/// DGN import from file path.
IfcxDocument dgn_import_from_file(const std::string& path);

// ---------------------------------------------------------------------------
// DxfImporter -- imports DXF files into IFCX documents
// ---------------------------------------------------------------------------

class DxfImporter {
public:
    /// Import DXF from string content.
    static IfcxDocument from_string(const std::string& dxf) {
        return dxf_import_from_string(dxf);
    }

    /// Import DXF from file path.
    static IfcxDocument from_file(const std::filesystem::path& path) {
        return dxf_import_from_file(path.string());
    }
};

// ---------------------------------------------------------------------------
// DxfExporter -- exports IFCX documents to DXF format
// ---------------------------------------------------------------------------

class DxfExporter {
public:
    /// Export to DXF string.
    static std::string to_string(const IfcxDocument& doc,
                                  const std::string& version = "AC1032") {
        return dxf_export_to_string(doc, version);
    }

    /// Export to DXF file.
    static void to_file(const IfcxDocument& doc, const std::filesystem::path& path,
                        const std::string& version = "AC1032") {
        dxf_export_to_file(doc, path.string(), version);
    }
};

// ---------------------------------------------------------------------------
// DwgImporter -- imports DWG binary files into IFCX documents
// ---------------------------------------------------------------------------

class DwgImporter {
public:
    /// Import DWG from raw bytes.
    static IfcxDocument from_bytes(const uint8_t* data, size_t size) {
        return dwg_import_from_bytes(data, size);
    }

    /// Import DWG from a byte vector.
    static IfcxDocument from_bytes(const std::vector<uint8_t>& data) {
        return dwg_import_from_bytes(data.data(), data.size());
    }

    /// Import DWG from file path.
    static IfcxDocument from_file(const std::filesystem::path& path) {
        return dwg_import_from_file(path.string());
    }
};

// ---------------------------------------------------------------------------
// DgnImporter -- imports DGN V7 binary files into IFCX documents
// ---------------------------------------------------------------------------

class DgnImporter {
public:
    /// Import DGN from raw bytes.
    static IfcxDocument from_bytes(const uint8_t* data, size_t size) {
        return dgn_import_from_bytes(data, size);
    }

    /// Import DGN from a byte vector.
    static IfcxDocument from_bytes(const std::vector<uint8_t>& data) {
        return dgn_import_from_bytes(data.data(), data.size());
    }

    /// Import DGN from file path.
    static IfcxDocument from_file(const std::filesystem::path& path) {
        return dgn_import_from_file(path.string());
    }
};

} // namespace ifcx

#endif // IFCX_CONVERTERS_H
