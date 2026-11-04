import { comma_list, paren_list, wrapped_in_parenthesis } from "../helpers.js";

import create_function_rules from "./create-function.js";
import create_procedure_rules from "./create-procedure.js";

export default {

  _create_statement: $ => seq(
    choice(
      $.create_table,
      $.create_view,
      $.create_function,
      $.create_procedure,
      $.create_database,
      $.create_role,
      $.create_sequence,
      // Snowflake
      $.create_snowflake_named_object,
      $.create_pipe,
      $.create_stream,
      $.create_task,
      $.create_dynamic_table,
      $.create_snowflake_object,
      $.create_data_metric_function,
      prec.left(seq(
        $.create_schema,
        repeat($._create_statement),
      )),
    ),
  ),

  // left precedence because 'quoted' table options otherwise conflict with
  // `create function` string bodies; if you remove this precedence you will
  // have to also disable the `_literal_string` choice for the `name` field
  // in =-assigned `table_option`s
  create_table: $ => prec.left(
    seq(
      $.keyword_create,
      optional($._or_replace),
      optional(
        choice(
          $._temporary,
          $.keyword_external,
          $.keyword_iceberg,
          $.keyword_hybrid,
          $.keyword_transient,
        )
      ),
      $.keyword_table,
      optional($._if_not_exists),
      $.object_reference,
      choice(
        seq(
          $.column_definitions,
          repeat($._table_settings),
          optional(
            seq(
              $.keyword_as,
              $._select_statement,
            ),
          )
        ),
        seq(
          repeat($._table_settings),
          seq(
            $.keyword_as,
            $.create_query,
          ),
        ),
        // CREATE TABLE ... CLONE source_table
        seq($.keyword_clone, $.object_reference),
        // CREATE TABLE ... LIKE other_table (Snowflake clone-structure)
        seq(
          $.keyword_like,
          $.object_reference,
          repeat($._table_settings),
        ),
      ),
    ),
  ),

  _table_settings: $ => choice(
    $.table_partition,
    $.cluster_by,
    $.table_option,
  ),

  // Snowflake: CLUSTER BY (col1, col2, expr)
  cluster_by: $ => seq(
    $.keyword_cluster,
    $.keyword_by,
    paren_list($._expression, true),
  ),

  // Snowflake Iceberg: PARTITION BY (col, MONTH(col), BUCKET(8, col), ...)
  table_partition: $ => seq(
    $.keyword_partition,
    $.keyword_by,
    paren_list($._expression, true),
  ),

  table_option: $ => choice(
    seq($.keyword_collate, $.identifier),
    field('name', $.keyword_default),
    seq(
      field('name', choice($.identifier, $._literal_string)),
      '=',
      field('value', choice($.identifier, $._literal_string, alias($._integer, $.literal))),
    ),
  ),

  create_query: $ => choice(
    $._dml_read,
    // AS ( WITH cte AS (...) SELECT ... )
    wrapped_in_parenthesis(seq($._cte, choice($._select_statement, $.set_operation))),
  ),

  create_view: $ => prec.right(
    seq(
      $.keyword_create,
      optional($._or_replace),
      optional($.keyword_secure),
      optional($._temporary),
      optional($.keyword_recursive),
      $.keyword_view,
      optional($._if_not_exists),
      $.object_reference,
      optional(paren_list($.identifier)),
      // Snowflake: COPY GRANTS, COMMENT = '...'
      repeat(choice(
        seq($.keyword_copy, $.keyword_grants),
        $.procedure_comment,
      )),
      $.keyword_as,
      $.create_query,
    ),
  ),

  ...create_function_rules,
  ...create_procedure_rules,

  create_schema: $ => prec.left(seq(
    $.keyword_create,
    $.keyword_schema,
    choice(
      seq(
        optional($._if_not_exists),
        $.identifier,
        optional(seq($.keyword_authorization, $.identifier)),
      ),
      seq(
        $.keyword_authorization,
        $.identifier,
      ),
    ),
  )),

  _with_settings: $ => seq(
        field('name', $.identifier),
        optional('='),
        field('value', choice($.identifier, alias($._single_quote_string, $.literal))),
  ),

  create_database: $ => prec.left(seq(
    $.keyword_create,
    $.keyword_database,
    optional($._if_not_exists),
    $.identifier,
    optional($.keyword_with),
    repeat(
      $._with_settings
    ),
  )),

  create_role: $ => prec.left(seq(
    $.keyword_create,
    choice(
      $.keyword_user,
      $.keyword_role,
      $.keyword_group,
    ),
    $.identifier,
    optional($.keyword_with),
    repeat(
      choice(
        $._user_access_role_config,
        $._role_options,
      ),
    ),
  )),

  _role_options: $ => choice(
    field("option", $.identifier),
    seq(
      $.keyword_valid,
      $.keyword_until,
      field("valid_until", alias($._literal_string, $.literal))
    ),
    seq(
      $.keyword_connection,
      $.keyword_limit,
      field("connection_limit", alias($._integer, $.literal))
    ),
    seq(
      optional($.keyword_encrypted),
      $.keyword_password,
      choice(
        field("password", alias($._literal_string, $.literal)),
        $.keyword_null,
      ),
    ),
  ),

  _user_access_role_config: $ => seq(
    choice(
      seq(optional($.keyword_in), $.keyword_role),
      seq($.keyword_in, $.keyword_group),
      $.keyword_admin,
      $.keyword_user,
    ),
    comma_list($.identifier, true),
  ),

  create_sequence: $ => seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_sequence,
    optional($._if_not_exists),
    $.object_reference,
    repeat(
      choice(
        seq($.keyword_increment, optional(choice($.keyword_by, '=')), field("increment", alias($._integer, $.literal))),
        seq($.keyword_start, optional(choice($.keyword_with, '=')), field("start", alias($._integer, $.literal))),
        seq($.keyword_cache, field("cache", alias($._integer, $.literal))),
        seq($.keyword_order),
        seq($.keyword_no, $.keyword_order),
        $.table_option,
      )
    ),
  ),

};
