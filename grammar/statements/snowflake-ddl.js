import { comma_list, paren_list, wrapped_in_parenthesis } from "../helpers.js";
import { OBJECT_TYPES, SHOW_TARGETS, SCOPE_TYPES, words_regex } from "../object-types.js";

// Which object types have a dedicated token/rule for each verb (they are excluded from the generic token)
const without = (list, drop) => list.filter(t => !drop.includes(t));
const DEDICATED_CREATE = ["FILE FORMAT", "STAGE", "WAREHOUSE", "PIPE", "STREAM", "TASK", "SEQUENCE", "MATERIALIZED VIEW",
  "DYNAMIC TABLE", "DYNAMIC ICEBERG TABLE", "ICEBERG TABLE", "HYBRID TABLE", "DATA METRIC FUNCTION", "MASKING POLICY",
  "ROW ACCESS POLICY", "DATABASE ROLE"];
const NAMED_ALTER = ["WAREHOUSE", "STAGE", "PIPE", "STREAM", "TASK", "DYNAMIC TABLE", "DYNAMIC ICEBERG TABLE", "SEQUENCE",
  "MATERIALIZED VIEW"];
const NAMED_DROP = ["STAGE", "FILE FORMAT", "PIPE", "STREAM", "TASK", "WAREHOUSE", "SEQUENCE", "MATERIALIZED VIEW",
  "DYNAMIC TABLE", "DYNAMIC ICEBERG TABLE"];
