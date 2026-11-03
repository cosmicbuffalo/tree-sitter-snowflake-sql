import { make_keyword, comma_list, paren_list, wrapped_in_parenthesis } from "./helpers.js";

export default {

  _type: $ => prec.left(
    seq(
      choice(
        $.keyword_boolean,
        $.bit,
        $.binary,
        $.varbinary,
        $.keyword_image,

        $.keyword_smallserial,
        $.keyword_serial,
        $.keyword_bigserial,

        $.tinyint,
        $.smallint,
        $.mediumint,
        $.int,
        $.bigint,
        $.decimal,
        $.numeric,
        $.double,
        $.float,

        $.keyword_money,
        $.keyword_smallmoney,

        $.char,
        $.varchar,
        $.nchar,
        $.nvarchar,
        $.numeric,
        $.keyword_string,
        $.keyword_text,

        $.keyword_uuid,

        $.keyword_json,
        $.keyword_jsonb,
        $.keyword_xml,

        $.keyword_bytea,
        $.keyword_inet,

        $.enum,

        $.keyword_date,
        $.keyword_datetime,
        $.datetime_type,
        $.keyword_datetime2,
        $.datetimeoffset,
        $.keyword_smalldatetime,
        $.time,
        $.timestamp,
        $.keyword_timestamptz,
        $.keyword_interval,

        $.keyword_geometry,
        $.keyword_geography,
        $.keyword_box2d,
        $.keyword_box3d,

        $.keyword_oid,
        $.keyword_name,
        $.keyword_regclass,
        $.keyword_regnamespace,
        $.keyword_regproc,
        $.keyword_regtype,

        // Snowflake semi-structured types
        $.keyword_variant,
        $.keyword_object,

        // Snowflake structured type MAP(k, v)
        $.map_type,

        // Snowflake numeric
        $.number,

        // Snowflake timestamp variants
        $.timestamp_ltz,
        $.timestamp_ntz,
        $.timestamp_tz,

        // Snowflake vector type
        $.vector,

        // Snowflake scripting types
        $.keyword_resultset,
        $.keyword_cursor,

        field("custom_type", $.object_reference)
      ),
      optional($.array_size_definition)
    ),
  ),

  // MAP(key_type, value_type)
  map_type: $ => seq(
    $.keyword_map,
    '(',
    field('key', $._type),
    ',',
    field('value', $._type),
    ')',
  ),

  array_size_definition: $ => prec.left(
    choice(
      seq($.keyword_array, optional($._array_size_definition)),
      repeat1($._array_size_definition),
    ),
  ),

  _array_size_definition: $ => seq(
    '[',
    optional(field("size", alias($._integer, $.literal))),
    ']'
  ),

  tinyint: $ => unsigned_type($, parametric_type($, $.keyword_tinyint)),
  smallint: $ => unsigned_type($, parametric_type($, $.keyword_smallint)),
  mediumint: $ => unsigned_type($, parametric_type($, $.keyword_mediumint)),
  int: $ => unsigned_type($, parametric_type($, $.keyword_int)),
  bigint: $ => unsigned_type($, parametric_type($, $.keyword_bigint)),

  bit: $ => choice(
      $.keyword_bit,
      seq(
          $.keyword_bit,
          prec(0, parametric_type($, $.keyword_varying, ['precision'])),
      ),
      prec(1, parametric_type($, $.keyword_bit, ['precision'])),
  ),

  binary: $ => parametric_type($, $.keyword_binary, ['precision']),
  varbinary: $ => parametric_type($, $.keyword_varbinary, ['precision']),

  // TODO: should qualify against /\\b(0?[1-9]|[1-4][0-9]|5[0-4])\\b/g
  float: $  => choice(
    parametric_type($, $.keyword_float, ['precision']),
    unsigned_type($, parametric_type($, $.keyword_float, ['precision', 'scale'])),
  ),

  double: $ => choice(
    make_keyword("float8"),
    unsigned_type($, parametric_type($, $.keyword_double, ['precision', 'scale'])),
    unsigned_type($, parametric_type($, seq($.keyword_double, $.keyword_precision), ['precision', 'scale'])),
    unsigned_type($, parametric_type($, $.keyword_real, ['precision', 'scale'])),
  ),

  decimal: $ => choice(
    parametric_type($, $.keyword_decimal, ['precision']),
    parametric_type($, $.keyword_decimal, ['precision', 'scale']),
  ),
  numeric: $ => choice(
    parametric_type($, $.keyword_numeric, ['precision']),
    parametric_type($, $.keyword_numeric, ['precision', 'scale']),
  ),
  char: $ => parametric_type($, $.keyword_char),
  varchar: $ => parametric_type($, $.keyword_varchar),
  nchar: $ => parametric_type($, $.keyword_nchar),
  nvarchar: $ => parametric_type($, $.keyword_nvarchar),

  _include_time_zone: $ => seq(
    choice($.keyword_with, $.keyword_without),
    $.keyword_time,
    $.keyword_zone,
  ),
  datetimeoffset: $ => parametric_type($, $.keyword_datetimeoffset),
  time: $ => seq(
    parametric_type($, $.keyword_time),
    optional($._include_time_zone),
  ),
  timestamp: $ => seq(
    parametric_type($, $.keyword_timestamp),
    optional($._include_time_zone),
  ),
  timestamptz: $ => parametric_type($, $.keyword_timestamptz),

  // Snowflake types
  number: $ => choice(
    parametric_type($, $.keyword_number, ['precision']),
    parametric_type($, $.keyword_number, ['precision', 'scale']),
  ),
  // DATETIME(precision) (alias of TIMESTAMP_NTZ)
  datetime_type: $ => seq($.keyword_datetime, wrapped_in_parenthesis(alias($._natural_number, $.literal))),
  timestamp_ltz: $ => parametric_type($, $.keyword_timestamp_ltz),
  timestamp_ntz: $ => parametric_type($, $.keyword_timestamp_ntz),
  timestamp_tz: $ => parametric_type($, $.keyword_timestamp_tz),
  // VECTOR(INT, 256) or VECTOR(FLOAT, 768)
  vector: $ => seq(
    $.keyword_vector,
    '(',
    field('element_type', $.identifier),
    ',',
    field('dimension', alias($._natural_number, $.literal)),
    ')',
  ),

  enum: $ => seq(
    $.keyword_enum,
    paren_list(field("value", alias($._literal_string, $.literal)), true)
  ),

  array: $ => choice(
    seq(
      $.keyword_array,
      choice(
        seq(
          "[",
          comma_list($._expression),
          "]"
        ),
        seq(
          "(",
          $._dml_read,
          ")",
        )
      )
    ),
    // Standalone array literal: ['a', 'b', 'c'] (sugar for ARRAY_CONSTRUCT)
    seq(
      "[",
      comma_list($._expression),
      "]"
    ),
  ),

};

function unsigned_type($, type) {
  return choice(
    seq($.keyword_unsigned, type),
    seq(
      type,
      optional($.keyword_unsigned),
      optional($.keyword_zerofill),
    ),
  )
}

function parametric_type($, type, params = ['size']) {
  return prec.right(1,
    choice(
      type,
      seq(
        type,
        wrapped_in_parenthesis(
          seq(
            // first parameter is guaranteed, shift it out of the array
            field(params.shift(), alias($._natural_number, $.literal)),
            // then, fill in the ", next" until done
            ...params.map(p => seq(',', field(p, alias($._natural_number, $.literal)))),
          ),
        ),
      ),
    ),
  )
}
