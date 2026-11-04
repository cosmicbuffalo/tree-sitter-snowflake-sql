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
    optional($.keyword_only),
    $.object_reference,
    choice(
      seq(
        $._alter_specifications,
        repeat(
          seq(
            ",",
            $._alter_specifications
          )
        )
      ),
      seq(
        choice(
          $.keyword_enable,
          $.keyword_disable,
          seq(optional($.keyword_no), $.keyword_force),
        ),
        $.keyword_row,
        $.keyword_level,
        $.keyword_security,
      ),
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
    // Bare column action continuation: col DROP NOT NULL (after ALTER COLUMN c1 DROP NOT NULL, ...)
    alias($._bare_alter_column, $.alter_column),
    $.modify_column,
    $.change_column,
    $.drop_column,
    // Bare DROP COLUMN continuation: COLUMN IF EXISTS col or bare col (after DROP COLUMN c1, ...)
    alias($._bare_drop_column, $.drop_column),
    $.rename_object,
    $.rename_column,
    $.set_schema,
    $.change_ownership,
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
    optional($.column_position),
  ),

  // Bare ADD COLUMN continuation: COLUMN col TYPE (after ADD COLUMN c1 TYPE, COLUMN c2 TYPE)
  // Requires COLUMN keyword to disambiguate from other specs
  _bare_add_column: $ => seq(
    $.keyword_column,
    optional($._if_not_exists),
    $.column_definition,
    optional($.column_position),
  ),

  // Bare column_definition continuation: col TYPE (after ADD COLUMN IF NOT EXISTS c1 TYPE, c2 TYPE)
  // No COLUMN keyword — just a raw column_definition for multi-column ADD without COLUMN on continuations
  _bare_column_def: $ => seq(
    $.column_definition,
    optional($.column_position),
  ),

  add_constraint: $ => seq(
    $.keyword_add,
    optional($.keyword_constraint),
    $.identifier,
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
    seq(
      $.keyword_set,
      choice(
        seq(
          $.keyword_statistics,
          field('statistics', $._integer)
        ),
        seq(
          $.keyword_storage,
          choice(
            $.keyword_plain,
            $.keyword_external,
            $.keyword_extended,
            $.keyword_main,
            $.keyword_default,
          ),
        ),
        seq(
          $.keyword_compression,
          field('compression_method', $._identifier)
        ),
        seq(
          paren_list($._key_value_pair, true),
        ),
        seq(
          $.keyword_default,
          $._expression,
        ),
      )
    ),
    seq(
      $.keyword_drop,
      $.keyword_default,
    ),
  ),

  modify_column: $ => prec.left(seq(
    $.keyword_modify,
    optional(
      $.keyword_column,
    ),
    optional($._if_exists),
    choice(
      $.column_definition,
      // Snowflake: MODIFY COLUMN col COMMENT '...' (no type, just constraint)
      seq(field('name', $._column), repeat1($._column_constraint)),
    ),
    optional($.column_position),
  )),

  change_column: $ => seq(
    $.keyword_change,
    optional(
      $.keyword_column,
    ),
    optional($._if_exists),
    field('old_name', $.identifier),
    $.column_definition,
    optional($.column_position),
  ),

  column_position: $ => choice(
    $.keyword_first,
    seq(
      $.keyword_after,
      field('col_name', $.identifier),
    ),
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
      // TODO Postgres allows a single "alter column" to set or drop default
      $.rename_object,
      $.rename_column,
      $.set_schema,
      $.change_ownership,
    ),
  ),

  alter_schema: $ => seq(
    $.keyword_alter,
    $.keyword_schema,
    $.identifier,
    choice(
      $.keyword_rename,
      $.keyword_owner,
    ),
    $.keyword_to,
    $.identifier,
  ),

  alter_database: $ => seq(
    $.keyword_alter,
    $.keyword_database,
    $.identifier,
    optional($.keyword_with),
    choice(
      seq($.rename_object),
      seq($.change_ownership),
      seq(
        $.keyword_reset,
        choice(
          $.keyword_all,
          field("configuration_parameter", $.identifier)
        ),
      ),
      seq(
        $.keyword_set,
        choice(
          seq($.keyword_tablespace, $.identifier),
            $.set_configuration,
          ),
        ),
      ),
    ),

  alter_role: $ => prec.left(seq(
    $.keyword_alter,
    choice(
      $.keyword_role,
      $.keyword_group,
      $.keyword_user,
    ),
    choice($.identifier, $.keyword_all),
    choice(
      $.rename_object,
      seq(optional($.keyword_with),repeat($._role_options)),
      seq(
        optional(seq($.keyword_in, $.keyword_database, $.identifier)),
        choice(
          seq(
            $.keyword_set,
            $.set_configuration,
          ),
          seq(
            $.keyword_reset,
            choice(
              $.keyword_all,
              field("option", $.identifier),
            )),
        ),
      )
    ),
  )),

  set_configuration: $ => seq(
    field("option", $.identifier),
    choice(
      seq($.keyword_from, $.keyword_current),
      seq(
        choice($.keyword_to, "="),
        choice(
          field("parameter", $.identifier),
          $.literal,
          $.keyword_default
        )
      )
    ),
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

  set_schema: $ => seq(
    $.keyword_set,
    $.keyword_schema,
    field('schema', $.identifier),
  ),

  change_ownership: $ => seq(
    $.keyword_owner,
    $.keyword_to,
    $.identifier,
  ),

};
