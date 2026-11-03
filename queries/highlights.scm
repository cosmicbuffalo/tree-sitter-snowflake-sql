; Identifiers and references

(object_reference
  name: (identifier) @type)

(invocation
  (object_reference
    name: (identifier) @function.call))

[
  (keyword_hash)
  (keyword_array)
  (keyword_object_id)
] @function.call

(relation
  alias: (identifier) @variable)

(field
  name: (identifier) @variable.member)

(term
  alias: (identifier) @variable)

((term
   value: (cast
    name: (keyword_cast) @function.call
    parameter: [(literal)]?)))

; Snowflake: TRY_CAST as function
((term
   value: (try_cast
    name: (keyword_try_cast) @function.call
    parameter: [(literal)]?)))

; Literals

(literal) @string
(comment) @comment @spell
(marginalia) @comment

((literal) @number
   (#match? @number "^[-+]?\\d+$"))

((literal) @number.float
  (#match? @number.float "^[-+]?\\d*\\.\\d*$"))

(parameter) @variable.parameter

[
 (keyword_true)
 (keyword_false)
] @boolean

; Snowflake: stage references (@~, @%table, @stage/path)
(stage_reference) @string.special

; Snowflake: variant path access (col:key, col:key.nested)
(variant_access) @variable.member

; Snowflake: named parameters (param => value)
(named_parameter
  name: (identifier) @variable.parameter)

; Attributes

[
 (keyword_asc)
 (keyword_desc)
 (keyword_terminated)
 (keyword_escaped)
 (keyword_unsigned)
 (keyword_nulls)
 (keyword_last)
 (keyword_delimited)
 (keyword_replication)
 (keyword_auto_increment)
 (keyword_default)
 (keyword_collate)
 (keyword_engine)
 (keyword_always)
 (keyword_generated)
 (keyword_preceding)
 (keyword_following)
 (keyword_first)
  (keyword_current_timestamp)
  (keyword_current_date)
 (keyword_immutable)
 (keyword_atomic)
 (keyword_strict)
] @attribute

; Modifiers (storage class → keyword.modifier)

[
 (keyword_materialized)
 (keyword_recursive)
 (keyword_temp)
 (keyword_temporary)
 (keyword_unlogged)
 (keyword_external)
 (keyword_parquet)
 (keyword_csv)
 (keyword_rcfile)
 (keyword_textfile)
 (keyword_orc)
 (keyword_avro)
 (keyword_jsonfile)
 (keyword_sequencefile)
 (keyword_volatile)
 (keyword_dynamic)
] @keyword.modifier

; Snowflake scripting: variable references (:var)
(snowflake_variable_reference) @variable

; Conditionals (conditional → keyword.conditional)

[
 (keyword_case)
 (keyword_when)
 (keyword_then)
 (keyword_else)
 (keyword_elseif)
] @keyword.conditional

; Loops (repeat → keyword.repeat)

[
 (keyword_loop)
 (keyword_repeat)
] @keyword.repeat

; Keywords

[
  (keyword_select)
  (keyword_from)
  (keyword_where)
  (keyword_index)
  (keyword_join)
  (keyword_primary)
  (keyword_delete)
  (keyword_create)
  (keyword_show)

  (keyword_insert)
  (keyword_merge)
  (keyword_distinct)
  (keyword_replace)
  (keyword_update)
  (keyword_into)
  (keyword_overwrite)
  (keyword_matched)
  (keyword_values)
  (keyword_set)
  (keyword_left)
  (keyword_right)
  (keyword_outer)
  (keyword_inner)
  (keyword_full)
  (keyword_order)
  (keyword_partition)
  (keyword_group)
  (keyword_with)
  (keyword_without)
  (keyword_as)
  (keyword_having)
  (keyword_limit)
  (keyword_offset)
  (keyword_table)
  (keyword_key)
  (keyword_references)
  (keyword_foreign)
  (keyword_constraint)
  (keyword_force)
  (keyword_use)
  (keyword_for)
  (keyword_if)
  (keyword_exists)
  (keyword_column)
  (keyword_cross)
  (keyword_lateral)
  (keyword_natural)
  (keyword_alter)
  (keyword_drop)
  (keyword_add)
  (keyword_view)
  (keyword_end)
  (keyword_is)
  (keyword_using)
  (keyword_between)
  (keyword_window)
  (keyword_no)
  (keyword_data)
  (keyword_type)
  (keyword_rename)
  (keyword_to)
  (keyword_schema)
  (keyword_owner)
  (keyword_authorization)
  (keyword_all)
  (keyword_any)
  (keyword_some)
  (keyword_returning)
  (keyword_begin)
  (keyword_commit)
  (keyword_rollback)
  (keyword_transaction)
  (keyword_only)
  (keyword_like)
  (keyword_rlike)
  (keyword_similar)
  (keyword_over)
  (keyword_change)
  (keyword_modify)
  (keyword_after)
  (keyword_range)
  (keyword_rows)
  (keyword_groups)
  (keyword_exclude)
  (keyword_current)
  (keyword_ties)
  (keyword_others)
  (keyword_zerofill)
  (keyword_format)
  (keyword_fields)
  (keyword_row)
  (keyword_sort)
  (keyword_comment)
  (keyword_location)
  (keyword_cached)
  (keyword_uncached)
  (keyword_lines)
  (keyword_stored)
  (keyword_virtual)
  (keyword_partitioned)
  (keyword_analyze)
  (keyword_explain)
  (keyword_verbose)
  (keyword_truncate)

  (keyword_language)
  (keyword_clone)
  (keyword_hybrid)
  (keyword_list)
  (keyword_pattern)
  (keyword_sample)
  (keyword_tablesample)
  (keyword_bernoulli)
  (keyword_seed)
  (keyword_search)
  (keyword_optimization)
  (keyword_clustering)
  (keyword_iceberg)
  (keyword_transient)
  (keyword_runtime_version)
  (keyword_handler)
  (keyword_imports)
  (keyword_packages)
  (keyword_target_path)
  (keyword_external_access_integrations)
  (keyword_secrets)
  (keyword_secure)
  (keyword_grants)
  (keyword_python)
  (keyword_java)
  (keyword_javascript)
  (keyword_scala)
  (keyword_called)
  (keyword_declare)
  (keyword_filter)
  (keyword_function)
  (keyword_input)
  (keyword_oid)
  (keyword_oids)
  (keyword_precision)
  (keyword_regclass)
  (keyword_regnamespace)
  (keyword_regproc)
  (keyword_regtype)
  (keyword_restricted)
  (keyword_return)
  (keyword_returns)
  (keyword_separator)
  (keyword_setof)
  (keyword_stable)
  (keyword_tblproperties)
  (keyword_trigger)
  (keyword_admin)
  (keyword_connection)
  (keyword_database)
  (keyword_encrypted)
  (keyword_none)
  (keyword_password)
  (keyword_reset)
  (keyword_role)
  (keyword_tablespace)
  (keyword_until)
  (keyword_user)
  (keyword_valid)
  (keyword_action)
  (keyword_definer)
  (keyword_invoker)
  (keyword_enable)
  (keyword_disable)
  (keyword_security)

  (keyword_out)
  (keyword_inout)
  (keyword_variadic)
  (keyword_ordinality)
  (keyword_session)
  (keyword_isolation)
  (keyword_level)
  (keyword_serializable)
  (keyword_repeatable)
  (keyword_read)
  (keyword_write)
  (keyword_committed)
  (keyword_uncommitted)
  (keyword_deferrable)
  (keyword_names)
  (keyword_zone)
  (keyword_immediate)
  (keyword_deferred)
  (keyword_constraints)
  (keyword_snapshot)
  (keyword_characteristics)
  (keyword_off)
  (keyword_procedure)
  (keyword_copy)
  (keyword_extended)
  (keyword_main)
  (keyword_plain)
  (keyword_storage)
  (keyword_compression)
  (keyword_while)

  (keyword_describe)
  (keyword_call)
  (keyword_undrop)
  (keyword_put)
  (keyword_get)
  (keyword_suspend)
  (keyword_resume)
  (keyword_within)
  (keyword_integration)
  (keyword_execute)
  (keyword_account)
  (keyword_qualify)
  (keyword_grant)
  (keyword_revoke)
  (keyword_privileges)
  (snowflake_object_type)
  (snowflake_show_target)
  (snowflake_alter_object_type)
  (snowflake_drop_object_type)
  (snowflake_create_object_type)

  ; Snowflake scripting keywords
  (keyword_let)
  (keyword_resultset)
  (keyword_cursor)
  (keyword_exception)
  (keyword_raise)
  (keyword_break)
  (keyword_continue)
  (keyword_iterate)
  (keyword_exit)
  (keyword_open)
  (keyword_fetch)
  (keyword_close)
  (keyword_async)
  (keyword_other)
  (keyword_reverse)
  (keyword_caller)
  (keyword_terse)
  (keyword_identifier)
  (keyword_unset)
  (keyword_root)
  (keyword_remove)
  (keyword_event)
] @keyword

; Qualifiers

[
 (keyword_restrict)
 (keyword_unbounded)
 (keyword_unique)
 (keyword_cascade)
 (keyword_check)
 (keyword_option)
 (keyword_local)
 (keyword_cascaded)
 (keyword_statistics)
] @type.qualifier

; Types

[
  (keyword_int)
  (keyword_null)
  (keyword_boolean)
  (keyword_binary)
  (keyword_varbinary)
  (keyword_image)
  (keyword_bit)
  (keyword_inet)
  (keyword_character)
  (keyword_smallserial)
  (keyword_serial)
  (keyword_bigserial)
  (keyword_smallint)
  (keyword_mediumint)
  (keyword_bigint)
  (keyword_tinyint)
  (keyword_decimal)
  (keyword_float)
  (keyword_double)
  (keyword_numeric)
  (keyword_real)
  (double)
  (keyword_money)
  (keyword_smallmoney)
  (keyword_char)
  (keyword_nchar)
  (keyword_varchar)
  (keyword_nvarchar)
  (keyword_varying)
  (keyword_text)
  (keyword_string)
  (keyword_uuid)
  (keyword_json)
  (keyword_jsonb)
  (keyword_xml)
  (keyword_bytea)
  (keyword_enum)
  (keyword_date)
  (keyword_datetime)
  (keyword_time)
  (keyword_datetime2)
  (keyword_datetimeoffset)
  (keyword_smalldatetime)
  (keyword_timestamp)
  (keyword_timestamptz)
  (keyword_geometry)
  (keyword_geography)
  (keyword_box2d)
  (keyword_box3d)
  (keyword_interval)
  (keyword_variant)
  (keyword_map)
  (keyword_object)
  (keyword_number)
  (keyword_vector)
  (keyword_timestamp_ltz)
  (keyword_timestamp_ntz)
  (keyword_timestamp_tz)
] @type.builtin

; Keyword operators

[
  (keyword_in)
  (keyword_and)
  (keyword_or)
  (keyword_not)
  (keyword_by)
  (keyword_on)
  (keyword_do)
  (keyword_union)
  (keyword_except)
  (keyword_intersect)
] @keyword.operator

; Operators

[
  "+"
  "-"
  "*"
  "/"
  "%"
  "^"
  ":="
  "="
  "<"
  "<="
  "!="
  ">="
  ">"
  "<>"
  (op_other)
  (op_unary_other)
] @operator

; Punctuation

[
  "("
  ")"
  "{"
  "}"
] @punctuation.bracket

[
  ";"
  ","
  "."
] @punctuation.delimiter
