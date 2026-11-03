import { optional_parenthesis, wrapped_in_parenthesis } from "../helpers.js";

import create_rules from "./create.js";
import alter_rules from "./alter.js";
import drop_rules from "./drop.js";
import rename_rules from "./rename.js";
import optimize_rules from "./optimize.js";
import merge_rules from "./merge.js";
import comment_rules from "./comment.js";
import delete_rules from "./delete.js";
import insert_rules from "./insert.js";
import update_rules from "./update.js";
import truncate_rules from "./truncate.js";
import copy_rules from "./copy.js";
import select_rules from "./select.js";
import set_rules from "./set.js";
import refresh_rules from "./refresh.js";
import snowflake_ddl_rules from "./snowflake-ddl.js";
import snowflake_scripting_rules from "./snowflake-scripting.js";

export default {

  // Top-level block — now delegates to the full Snowflake scripting block
  block: $ => $.snowflake_scripting_block,

  statement: $ => seq(
    optional(seq(
      $.keyword_explain,
      optional($.keyword_analyze),
      optional($.keyword_verbose),
    )),
    choice(
      $._ddl_statement,
      $._dml_write,
      optional_parenthesis($._dml_read),
    ),
  ),

  _ddl_statement: $ => choice(
    $._create_statement,
    $._alter_statement,
    $._drop_statement,
    // $._rename_statement, // removed: MySQL-specific, frees parse table budget
    // $._optimize_statement, // removed: Hive/Impala/Athena/MariaDB, frees parse table budget
    $._merge_statement,
    // $._refresh_statement, // removed: Postgres-specific, frees parse table budget
    $.comment_statement,
    $.set_statement,
    // $.reset_statement, // removed: Postgres-specific, frees parse table budget
    // Snowflake DDL
    $.grant_statement,
    $.revoke_statement,
    $.snowflake_statement,
  ),

  ...create_rules,
  ...alter_rules,
  ...drop_rules,
  ...rename_rules,
  ...optimize_rules,
  ...merge_rules,
  ...refresh_rules,
  ...comment_rules,

  _dml_write: $ => seq(
    seq(
      optional(
        $._cte,
      ),
      choice(
        $._delete_statement,
        $._insert_statement,
        $.multi_table_insert,
        $._update_statement,
        $._truncate_statement,
        // $._copy_statement, // removed: Postgres-specific COPY FROM, Snowflake uses snowflake_copy_into
        // Snowflake
        $.snowflake_copy_into,
      ),
    ),
  ),

  ...delete_rules,
  ...insert_rules,
  ...update_rules,
  ...truncate_rules,
  ...copy_rules,

  _dml_read: $ => seq(
    optional(optional_parenthesis($._cte)),
    choice(
      $._dml_read_body,
      seq('(', $._dml_read_body, ')'),
    ),
  ),

  _dml_read_body: $ => choice(
    $._select_statement,
    $.set_operation,
    $._show_statement,
    prec(-1, $.snowflake_show_statement),
    // $._unload_statement, // removed: Athena-specific, frees parse table budget
  ),

  ...select_rules,
  ...set_rules,

  _show_statement: $ => seq(
    $.keyword_show,
    // $._show_create removed: MySQL/Postgres-specific SHOW CREATE, frees parse table budget
    // $.keyword_all removed: Postgres-specific, frees parse table budget
    optional($.keyword_terse),
    $.snowflake_show_target,
    optional(seq($.keyword_root, $.keyword_only)),
  ),

  _show_create: $ => seq(
    $.keyword_create,
    choice(
      $.keyword_schema,
      $.keyword_table,
      $.keyword_view,
      $.keyword_procedure,
      $.keyword_function
    ),
    $.object_reference
  ),

  _show_tables: $ => seq(
    $.keyword_tables,
    optional(seq($.keyword_from, $._qualified_field)),
    optional(seq($.keyword_like, $._expression))
  ),

  // athena
  _unload_statement: $ => seq(
    $.keyword_unload,
    wrapped_in_parenthesis($._select_statement),
    $.keyword_to,
    $._single_quote_string,
    $.storage_parameters,
  ),

  ...snowflake_ddl_rules,
  ...snowflake_scripting_rules,

};
