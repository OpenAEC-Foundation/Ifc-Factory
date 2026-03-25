#ifndef IFCX_DXF_PARSER_H
#define IFCX_DXF_PARSER_H

#include <cstdint>
#include <functional>
#include <map>
#include <optional>
#include <string>
#include <variant>
#include <vector>

#include <nlohmann/json.hpp>

namespace ifcx {

// ---------------------------------------------------------------------------
// DXF value types
// ---------------------------------------------------------------------------

/// A parsed DXF value: string, int, double, or bool.
using DxfValue = std::variant<std::string, int, double, bool>;

/// A single group-code / value pair.
struct DxfToken {
    int code = 0;
    DxfValue value;
};

// ---------------------------------------------------------------------------
// DxfTokenizer
// ---------------------------------------------------------------------------

/// Tokenizes DXF ASCII content into (group-code, typed-value) pairs.
class DxfTokenizer {
public:
    /// Tokenize a full DXF string and return all tokens.
    static std::vector<DxfToken> tokenize(const std::string& content);

    /// Return the expected value type for a DXF group code.
    /// Returns "str", "float", "int", or "bool".
    static std::string value_type_for_code(int code);

    /// Cast a raw string value to the appropriate DxfValue.
    static DxfValue cast_value(int code, const std::string& raw);
};

// ---------------------------------------------------------------------------
// DxfFile -- in-memory representation of a parsed DXF file
// ---------------------------------------------------------------------------

struct DxfFile {
    nlohmann::json header;                                    // header variables
    std::map<std::string, std::vector<nlohmann::json>> tables; // table name -> entries
    std::map<std::string, nlohmann::json> blocks;             // block name -> block data
    std::vector<nlohmann::json> entities;                     // entity list
    std::vector<nlohmann::json> objects;                      // objects section
};

// ---------------------------------------------------------------------------
// Token stream -- peekable wrapper for parsing
// ---------------------------------------------------------------------------

class TokenStream {
public:
    explicit TokenStream(std::vector<DxfToken> tokens);

    /// Peek at the next token without consuming it.
    const DxfToken* peek() const;

    /// Consume and return the next token. Returns nullptr if exhausted.
    std::optional<DxfToken> next();

    /// Push a token back to the front.
    void push_back(DxfToken token);

    /// Check if the stream is exhausted.
    bool done() const;

private:
    std::vector<DxfToken> tokens_;
    size_t pos_ = 0;
    std::vector<DxfToken> pushback_;
};

// ---------------------------------------------------------------------------
// DxfParser
// ---------------------------------------------------------------------------

/// Parses DXF ASCII content into a DxfFile.
class DxfParser {
public:
    /// Parse a full DXF string and return a DxfFile.
    DxfFile parse(const std::string& content);

private:
    // Section parsers
    nlohmann::json parse_header(TokenStream& tokens);
    std::map<std::string, std::vector<nlohmann::json>> parse_tables(TokenStream& tokens);
    std::map<std::string, nlohmann::json> parse_blocks(TokenStream& tokens);
    std::vector<nlohmann::json> parse_entities(TokenStream& tokens);
    std::vector<nlohmann::json> parse_objects(TokenStream& tokens);

    // Table helpers
    std::vector<nlohmann::json> parse_table_entries(TokenStream& tokens,
                                                      const std::string& table_name);
    nlohmann::json parse_table_entry(TokenStream& tokens, const std::string& entry_type,
                                     const std::string& table_name);

    // Block helper
    nlohmann::json parse_block(TokenStream& tokens);

    // Entity parser
    nlohmann::json parse_entity(const std::string& entity_type, TokenStream& tokens);

    // Object parser
    nlohmann::json parse_generic_object(const std::string& obj_type, TokenStream& tokens);

    // Entity-specific parsers
    nlohmann::json parse_line(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_point(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_circle(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_arc(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_ellipse(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_spline(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_lwpolyline(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_polyline(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_text(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_mtext(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_dimension(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_leader(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_hatch(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_insert(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_attdef(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_attrib(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_solid_trace(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_3dface(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_viewport(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_xline_ray(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_image(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_wipeout(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_acis(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_mesh(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_table_entity(const std::string& etype, TokenStream& tokens);
    nlohmann::json parse_generic_entity(const std::string& etype, TokenStream& tokens);

    // Vertex helper
    nlohmann::json parse_vertex(TokenStream& tokens);

    // Code collection
    std::vector<std::pair<int, DxfValue>> collect_codes(TokenStream& tokens);

    // Common property application
    static bool apply_common(nlohmann::json& entity, int code, const DxfValue& value);

    // Table entry application helpers
    static void apply_layer_code(nlohmann::json& entry, int code, const DxfValue& value);
    static void apply_ltype_code(nlohmann::json& entry, int code, const DxfValue& value,
                                 std::vector<double>& elements);
    static void apply_style_code(nlohmann::json& entry, int code, const DxfValue& value);
    static void apply_dimstyle_code(nlohmann::json& entry, int code, const DxfValue& value);
    static void apply_generic_table_code(nlohmann::json& entry, int code, const DxfValue& value);

    // Skip helpers
    void skip_section(TokenStream& tokens);
    void skip_to_next_entity(TokenStream& tokens);

    // Header variable collapse
    static nlohmann::json collapse_header_var(
        const std::vector<std::pair<int, DxfValue>>& pairs);
};

/// Helper to get a string from a DxfValue.
std::string dxf_value_to_string(const DxfValue& v);

/// Helper to get a double from a DxfValue.
double dxf_value_to_double(const DxfValue& v);

/// Helper to get an int from a DxfValue.
int dxf_value_to_int(const DxfValue& v);

} // namespace ifcx

#endif // IFCX_DXF_PARSER_H
