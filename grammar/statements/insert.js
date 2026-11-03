import { comma_list } from "../helpers.js";

export default {

  _insert_statement: $ => seq(
    $.insert,
    optional($.returning),
  ),

  insert: $ => seq(
    choice(
      $.keyword_insert,
      $.keyword_replace
    ),
    optional(
      choice(
        $.keyword_into,
        $.keyword_overwrite, // Spark SQL
        seq($.keyword_overwrite, $.keyword_into), // Snowflake: INSERT OVERWRITE INTO
      ),
    ),
    $.object_reference,
    optional($.table_partition), // Spark SQL
    optional(
      seq(
        $.keyword_as,
        field('alias', $.identifier)
      ),
    ),
    $._insert_values,
  ),

  assignment_list: $ => seq(
    $.assignment,
    repeat(seq(',', $.assignment)),
  ),

  assignment: $ => seq(
    field('left',
      alias(
        $._qualified_field,
        $.field,
      ),
    ),
    '=',
    field('right', $._expression),
  ),

  _insert_values: $ => seq(
    optional(alias($._column_list, $.list)),
    choice(
      seq(
        $.keyword_values,
        comma_list($.list, true),
      ),
      $._dml_read,
    ),
  ),

  _set_values: $ => seq(
    $.keyword_set,
    comma_list($.assignment, true),
  ),

}
