import { comma_list, paren_list } from "../helpers.js";

export default {

  // --- Umbrella rule for all new Snowflake statements ---
  // Named rule (not _prefixed) so tree-sitter doesn't inline it,
  // keeping it as a single choice in _ddl_statement to minimize state explosion
  snowflake_statement: $ => choice(
    $.describe_statement,
    $.use_statement,
    $.call_statement,
    $.execute_statement,
    $.undrop_statement,
    $.put_statement,
    $.get_statement,
    $.list_statement,
    $.snowflake_show_statement,
    $.alter_session,
  ),

  // --- ALTER SESSION ---
  // ALTER SESSION SET param = value | ALTER SESSION UNSET param
  alter_session: $ => seq(
    $.keyword_alter, $.keyword_session,
    choice(
      seq($.keyword_set, $._snowflake_options),
      seq($.keyword_unset, $.identifier),
    ),
  ),

  // --- Snowflake property helpers ---
  // A single key=value property (used in CREATE options)
  _snowflake_property: $ => seq(
    field('name', choice($.identifier, $.keyword_comment)),
    '=',
    field('value', choice(
      $.literal,
      $.identifier,
      $.snowflake_variable_reference,
      seq('(', $._snowflake_options, ')'),
      // NULL_IF = ('NULL', 'null')
      alias(paren_list($.literal, true), $.list),
    )),
  ),

  // A block of properties, optionally comma-separated
  _snowflake_options: $ => prec.left(seq(
    $._snowflake_property,
    repeat(seq(optional(','), $._snowflake_property)),
  )),

  // --- CREATE rules for simple Snowflake objects ---
  // Consolidated create for STAGE, FILE FORMAT, WAREHOUSE
  // Uses regex token to avoid 3 separate rules in _create_statement
  snowflake_create_object_type: _ => /[sS][tT][aA][gG][eE]|[fF][iI][lL][eE][\s_]+[fF][oO][rR][mM][aA][tT]|[wW][aA][rR][eE][hH][oO][uU][sS][eE]/,

  create_snowflake_named_object: $ => prec.left(seq(
    $.keyword_create,
    optional($._or_replace),
    optional($._temporary),
    $.snowflake_create_object_type,
    optional($._if_not_exists),
    choice($.object_reference, $.stage_reference),
    optional($._snowflake_options),
  )),

  // --- CREATE PIPE ---
  create_pipe: $ => prec.left(seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_pipe,
    optional($._if_not_exists),
    $.object_reference,
    optional($._snowflake_options),
    $.keyword_as,
    $.statement,
  )),

  // --- CREATE STREAM ---
  create_stream: $ => prec.left(seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_stream,
    optional($._if_not_exists),
    $.object_reference,
    $.keyword_on,
    optional($.keyword_event),
    $.keyword_table,
    $.object_reference,
    optional($._snowflake_options),
  )),

  // --- CREATE TASK ---
  create_task: $ => prec.left(seq(
    $.keyword_create,
    optional(choice($._or_replace, $._or_alter)),
    $.keyword_task,
    optional($._if_not_exists),
    $.object_reference,
    optional($._snowflake_options),
    optional(seq(
      $.keyword_after,
      comma_list($.object_reference, true),
    )),
    optional(seq(
      $.keyword_when,
      $._expression,
    )),
    $.keyword_as,
    choice(
      $.snowflake_scripting_block,
      $.statement,
    ),
  )),

  // --- CREATE DYNAMIC TABLE ---
  create_dynamic_table: $ => prec.left(seq(
    $.keyword_create,
    optional($._or_replace),
    optional($.keyword_transient),
    $.keyword_dynamic,
    optional($.keyword_iceberg),
    $.keyword_table,
    optional($._if_not_exists),
    $.object_reference,
    optional($.column_definitions),
    optional($._snowflake_options),
    $.keyword_as,
    $._select_statement,
  )),

  // --- DROP rules for Snowflake objects ---
  // Consolidated drop for STAGE, FILE FORMAT, PIPE, STREAM, TASK, WAREHOUSE
  // Uses regex token to avoid 6 separate rules in _drop_statement
  snowflake_drop_object_type: _ => /[dD][yY][nN][aA][mM][iI][cC]\s+([iI][cC][eE][bB][eE][rR][gG]\s+)?[tT][aA][bB][lL][eE]|[sS][tT][aA][gG][eE]|[fF][iI][lL][eE][\s_]+[fF][oO][rR][mM][aA][tT]|[pP][iI][pP][eE]|[sS][tT][rR][eE][aA][mM]|[tT][aA][sS][kK]|[wW][aA][rR][eE][hH][oO][uU][sS][eE]/,

  drop_snowflake_named_object: $ => seq(
    $.keyword_drop,
    $.snowflake_drop_object_type,
    optional($._if_exists),
    choice($.object_reference, $.stage_reference),
  ),

  // --- ALTER rules for Snowflake objects ---
  // Common alter actions for Snowflake objects
  _snowflake_alter_actions: $ => choice(
    seq($.keyword_set, $._snowflake_options),
    seq($.keyword_unset, $.identifier),
    $.rename_object,
    $.keyword_suspend,
    $.keyword_resume,
    $.keyword_refresh,
    // ALTER TASK ... MODIFY AS body | MODIFY WHEN expr
    seq($.keyword_modify, choice(
      seq($.keyword_as, choice($.snowflake_scripting_block, $.statement)),
      seq($.keyword_when, $._expression),
    )),
    // ALTER TASK ... ADD AFTER task | REMOVE AFTER task
    seq($.keyword_add, $.keyword_after, $.object_reference),
    seq($.keyword_remove, $.keyword_after, $.object_reference),
  ),

  // Consolidated alter for WAREHOUSE, STAGE, PIPE, STREAM, TASK, DYNAMIC [ICEBERG] TABLE
  // Uses regex token to avoid 5 separate rules in _alter_statement
  snowflake_alter_object_type: _ => /[wW][aA][rR][eE][hH][oO][uU][sS][eE]|[sS][tT][aA][gG][eE]|[pP][iI][pP][eE]|[sS][tT][rR][eE][aA][mM]|[tT][aA][sS][kK]|[dD][yY][nN][aA][mM][iI][cC]\s+([iI][cC][eE][bB][eE][rR][gG]\s+)?[tT][aA][bB][lL][eE]/,

  alter_snowflake_named_object: $ => prec.left(seq(
    $.keyword_alter,
    $.snowflake_alter_object_type,
    optional($._if_exists),
    $.object_reference,
    $._snowflake_alter_actions,
  )),

  // --- Generic Snowflake object types (ALERT, TAG, SHARE, etc.) ---
  // Uses a single regex token for the object type keyword to avoid state explosion
  // Matches: ALERT, TAG, SHARE, EXTERNAL TABLE, NETWORK POLICY, RESOURCE MONITOR, INTEGRATION
  snowflake_object_type: _ => /[aA][lL][eE][rR][tT]|[tT][aA][gG]|[sS][hH][aA][rR][eE]|[eE][xX][tT][eE][rR][nN][aA][lL]\s+[tT][aA][bB][lL][eE]|[nN][eE][tT][wW][oO][rR][kK]\s+[pP][oO][lL][iI][cC][yY]|[rR][eE][sS][oO][uU][rR][cC][eE]\s+[mM][oO][nN][iI][tT][oO][rR]|[iI][nN][tT][eE][gG][rR][aA][tT][iI][oO][nN]/,

  create_snowflake_object: $ => prec.left(seq(
    $.keyword_create,
    optional(choice($._or_replace, $._or_alter)),
    $.snowflake_object_type,
    optional($._if_not_exists),
    $.object_reference,
    optional($._snowflake_options),
    optional($.alert_condition),
  )),

  // CREATE ALERT ... IF (EXISTS (<query>)) THEN <action>
  alert_condition: $ => seq(
    $.keyword_if,
    '(',
    $.exists,
    ')',
    $.keyword_then,
    $.statement,
  ),

  drop_snowflake_object: $ => seq(
    $.keyword_drop,
    $.snowflake_object_type,
    optional($._if_exists),
    $.object_reference,
  ),

  alter_snowflake_object: $ => prec.left(seq(
    $.keyword_alter,
    $.snowflake_object_type,
    optional($._if_exists),
    $.object_reference,
    $._snowflake_alter_actions,
  )),

  // ALTER PROCEDURE|FUNCTION [IF EXISTS] name(arg_type, ...) SET|UNSET|RENAME ...
  alter_routine: $ => prec.left(seq(
    $.keyword_alter,
    choice($.keyword_procedure, $.keyword_function),
    optional($._if_exists),
    $.object_reference,
    $.function_arguments,
    $._snowflake_alter_actions,
  )),

  // --- CREATE DATA METRIC FUNCTION ---
  // CREATE [OR REPLACE] DATA METRIC FUNCTION [IF NOT EXISTS] name(ARG_T TABLE(col type, ...))
  // RETURNS NUMBER [COMMENT = 'text'] AS $$ body $$
  create_data_metric_function: $ => prec.left(seq(
    $.keyword_create,
    optional($._or_replace),
    $.keyword_data,
    $.keyword_metric,
    $.keyword_function,
    optional($._if_not_exists),
    $.object_reference,
    '(',
    field('arg_name', $.identifier),
    $.keyword_table,
    $.column_definitions,
    ')',
    $.keyword_returns,
    $._type,
    optional(seq($.keyword_comment, '=', alias($._literal_string, $.literal))),
    $.keyword_as,
    choice(
      seq(
        alias($._dollar_quoted_string_start_tag, $.dollar_quote),
        $.statement,
        optional(';'),
        alias($._dollar_quoted_string_end_tag, $.dollar_quote),
      ),
      // AS 'SELECT ...' (single-quoted body)
      alias($._single_quote_string, $.literal),
    ),
  )),

  // --- Snowflake COPY INTO ---
  snowflake_copy_into: $ => prec.left(seq(
    $.keyword_copy, $.keyword_into,
    choice($.object_reference, $.stage_reference),
    // COPY INTO table (col1, col2, ...) FROM ...
    optional(alias($._column_list, $.list)),
    $.keyword_from,
    choice(
      $.object_reference,
      $.stage_reference,
      seq('(', $._select_statement, ')'),
    ),
    optional($._snowflake_options),
  )),

  // --- DESCRIBE statement ---
  // DESCRIBE [object_type] object_name
  // Hidden rule using keyword references to avoid regex/keyword token conflict.
  // (A regex token matching TABLE would lose to keyword_table, breaking parsing.)
  _describe_object_type: $ => choice(
    $.keyword_table, $.keyword_view, $.keyword_schema, $.keyword_database,
    $.keyword_stage, $.keyword_pipe, $.keyword_stream, $.keyword_task,
    $.keyword_warehouse, $.keyword_function, $.keyword_procedure,
    $.keyword_integration,
  ),

  describe_statement: $ => seq(
    $.keyword_describe,
    optional($._describe_object_type),
    $.object_reference,
  ),

  // --- USE statement ---
  // USE DATABASE|SCHEMA|WAREHOUSE|ROLE name
  use_statement: $ => seq(
    $.keyword_use,
    choice(
      $.keyword_database,
      $.keyword_schema,
      $.keyword_warehouse,
      $.keyword_role,
    ),
    $.object_reference,
  ),

  // --- CALL statement ---
  // CALL procedure_name(args...)
  call_statement: $ => seq(
    $.keyword_call,
    $.invocation,
    // CALL proc(...) INTO :result_var
    optional(seq($.keyword_into, choice($.snowflake_variable_reference, $.identifier))),
  ),

  // --- EXECUTE TASK / EXECUTE IMMEDIATE ---
  execute_statement: $ => seq(
    $.keyword_execute,
    choice(
      seq($.keyword_task, $.object_reference),
      // Dollar-quoted scripting block: EXECUTE IMMEDIATE $$ BEGIN ... END $$
      // Higher precedence ensures this is preferred over the _expression fallback
      // which would consume $$...$$ as an opaque literal string
      prec(1, seq(
        $.keyword_immediate,
        alias($._dollar_quoted_string_start_tag, $.dollar_quote),
        $.snowflake_scripting_block,
        optional(';'),
        alias($._dollar_quoted_string_end_tag, $.dollar_quote),
      )),
      // Fallback: EXECUTE IMMEDIATE 'string' or EXECUTE IMMEDIATE :var or EXECUTE IMMEDIATE expr
      seq($.keyword_immediate, $._expression, optional(seq($.keyword_using, $.list))),
    ),
  ),

  // --- UNDROP ---
  // UNDROP TABLE|SCHEMA|DATABASE name
  undrop_statement: $ => seq(
    $.keyword_undrop,
    choice(
      $.keyword_table,
      $.keyword_schema,
      $.keyword_database,
    ),
    $.object_reference,
  ),

  // --- PUT / GET ---
  // PUT file_path @stage [options]
  put_statement: $ => prec.left(seq(
    $.keyword_put,
    $.literal,
    choice($.stage_reference, $._tsql_parameter),
    optional($._snowflake_options),
  )),

  // GET @stage file_path [options]
  get_statement: $ => prec.left(seq(
    $.keyword_get,
    choice($.stage_reference, $._tsql_parameter),
    $.literal,
    optional($._snowflake_options),
  )),

  // LIST @stage[/path] [PATTERN = 'regex']
  list_statement: $ => prec.left(seq(
    $.keyword_list,
    $.stage_reference,
    optional(seq($.keyword_pattern, '=', $.literal)),
  )),

  // --- GRANT / REVOKE ---
  grant_statement: $ => prec.left(seq(
    $.keyword_grant, $._grant_privileges,
    $.keyword_on,
    optional($._grant_object_type),
    $.object_reference,
    optional($.function_arguments),
    $.keyword_to, $._grant_grantee,
    optional(seq(
      $.keyword_with,
      $.keyword_grant,
      $.keyword_option,
    )),
  )),

  revoke_statement: $ => prec.left(seq(
    $.keyword_revoke, $._grant_privileges,
    $.keyword_on,
    optional($._grant_object_type),
    $.object_reference,
    optional($.function_arguments),
    $.keyword_from, $._grant_grantee,
    optional($.keyword_restrict),
    optional($.keyword_cascade),
  )),

  _grant_privileges: $ => choice(
    seq($.keyword_all, optional($.keyword_privileges)),
    comma_list($.identifier, true),
  ),

  // Grant object type — use existing keywords instead of regex to avoid token conflicts
  _grant_object_type: $ => choice(
    $.keyword_table,
    $.keyword_view,
    $.keyword_schema,
    $.keyword_database,
    $.keyword_role,
    $.keyword_warehouse,
    $.keyword_stage,
    $.keyword_integration,
    $.keyword_procedure,
    $.keyword_function,
  ),

  _grant_grantee: $ => choice(
    seq($.keyword_database, $.keyword_role, $.identifier),
    seq($.keyword_role, $.identifier),
    seq($.keyword_user, $.identifier),
    $.identifier,
  ),

  // --- SHOW extensions for Snowflake ---
  // snowflake_show_target is used directly in _show_statement (index.js) to
  // share the SHOW keyword prefix and avoid parse table explosion.

  // Single token matching all SHOW-able Snowflake plural object types
  // Added: ALERTS, TAGS, SHARES, INTEGRATIONS, TABLES
  snowflake_show_target: _ => /[dD][yY][nN][aA][mM][iI][cC]\s+[tT][aA][bB][lL][eE][sS]|[pP][rR][oO][cC][eE][dD][uU][rR][eE][sS]|[fF][uU][nN][cC][tT][iI][oO][nN][sS]|[tT][aA][bB][lL][eE][sS]|[sS][tT][aA][gG][eE][sS]|[pP][iI][pP][eE][sS]|[sS][tT][rR][eE][aA][mM][sS]|[tT][aA][sS][kK][sS]|[wW][aA][rR][eE][hH][oO][uU][sS][eE][sS]|[dD][aA][tT][aA][bB][aA][sS][eE][sS]|[sS][cC][hH][eE][mM][aA][sS]|[vV][iI][eE][wW][sS]|[rR][oO][lL][eE][sS]|[uU][sS][eE][rR][sS]|[gG][rR][aA][nN][tT][sS]|[aA][lL][eE][rR][tT][sS]|[tT][aA][gG][sS]|[sS][hH][aA][rR][eE][sS]|[iI][nN][tT][eE][gG][rR][aA][tT][iI][oO][nN][sS]/,

  // Snowflake SHOW with LIKE and/or IN — placed in snowflake_statement to avoid
  // state explosion from optional_parenthesis wrapping in _dml_read.
  // At least one of LIKE or IN is required to disambiguate from bare
  // SHOW <target> which is handled by _show_statement in _dml_read.
  snowflake_show_statement: $ => prec.left(seq(
    $.keyword_show,
    optional($.keyword_terse),
    $.snowflake_show_target,
    optional(seq($.keyword_root, $.keyword_only)),
    choice(
      // LIKE 'pattern' [IN ...]
      seq(
        $.keyword_like, $.literal,
        optional(seq(
          $.keyword_in,
          optional(choice($.keyword_database, $.keyword_schema, $.keyword_account)),
          optional($.object_reference),
        )),
      ),
      // IN [scope] [name]
      seq(
        $.keyword_in,
        optional(choice($.keyword_database, $.keyword_schema, $.keyword_account)),
        optional($.object_reference),
      ),
    ),
    optional(seq($.keyword_root, $.keyword_only)),
  )),

  // Account keyword for SHOW ... IN ACCOUNT
  keyword_account: _ => /[aA][cC][cC][oO][uU][nN][tT]/,

  // EXECUTE keyword for EXECUTE TASK / EXECUTE IMMEDIATE
  keyword_execute: _ => /[eE][xX][eE][cC][uU][tT][eE]/,
};
