#ifndef IFCX_CONVERTERS_H
#define IFCX_CONVERTERS_H

#include "ifcx/document.h"
#include <string>
#include <filesystem>
#include <stdexcept>

namespace ifcx {

/// Imports DXF files into IFCX documents.
class DxfImporter {
public:
    /// Import DXF from string.
    static IfcxDocument from_string(const std::string& dxf) {
        (void)dxf;
        // TODO: Implement DXF parser
        throw std::runtime_error("DXF import not yet implemented");
    }

    /// Import DXF from file.
    static IfcxDocument from_file(const std::filesystem::path& path) {
        (void)path;
        throw std::runtime_error("DXF import not yet implemented");
    }
};

/// Exports IFCX documents to DXF format.
class DxfExporter {
public:
    /// Export to DXF string.
    static std::string to_string(const IfcxDocument& doc, const std::string& version = "AC1032") {
        (void)doc; (void)version;
        // TODO: Implement DXF writer
        throw std::runtime_error("DXF export not yet implemented");
    }

    /// Export to DXF file.
    static void to_file(const IfcxDocument& doc, const std::filesystem::path& path,
                        const std::string& version = "AC1032") {
        (void)doc; (void)path; (void)version;
        throw std::runtime_error("DXF export not yet implemented");
    }
};

} // namespace ifcx

#endif // IFCX_CONVERTERS_H
