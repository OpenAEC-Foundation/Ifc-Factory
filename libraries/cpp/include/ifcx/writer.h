#ifndef IFCX_WRITER_H
#define IFCX_WRITER_H

#include <filesystem>
#include <string>

#include "ifcx/document.h"

namespace ifcx {

class IfcxWriter {
public:
    /// Serialize an IfcxDocument to a JSON string.
    static std::string to_string(const IfcxDocument& doc, int indent = 2);

    /// Write an IfcxDocument to a JSON file.
    static void to_file(const IfcxDocument& doc,
                        const std::filesystem::path& path,
                        int indent = 2);
};

} // namespace ifcx

#endif // IFCX_WRITER_H