const KEYWORD_DESCRIBE = ["STAGE", "PIPE", "STREAM", "TASK", "WAREHOUSE", "DATA METRIC FUNCTION"];


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
  // A single key=value property (used in CREATE/ALTER options)
  _snowflake_property: $ => seq(
    field('name', choice($.identifier, $.keyword_comment)),
    '=',
    field('value', $._property_value),
  ),

  _property_value: $ => choice(
    alias($._plain_literal, $.literal),
    $.identifier,
    alias($._dotted_reference, $.object_reference),
    $.stage_reference,
    $.snowflake_variable_reference,
    // nested properties: REST_CONFIG = (CATALOG_URI = '..' ..)
    seq('(', $._snowflake_options, ')'),
    // value lists: NULL_IF = ('NULL', 'null'), NOTIFY_USERS = (a, "b c"), ()
    alias($._property_list, $.list),
  ),

  _property_list: $ => paren_list($._property_value),

  _dotted_reference: $ => seq($.identifier, '.', $.identifier, optional(seq('.', $.identifier))),

  // literal without the TYPE 'string' casting form (so adjacent values stay unambiguous)
  _plain_literal: $ => choice(
    $._integer,
    $._decimal_number,
    $._literal_string,
    $.keyword_true,
    $.keyword_false,
    $.keyword_null,
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
    optional(choice($._or_replace, $._or_alter)),
    $.keyword_stream,
    optional($._if_not_exists),
    $.object_reference,
    optional(seq($.keyword_copy, $.keyword_grants)),
    optional(seq(
      $.keyword_on,
      choice(
        seq(optional($.keyword_event), $.keyword_table),
        $.keyword_view,
        $.keyword_stage,
        seq($.keyword_dynamic, $.keyword_table),
        seq($.keyword_external, $.keyword_table),
      ),
      $.object_reference,
      optional($.at_before),
    )),
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
    optional(choice($._or_replace, $._or_alter)),
    optional($.keyword_transient),
    $.keyword_dynamic,
    optional($.keyword_iceberg),
    $.keyword_table,
    optional($._if_not_exists),
    $.object_reference,
    optional(choice($.column_definitions, $.view_columns)),
    repeat(seq(optional(','), $._dynamic_table_setting)),
    choice(
      seq($.keyword_as, $._select_statement),
      $.clone_clause,
    ),
  )),

  _dynamic_table_setting: $ => choice(
    $._snowflake_property,
    $.cluster_by,
    $.copy_clause,
    $.with_tag_clause,
    $.policy_clause,
    $.contact_clause,
    seq($.keyword_require, $.keyword_user),
    // FROZEN WHERE (predicate)
    seq($.keyword_frozen, $.keyword_where, wrapped_in_parenthesis($._expression)),
  ),

  // --- DROP rules for Snowflake objects ---
  // Consolidated drop for STAGE, FILE FORMAT, PIPE, STREAM, TASK, WAREHOUSE
  // Uses regex token to avoid 6 separate rules in _drop_statement
  snowflake_drop_object_type: _ => /[dD][yY][nN][aA][mM][iI][cC]\s+([iI][cC][eE][bB][eE][rR][gG]\s+)?[tT][aA][bB][lL][eE]|[sS][tT][aA][gG][eE]|[fF][iI][lL][eE][\s_]+[fF][oO][rR][mM][aA][tT]|[pP][iI][pP][eE]|[sS][tT][rR][eE][aA][mM]|[tT][aA][sS][kK]|[wW][aA][rR][eE][hH][oO][uU][sS][eE]|[sS][eE][qQ][uU][eE][nN][cC][eE]|[mM][aA][tT][eE][rR][iI][aA][lL][iI][zZ][eE][dD]\s+[vV][iI][eE][wW]/,

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
    seq($.keyword_set, $.tag_assignments),
    seq($.keyword_unset, $.tag_names),
    seq($.keyword_unset, comma_list($.identifier, true)),
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
    $.generic_action,
  ),

  // SET TAG a = 'x', b.c = 'y'
  tag_assignments: $ => seq(
    $.keyword_tag,
    comma_list($.tag_assignment, true),
  ),

  tag_assignment: $ => seq(
    field('name', $.object_reference),
    '=',
    field('value', $.literal),
  ),

  // UNSET TAG a, b.c
  tag_names: $ => seq(
    $.keyword_tag,
    comma_list($.object_reference, true),
  ),

  // name = v1, v2, v3  (unparenthesized value list, e.g. ADD ACCOUNTS = a, b)
  _action_property: $ => seq(
    field('name', $.identifier),
    '=',
    field('value', $._property_value),
    repeat(seq(',', field('value', $._property_value))),
  ),

  // ADD / DROP / MODIFY / REMOVE <words and properties>, used by the long tail of ALTER forms
  generic_action: $ => prec.left(seq(
    choice($.keyword_add, $.keyword_drop, $.keyword_modify, $.keyword_remove),
    repeat1(choice($._action_property, $._property_value)),
  )),

  // Consolidated alter for WAREHOUSE, STAGE, PIPE, STREAM, TASK, DYNAMIC [ICEBERG] TABLE,
  // SEQUENCE, MATERIALIZED VIEW
  // Uses regex token to avoid 5 separate rules in _alter_statement
  snowflake_alter_object_type: _ => /[wW][aA][rR][eE][hH][oO][uU][sS][eE]|[sS][tT][aA][gG][eE]|[pP][iI][pP][eE]|[sS][tT][rR][eE][aA][mM]|[tT][aA][sS][kK]|[dD][yY][nN][aA][mM][iI][cC]\s+([iI][cC][eE][bB][eE][rR][gG]\s+)?[tT][aA][bB][lL][eE]|[sS][eE][qQ][uU][eE][nN][cC][eE]|[mM][aA][tT][eE][rR][iI][aA][lL][iI][zZ][eE][dD]\s+[vV][iI][eE][wW]/,

  alter_snowflake_named_object: $ => prec.left(seq(
    $.keyword_alter,
    $.snowflake_alter_object_type,
    optional($._if_exists),
    $.object_reference,
    $._snowflake_alter_actions,
  )),

  // --- Generic Snowflake object types (ALERT, TAG, SHARE, etc.) ---
  // Uses a single regex token for the object type keyword to avoid state explosion
  // Matches: ALERT, TAG, SHARE, EXTERNAL TABLE, EVENT TABLE, NETWORK POLICY, RESOURCE MONITOR, INTEGRATION
  snowflake_object_type: _ => words_regex(without(OBJECT_TYPES, DEDICATED_CREATE), true),

  // object-type tokens for the other verbs; presented as snowflake_object_type nodes
  _alter_object_type: _ => words_regex(without(OBJECT_TYPES, [...NAMED_ALTER, "ICEBERG TABLE", "HYBRID TABLE"]), true),
  _drop_object_type: _ => words_regex(without(OBJECT_TYPES, NAMED_DROP), true),
  _describe_object_type_token: _ => token(prec(1, words_regex(without(OBJECT_TYPES, KEYWORD_DESCRIBE), true))),

  create_snowflake_object: $ => prec.left(seq(
    $.keyword_create,
    optional(choice($._or_replace, $._or_alter)),
    $.snowflake_object_type,
    optional($._if_not_exists),
    $.object_reference,
    // class instances: CREATE SNOWFLAKE.CORE.BUDGET b(args)
    optional($.class_instance_arguments),
    optional($.keyword_with),
    optional($._snowflake_options),
    optional(choice($.alert_condition, $._generic_tail)),
  )),

  class_instance_arguments: $ => paren_list(choice($.named_parameter, $._expression)),

  // FROM <source> | AS <body> after the property list of a generic object
  _generic_tail: $ => choice(
    seq($.keyword_from, choice($.object_reference, $.stage_reference, $.literal)),
    seq($.keyword_as, choice($.statement, $.snowflake_scripting_block, $.literal)),
  ),

  // CREATE ALERT ... IF (EXISTS (<query>)) THEN <action>
  alert_condition: $ => seq(
    $.keyword_if,
    '(',
    $.exists,
    ')',
    $.keyword_then,
    choice($.snowflake_scripting_block, $.statement),
  ),

  drop_snowflake_object: $ => seq(
    $.keyword_drop,
    alias($._drop_object_type, $.snowflake_object_type),
    optional($._if_exists),
    $.object_reference,
    optional($._drop_behavior),
  ),

  alter_snowflake_object: $ => prec.left(seq(
    $.keyword_alter,
    alias($._alter_object_type, $.snowflake_object_type),
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
    $.keyword_user, $.keyword_role,
    alias($._describe_object_type_token, $.snowflake_object_type),
  ),

  describe_statement: $ => prec.left(seq(
    $.keyword_describe,
    optional($._describe_object_type),
    $.object_reference,
    optional($.function_arguments),
    optional($._snowflake_options),
  )),

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
      // Dollar-quoted single statement: EXECUTE IMMEDIATE $$ CREATE ALERT ... $$
      prec(1, seq(
        $.keyword_immediate,
        alias($._dollar_quoted_string_start_tag, $.dollar_quote),
        $.statement,
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
      alias($._drop_object_type, $.snowflake_object_type),
    ),
    $.object_reference,
  ),

  // --- PUT / GET ---
  // PUT file_path @stage [options]
  put_statement: $ => prec.left(seq(
    $.keyword_put,
    $.literal,
    $.stage_reference,
    optional($._snowflake_options),
  )),

  // GET @stage file_path [options]
  get_statement: $ => prec.left(seq(
    $.keyword_get,
    $.stage_reference,
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
  // Privilege grants (incl. OWNERSHIP and CALLER), role grants (ROLE / DATABASE ROLE / APPLICATION ROLE /
  // SERVICE ROLE) and the CURRENT GRANTS / GRANT OPTION modifiers.
  grant_statement: $ => prec.left(seq(
    $.keyword_grant,
    choice(
      seq($._grant_privileges, $.keyword_on, $._grant_target),
      $._grant_role,
    ),
    $.keyword_to, $._grant_grantee,
    optional(seq(
      $.keyword_with,
      $.keyword_grant,
      $.keyword_option,
    )),
    optional($._current_grants),
  )),

  revoke_statement: $ => prec.left(seq(
    $.keyword_revoke,
    optional(seq($.keyword_grant, $.keyword_option, $.keyword_for)),
    choice(
      seq($._grant_privileges, $.keyword_on, $._grant_target),
      $._grant_role,
    ),
    $.keyword_from, $._grant_grantee,
    optional($.keyword_restrict),
    optional($.keyword_cascade),
  )),

  // [DATABASE | APPLICATION | SERVICE] ROLE name
  _grant_role: $ => seq(
    optional(choice($.keyword_database, $.keyword_application, $.keyword_service)),
    $.keyword_role,
    $._grant_name,
  ),

  // COPY CURRENT GRANTS | REVOKE CURRENT GRANTS
  _current_grants: $ => seq(choice($.keyword_copy, $.keyword_revoke), $.keyword_current, $.keyword_grants),

  // a role/user/share name: plain identifier, dotted (db.role) or service role (svc!role)
  _grant_name: $ => choice(
    $.identifier,
    alias($._dotted_reference, $.object_reference),
    alias(seq($.identifier, '!', $.identifier), $.object_reference),
  ),

  // GRANT/REVOKE target: [type] name[(arg types)] | ACCOUNT | { ALL | FUTURE } <objects> IN { SCHEMA | DATABASE | ACCOUNT } [name]
  _grant_target: $ => choice(
    seq(
      optional($._grant_object_type),
      $.object_reference,
      optional($.function_arguments),
    ),
    $.keyword_account,
    seq(
      choice($.keyword_all, $.keyword_future),
      alias($.snowflake_show_target, $.snowflake_object_type),
      $.keyword_in,
      choice($.keyword_schema, $.keyword_database, $.keyword_account),
      optional($.object_reference),
    ),
  ),

  // [INHERITED] CALLER and multi-word privileges (CREATE MATERIALIZED VIEW, APPLY MASKING POLICY, ...)
  _grant_privileges: $ => choice(
    seq($.keyword_all, optional(seq(optional($.keyword_inherited), $.keyword_caller)), optional($.keyword_privileges)),
    seq(
      optional(seq(optional($.keyword_inherited), $.keyword_caller)),
      comma_list($.privilege, true),
    ),
  ),

  // one privilege: its words (CREATE MATERIALIZED VIEW) and, for class instances, a dotted class name
  privilege: $ => repeat1(choice($.identifier, alias($._dotted_reference, $.object_reference))),

  // Grant object type: existing keywords, plus the generic type vocabulary for everything else
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
    $.keyword_task,
    $.keyword_stream,
    $.keyword_pipe,
    $.keyword_sequence,
    seq($.keyword_dynamic, $.keyword_table),
    alias($._grant_type_token, $.snowflake_object_type),
  ),

  _grant_type_token: _ => token(prec(1, words_regex(
    without(OBJECT_TYPES, ["STAGE", "WAREHOUSE", "PIPE", "STREAM", "TASK", "SEQUENCE", "DYNAMIC TABLE", "INTEGRATION", "SCHEMA", "DATABASE", "FILE FORMAT", "ACCOUNT"])
      .concat(["DATA EXCHANGE LISTING", "WORKSPACE", "USER", "FILE FORMAT", "ORGANIZATION LISTING"]),
  ))),

  _grant_grantee: $ => choice(
    seq($.keyword_database, $.keyword_role, $._grant_name),
    seq($.keyword_application, $.keyword_role, $._grant_name),
    seq($.keyword_application, $._grant_name),
    seq($.keyword_role, $._grant_name),
    seq($.keyword_user, $._grant_name),
    seq($.keyword_share, $._grant_name),
    $.identifier,
  ),

  // --- SHOW extensions for Snowflake ---
  // snowflake_show_target is used directly in _show_statement (index.js) to
  // share the SHOW keyword prefix and avoid parse table explosion.

  // Single token matching all SHOW-able Snowflake plural object types
  // Added: ALERTS, TAGS, SHARES, INTEGRATIONS, TABLES
  snowflake_show_target: _ => words_regex(SHOW_TARGETS, true),

  snowflake_scope_type: _ => words_regex(SCOPE_TYPES),

  // Snowflake SHOW with LIKE and/or IN — placed in snowflake_statement to avoid
  // state explosion from optional_parenthesis wrapping in _dml_read.
  // At least one of LIKE or IN is required to disambiguate from bare
  // SHOW <target> which is handled by _show_statement in _dml_read.
  snowflake_show_statement: $ => prec.left(seq(
    $.keyword_show,
    optional($.keyword_terse),
    $.snowflake_show_target,
    optional(seq($.keyword_root, $.keyword_only)),
    optional($.keyword_instances),
    repeat1($._show_clause),
    optional(seq($.keyword_root, $.keyword_only)),
  )),

  _show_clause: $ => choice(
    // LIKE 'pattern'
    seq($.keyword_like, choice($.literal, $.snowflake_variable_reference)),
    // IN [scope] [name]
    seq(
      $.keyword_in,
      optional($._show_scope_type),
      optional($.object_reference),
    ),
    // STARTS WITH 'prefix'
    seq($.keyword_starts, $.keyword_with, $.literal),
    // LIMIT n [FROM 'name']
    seq($.keyword_limit, $.literal, optional(seq($.keyword_from, $.literal))),
    // ON | TO | OF | FOR | BY [type] name[(arg types)]   (SHOW GRANTS ON TABLE t, SHOW GRANTS TO ROLE r, ...)
    seq(
      choice($.keyword_on, $.keyword_to, $.keyword_of, $.keyword_for, $.keyword_by),
      optional(choice($._grant_object_type, $.snowflake_scope_type)),
      $.object_reference,
      optional($.function_arguments),
    ),
  ),

  _show_scope_type: $ => choice(
    $.keyword_database,
    $.keyword_schema,
    $.keyword_account,
    $.keyword_table,
    $.keyword_view,
    $.keyword_session,
    $.snowflake_scope_type,
  ),

  // Account keyword for SHOW ... IN ACCOUNT
  keyword_account: _ => /[aA][cC][cC][oO][uU][nN][tT]/,

  // EXECUTE keyword for EXECUTE TASK / EXECUTE IMMEDIATE
  keyword_execute: _ => /[eE][xX][eE][cC][uU][tT][eE]/,
};
