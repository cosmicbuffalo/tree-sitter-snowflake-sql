import { comma_list, paren_list } from "../helpers.js";

export default {

  _alter_statement: $ => seq(
    choice(
      $.alter_table,
      $.alter_view,
      $.alter_schema,
      $.alter_database,
      $.alter_role,
      // Snowflake
      $.alter_snowflake_named_object,
      $.alter_snowflake_object,
      $.alter_routine,
    ),
  ),

  alter_table: $ => seq(
    $.keyword_alter,
    optional($.keyword_iceberg),
    $.keyword_table,
    optional($._if_exists),
    $.object_reference,
    $._alter_specifications,
    repeat(
      seq(
        ",",
        $._alter_specifications
      )
    ),
  ),

  _alter_specifications: $ => choice(
    $.add_column,
    // Bare ADD COLUMN continuation: COLUMN col TYPE (after ADD COLUMN c1 TYPE, COLUMN c2 TYPE, ...)
    alias($._bare_add_column, $.add_column),
    // Bare column_definition continuation: col TYPE (after ADD COLUMN IF NOT EXISTS c1 TYPE, c2 TYPE, ...)
    alias($._bare_column_def, $.add_column),
    $.add_constraint,
    $.drop_constraint,
    $.alter_column,
    $.modify_column,
    // Bare column action continuation: col DROP NOT NULL (after ALTER COLUMN c1 DROP NOT NULL, ...)
    alias($._bare_alter_column, $.alter_column),
    $.drop_column,
    // Bare DROP COLUMN continuation: COLUMN IF EXISTS col or bare col (after DROP COLUMN c1, ...)
    alias($._bare_drop_column, $.drop_column),
    $.rename_object,
    $.rename_column,
    // Snowflake: ALTER TABLE t CLUSTER BY (col1, col2)
    $.cluster_by,
    // Snowflake: ALTER TABLE t SET prop = value ...
    seq($.keyword_set, $._snowflake_options),
    // Snowflake: ALTER TABLE t DROP PRIMARY KEY
    seq($.keyword_drop, $._primary_key),
    // Snowflake: ALTER TABLE t DROP CLUSTERING KEY
    seq($.keyword_drop, $.keyword_clustering, $.keyword_key),
    // Snowflake: ALTER TABLE t ADD SEARCH OPTIMIZATION [ON method(cols), ...]
    prec.right(seq($.keyword_add, $.keyword_search, $.keyword_optimization,
      optional(seq($.keyword_on, comma_list($.invocation, true))))),
    // Snowflake: ALTER TABLE t RENAME CONSTRAINT a TO b
    seq($.keyword_rename, $.keyword_constraint, $.identifier, $.keyword_to, $.identifier),
    // Snowflake: ALTER TABLE t ADD DATA METRIC FUNCTION func ON (col1, col2)
    seq($.keyword_add, $.keyword_data, $.keyword_metric, $.keyword_function, $.object_reference,
      $.keyword_on, paren_list($.identifier, true)),
    // Snowflake: ALTER TABLE t DROP DATA METRIC FUNCTION func ON (col1, col2)
    seq($.keyword_drop, $.keyword_data, $.keyword_metric, $.keyword_function, $.object_reference,
      $.keyword_on, paren_list($.identifier, true)),
  ),

  // ADD COLUMN — keyword_add is required to prevent ambiguity with drop_column continuations
  add_column: $ => seq(
    $.keyword_add,
    optional(
      $.keyword_column,
    ),
    optional($._if_not_exists),
    $.column_definition,
  ),

  // Bare ADD COLUMN continuation: COLUMN col TYPE (after ADD COLUMN c1 TYPE, COLUMN c2 TYPE)
  // Requires COLUMN keyword to disambiguate from other specs
  _bare_add_column: $ => seq(
    $.keyword_column,
    optional($._if_not_exists),
    $.column_definition,
  ),

  // Bare column_definition continuation: col TYPE (after ADD COLUMN IF NOT EXISTS c1 TYPE, c2 TYPE)
  // No COLUMN keyword — just a raw column_definition for multi-column ADD without COLUMN on continuations
  _bare_column_def: $ => seq(
    $.column_definition,
  ),

  // ADD [CONSTRAINT name] { PRIMARY KEY | UNIQUE | FOREIGN KEY } (cols) ...
  add_constraint: $ => seq(
    $.keyword_add,
    $.constraint,
  ),

  drop_constraint: $ => seq(
    $.keyword_drop,
    $.keyword_constraint,
    optional($._if_exists),
    $.identifier,
    optional($._drop_behavior),
  ),

  alter_column: $ => seq(
    // TODO constraint management
    $.keyword_alter,
    optional(
      $.keyword_column,
    ),
    field('name', $.identifier),
    $._alter_column_action,
  ),

  // Bare column action for multi-column ALTER: col DROP NOT NULL (no ALTER keyword)
  _bare_alter_column: $ => seq(
    field('name', $.identifier),
    $._alter_column_action,
  ),

  _alter_column_action: $ => choice(
    seq(
      choice(
        $.keyword_set,
        $.keyword_drop,
      ),
      $.keyword_not,
      $.keyword_null,
    ),
    // Snowflake: ALTER COLUMN col NOT NULL (bare, without SET/DROP)
    $._not_null,
    // Snowflake: ALTER COLUMN col COMMENT 'text'
    seq($.keyword_comment, alias($._literal_string, $.literal)),
    seq(
      optional(
        seq(
          $.keyword_set,
          $.keyword_data,
        ),
      ),
      $.keyword_type,
      field('type', $._type),
    ),
    seq($.keyword_set, $.keyword_default, $._expression),
    seq(
      $.keyword_drop,
      $.keyword_default,
    ),
  ),

  // Snowflake: MODIFY is a synonym of ALTER (ALTER TABLE t MODIFY COLUMN c DROP NOT NULL)
  modify_column: $ => seq(
    $.keyword_modify,
    optional($.keyword_column),
    field('name', $.identifier),
    $._alter_column_action,
  ),

  drop_column: $ => prec.left(seq(
    $.keyword_drop,
    optional($.keyword_column),
    optional($._if_exists),
    field('name', $.identifier),
    repeat(seq(
      ',',
      optional($.keyword_column),
      optional($._if_exists),
      field('name', $.identifier),
    )),
  )),

  // Bare DROP COLUMN continuation: COLUMN IF EXISTS col (no DROP keyword)
  // IF EXISTS is required to disambiguate from ADD COLUMN continuations
  _bare_drop_column: $ => seq(
    $.keyword_column,
    $._if_exists,
    field('name', $.identifier),
  ),

  rename_column: $ => seq(
    $.keyword_rename,
    optional(
      $.keyword_column,
    ),
    field('old_name', $.identifier),
    $.keyword_to,
    field('new_name', $.identifier),
  ),

  alter_view: $ => seq(
    $.keyword_alter,
    $.keyword_view,
    optional($._if_exists),
    $.object_reference,
    choice(
      $.rename_object,
      $.rename_column,
    ),
  ),

  // ALTER SCHEMA | DATABASE [IF EXISTS] name { RENAME TO new | SET props | UNSET prop }
  alter_schema: $ => seq(
    $.keyword_alter,
    $.keyword_schema,
    optional($._if_exists),
    $.object_reference,
    $._alter_container_action,
  ),

  alter_database: $ => seq(
    $.keyword_alter,
    $.keyword_database,
    optional($._if_exists),
    $.object_reference,
    $._alter_container_action,
  ),

  // ALTER ROLE | USER [IF EXISTS] name { RENAME TO new | SET props | UNSET prop }
  alter_role: $ => seq(
    $.keyword_alter,
    choice($.keyword_role, $.keyword_user),
    optional($._if_exists),
    $.object_reference,
    $._alter_container_action,
  ),

  _alter_container_action: $ => choice(
    $.rename_object,
    seq($.keyword_set, $._snowflake_options),
    seq($.keyword_unset, $.identifier),
  ),

  _drop_behavior: $ => choice(
    $.keyword_cascade,
    $.keyword_restrict,
  ),

  rename_object: $ => seq(
    $.keyword_rename,
    $.keyword_to,
    $.object_reference,
  ),

};
