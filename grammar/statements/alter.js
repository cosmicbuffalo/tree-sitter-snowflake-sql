import { paren_list } from "../helpers.js";

export default {

  _alter_statement: $ => seq(
    choice(
      $.alter_table,
      $.alter_view,
      // $.alter_materialized_view, // removed: Postgres-specific, frees parse table budget
      $.alter_schema,
      // $.alter_type,   // removed: Postgres-specific, frees parse table budget
      // $.alter_index,  // removed: Postgres-specific, frees parse table budget
      $.alter_database,
      $.alter_role,
      // $.alter_sequence, // removed: Postgres-specific, frees parse table budget
      // $.alter_policy, // removed: Postgres-specific, frees parse table budget
      // Snowflake
      $.alter_snowflake_named_object,
      $.alter_snowflake_object,
    ),
  ),

  alter_table: $ => seq(
    $.keyword_alter,
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

  alter_materialized_view: $ => seq(
    $.keyword_alter,
    $.keyword_materialized,
    $.keyword_view,
    optional($._if_exists),
    $.object_reference,
    choice(
      $.rename_object,
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

  alter_index: $ => seq(
    $.keyword_alter,
    $.keyword_index,
    optional($._if_exists),
    $.identifier,
    choice(
      $.rename_object,
      seq(
        $.keyword_alter,
        optional($.keyword_column),
        alias($._natural_number, $.literal),
        $.keyword_set,
        $.keyword_statistics,
        alias($._natural_number, $.literal),
      ),
      seq($.keyword_reset, paren_list($.identifier)),
      seq(
        $.keyword_set,
        choice(
          seq($.keyword_tablespace, $.identifier),
          paren_list(seq($.identifier, '=', field("value", $.literal)))
        ),
      ),
    ),
  ),

  alter_sequence: $ => seq(
    $.keyword_alter,
    $.keyword_sequence,
    optional($._if_exists),
    $.object_reference,
    choice(
      repeat1(
        choice(
          seq($.keyword_as, $._type),
          seq($.keyword_increment, optional($.keyword_by), $.literal),
          seq($.keyword_minvalue, choice($.literal, seq($.keyword_no, $.keyword_minvalue))),
          seq($.keyword_maxvalue, choice($.literal, seq($.keyword_no, $.keyword_maxvalue))),
          seq($.keyword_start, optional($.keyword_with), field("start", alias($._integer, $.literal))),
          seq($.keyword_restart, optional($.keyword_with), field("restart", alias($._integer, $.literal))),
          seq($.keyword_cache, field("cache", alias($._integer, $.literal))),
          seq(optional($.keyword_no), $.keyword_cycle),
          seq($.keyword_owned, $.keyword_by, choice($.keyword_none, $.object_reference)),
        ),
      ),
      $.rename_object,
      $.change_ownership,
      seq(
        $.keyword_set,
        choice(
          choice($.keyword_logged, $.keyword_unlogged),
          seq($.keyword_schema, $.identifier)
        ),
      ),
    ),
  ),

  // Postgres row level security
  alter_policy: $ => prec.right(
    seq(
      $.keyword_alter,
      $.keyword_policy,
      $.object_reference,
      $.keyword_on,
      $.object_reference,
      choice(
        $.rename_object,
        seq(
          optional(
            seq(
              $.keyword_to,
              choice(
                $.object_reference,
                $.keyword_public,
                $.keyword_current_role,
                $.keyword_current_user,
                $.keyword_session_user,
              ),
              repeat(
                seq(
                  ',',
                  choice(
                    $.object_reference,
                    $.keyword_public,
                    $.keyword_current_role,
                    $.keyword_current_user,
                    $.keyword_session_user,
                  ),
                ),
              ),
            ),
          ),
          optional(
            seq(
              $.keyword_using,
              $.parenthesized_expression,
            ),
          ),
          optional(
            seq(
              $.keyword_with,
              $.keyword_check,
              $.parenthesized_expression,
            ),
          ),
        ),
      ),
    ),
  ),

  alter_type: $ => seq(
    $.keyword_alter,
    $.keyword_type,
    $.identifier,
    choice(
      $.change_ownership,
      $.set_schema,
      $.rename_object,
      seq(
        $.keyword_rename,
        $.keyword_attribute,
        $.identifier,
        $.keyword_to,
        $.identifier,
        optional($._drop_behavior)
      ),
      seq(
        $.keyword_add,
        $.keyword_value,
        optional($._if_not_exists),
          alias($._single_quote_string,$.literal),
        optional(
          seq(
            choice($.keyword_before, $.keyword_after),
            alias($._single_quote_string,$.literal),
          )
        ),
      ),
      seq(
        $.keyword_rename,
        $.keyword_value,
        alias($._single_quote_string,$.literal),
        $.keyword_to,
        alias($._single_quote_string,$.literal),
      ),
      seq(
        choice(
          seq(
            $.keyword_add,
            $.keyword_attribute,
            $.identifier,
            $._type
          ),
          seq($.keyword_drop,
            $.keyword_attribute,
            optional($._if_exists),
            $.identifier),
          seq(
            $.keyword_alter,
            $.keyword_attribute,
            $.identifier,
            optional(seq($.keyword_set, $.keyword_data)),
            $.keyword_type,
            $._type
          ),
        ),
        optional(seq($.keyword_collate, $.identifier)),
        optional($._drop_behavior)
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
