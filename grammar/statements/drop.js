import { comma_list } from "../helpers.js";

export default {

  _drop_statement: $ => seq(
    choice(
      $.drop_table,
      $.drop_view,
      // $.drop_materialized_view, // removed: Postgres-specific, frees parse table budget
      // $.drop_index, // removed: Postgres/MySQL-specific, frees parse table budget
      // $.drop_type,  // removed: Postgres-specific, frees parse table budget
      $.drop_schema,
      $.drop_database,
      $.drop_role,
      // $.drop_sequence, // removed: Postgres-specific, frees parse table budget
      // $.drop_extension, // removed: Postgres-specific, frees parse table budget
      $.drop_function,
      $.drop_procedure,
      // Snowflake
      $.drop_snowflake_named_object,
      $.drop_snowflake_object,
    ),
  ),

  drop_table: $ => seq(
    $.keyword_drop,
    $.keyword_table,
    optional($._if_exists),
    $.object_reference,
    optional($._drop_behavior),
  ),

  drop_view: $ => seq(
    $.keyword_drop,
    $.keyword_view,
    optional($._if_exists),
    $.object_reference,
    optional($._drop_behavior),
  ),

  drop_materialized_view: $ => seq(
    $.keyword_drop,
    $.keyword_materialized,
    $.keyword_view,
    optional($._if_exists),
    $.object_reference,
    optional($._drop_behavior),
  ),

  drop_schema: $ => seq(
    $.keyword_drop,
    $.keyword_schema,
    optional($._if_exists),
    $.identifier,
    optional($._drop_behavior)
  ),

  drop_database: $ => prec.left(seq(
    $.keyword_drop,
    $.keyword_database,
    optional($._if_exists),
    $.identifier,
    optional($.keyword_with),
    optional($.keyword_force),
  )),

  drop_role: $ => seq(
    $.keyword_drop,
    choice(
      $.keyword_group,
      $.keyword_role,
      $.keyword_user,
    ),
    optional($._if_exists),
    $.identifier,
  ),

  drop_type: $ => seq(
    $.keyword_drop,
    $.keyword_type,
    optional($._if_exists),
    $.object_reference,
    optional($._drop_behavior),
  ),

  drop_sequence: $ => seq(
    $.keyword_drop,
    $.keyword_sequence,
    optional($._if_exists),
    $.object_reference,
    optional($._drop_behavior),
  ),

  drop_index: $ => seq(
    $.keyword_drop,
    $.keyword_index,
    optional($.keyword_concurrently),
    optional($._if_exists),
    field("name", $.identifier),
    optional($._drop_behavior),
    optional(
      seq(
          $.keyword_on,
          $.object_reference,
      ),
    ),
  ),

  drop_extension: $ => seq(
    $.keyword_drop,
    $.keyword_extension,
    optional($._if_exists),
    comma_list($.identifier, true),
    optional(choice($.keyword_cascade, $.keyword_restrict)),
  ),

  drop_function: $ => prec.left(seq(
    $.keyword_drop,
    $.keyword_function,
    optional($._if_exists),
    $.object_reference,
    optional($.function_arguments),
    optional($._drop_behavior),
  )),

  drop_procedure: $ => prec.left(seq(
    $.keyword_drop,
    $.keyword_procedure,
    optional($._if_exists),
    $.object_reference,
    optional($.function_arguments),
    optional($._drop_behavior),
  )),

};
