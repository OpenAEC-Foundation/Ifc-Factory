#ifndef IFCX_READER_H
#define IFCX_READER_H

#include <filesystem>
#include <string>

#include "ifcx/document.h"

namespace ifcx {

class IfcxReader {
public:
    /// Parse a JSON string into an IfcxDocument.
    static IfcxDocument from_string(const std::string& json_str);

    /// Read and parse an IFCX JSON file.
    static IfcxDocument from_file(const std::filesystem::path& path);
};

} // namespace ifcx

#endif // IFCX_READER_H
