#ifndef IFCX_DXF_WRITER_H
#define IFCX_DXF_WRITER_H

#include <cstdint>
#include <sstream>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

namespace ifcx {

/// Low-level DXF ASCII writer.
/// Builds a DXF string incrementally by emitting group-code/value pairs.
class DxfWriter {
public:
    DxfWriter();

    // -----------------------------------------------------------------
    // Primitive writers
    // -----------------------------------------------------------------

    /// Write a single group-code / value pair (string).
    void group(int code, const std::string& value);

    /// Write a single group-code / value pair (integer).
    void group(int code, int value);

    /// Write a single group-code / value pair (double).
    void group(int code, double value);

    /// Write a single group-code / value pair (bool).
    void group(int code, bool value);

    /// Write a 3D point using consecutive group codes.
    /// code_base gives the X code; Y = code_base+10; Z = code_base+20.
    void point(double x, double y, double z = 0.0, int code_base = 10);

    /// Write a handle (group code 5).
    void handle(const std::string& h);

    /// Allocate and return the next handle as a hex string.
    std::string next_handle();

    /// Write the entity-type marker (group code 0).
    void entity(const std::string& entity_type);

    // -----------------------------------------------------------------
    // Section helpers
    // -----------------------------------------------------------------

    /// Begin a SECTION with the given name.
    void begin_section(const std::string& name);

    /// End the current SECTION.
    void end_section();

    /// Begin a TABLE with the given name.
    void begin_table(const std::string& name, const std::string& table_handle, int entries = 0);

    /// End the current TABLE.
    void end_table();

    // -----------------------------------------------------------------
    // Output
    // -----------------------------------------------------------------

    /// Return the complete DXF content as a string (LF line endings).
    std::string to_string() const;

private:
    std::vector<std::string> lines_;
    uint64_t handle_counter_ = 1;
};

} // namespace ifcx

#endif // IFCX_DXF_WRITER_H
