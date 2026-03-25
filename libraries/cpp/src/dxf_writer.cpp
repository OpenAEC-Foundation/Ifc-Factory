#include "ifcx/dxf_writer.h"

#include <iomanip>
#include <sstream>

namespace ifcx {

DxfWriter::DxfWriter() = default;

// ---------------------------------------------------------------------------
// Primitive writers
// ---------------------------------------------------------------------------

void DxfWriter::group(int code, const std::string& value) {
    std::ostringstream oss;
    oss << std::setw(3) << code;
    lines_.push_back(oss.str());
    lines_.push_back(value);
}

void DxfWriter::group(int code, int value) {
    group(code, std::to_string(value));
}

void DxfWriter::group(int code, double value) {
    std::ostringstream oss;
    oss << std::setw(3) << code;
    lines_.push_back(oss.str());

    std::ostringstream voss;
    voss << std::setprecision(12) << std::defaultfloat << value;
    lines_.push_back(voss.str());
}

void DxfWriter::group(int code, bool value) {
    group(code, value ? 1 : 0);
}

void DxfWriter::point(double x, double y, double z, int code_base) {
    group(code_base, x);
    group(code_base + 10, y);
    group(code_base + 20, z);
}

void DxfWriter::handle(const std::string& h) {
    group(5, h);
}

std::string DxfWriter::next_handle() {
    std::ostringstream oss;
    oss << std::uppercase << std::hex << handle_counter_;
    handle_counter_++;
    return oss.str();
}

void DxfWriter::entity(const std::string& entity_type) {
    group(0, entity_type);
}

// ---------------------------------------------------------------------------
// Section helpers
// ---------------------------------------------------------------------------

void DxfWriter::begin_section(const std::string& name) {
    group(0, std::string("SECTION"));
    group(2, name);
}

void DxfWriter::end_section() {
    group(0, std::string("ENDSEC"));
}

void DxfWriter::begin_table(const std::string& name, const std::string& table_handle,
                             int entries) {
    group(0, std::string("TABLE"));
    group(2, name);
    handle(table_handle);
    group(100, std::string("AcDbSymbolTable"));
    group(70, entries);
}

void DxfWriter::end_table() {
    group(0, std::string("ENDTAB"));
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

std::string DxfWriter::to_string() const {
    std::string result;
    for (auto& line : lines_) {
        result += line;
        result += '\n';
    }
    return result;
}

} // namespace ifcx
