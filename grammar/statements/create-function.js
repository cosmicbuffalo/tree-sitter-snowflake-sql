import { paren_list, wrapped_in_parenthesis } from "../helpers.js";

export default {

  // This is only used in create function statement, it is not needed to check
  // the start tag match the end one. The usage of this syntax in other
  // context is done by _dollar_string.
  dollar_quote: () => /\$[^\$]*\$/,

  create_function: $ => prec.left(seq(
    $.keyword_create,
    optional($._or_replace),
    optional($.keyword_secure),
    $.keyword_function,
    optional($._if_not_exists),
    $.object_reference,
    $.function_arguments,
    // Snowflake: COPY GRANTS
    optional(seq($.keyword_copy, $.keyword_grants)),
    $.keyword_returns,
    choice(
      $._type,
      seq($.keyword_setof, $._type),
      seq($.keyword_table, $.column_definitions),
      $.keyword_trigger,
    ),
    optional($._not_null),
    repeat($._function_option),
    choice(
      // SQL-style function: optional options, then the body.
      seq(
        // ensure that there's only one function body -- other specifiers are
        // less variable but the body can have all manner of conflicting stuff
        $.function_body,
        repeat($._function_option),
      ),
      // Snowflake handler languages (Python, Java, ...): properties such as
      // RUNTIME_VERSION / HANDLER / IMPORTS, and an optional opaque string body.
      seq(
        $.routine_language,
        repeat(choice($._function_option, $.routine_property)),
        optional(seq(
          $.routine_body,
          repeat(choice($._function_option, $.routine_property)),
        )),
      ),
    ),
  )),

  _function_option: $ => choice(
    $.function_language,
    $.function_volatility,
    $.function_leakproof,
    $.function_security,
    $.function_safety,
    $.function_strictness,
    $.function_cost,
    $.function_rows,
    $.function_support,
    $.procedure_comment,
  ),

  // LANGUAGE for handler-based routines whose body is source code in another
  // language (as opposed to SQL, whose body is parsed as SQL).
  routine_language: $ => seq(
    $.keyword_language,
    choice(
      $.keyword_python,
      $.keyword_java,
      $.keyword_javascript,
      $.keyword_scala,
    ),
  ),

  // NAME = value properties of handler-based routines.
  routine_property: $ => seq(
    field('name', choice(
      $.keyword_runtime_version,
      $.keyword_handler,
      $.keyword_imports,
      $.keyword_packages,
      $.keyword_target_path,
      $.keyword_external_access_integrations,
      $.keyword_secrets,
    )),
    '=',
    field('value', choice(
      $.literal,
      $.routine_property_list,
    )),
  ),

  routine_property_list: $ => paren_list(
    choice(
      alias($._literal_string, $.literal),
      $.routine_secret,
      $.identifier,
    ),
    true,
  ),

  // SECRETS = ('name' = secret_object)
  routine_secret: $ => seq(
    alias($._literal_string, $.literal),
    '=',
    $.object_reference,
  ),

  // Source code body of a handler-based routine: AS '<code>' or AS $$<code>$$
  routine_body: $ => seq(
    $.keyword_as,
    alias($._literal_string, $.literal),
  ),

  _argmode: $ => choice(
    $.keyword_in,
    $.keyword_out,
    $.keyword_inout,
    $.keyword_variadic,
    seq($.keyword_in, $.keyword_out),
  ),

  function_argument: $ => seq(
    optional($._argmode),
    optional($.identifier),
    $._type,
    optional(
      seq(
        choice($.keyword_default, '='),
        $.literal,
      ),
    ),
  ),

    function_arguments: $ => paren_list(
      $.function_argument,
      false,
    ),

  _function_return: $ => seq(
    $.keyword_return,
    $._expression,
  ),

  function_declaration: $ => seq(
    $.identifier,
    $._type,
    optional(
      seq(
        ':=',
        choice(
          wrapped_in_parenthesis($.statement),
          // TODO are there more possibilities here? We can't use `_expression` since
          // that includes subqueries
          $.literal,
        ),
      ),
    ),
    ';',
  ),

  _function_body_statement: $ => choice(
    $.statement,
    $._function_return,
  ),

  _tsql_function_body_statement: $ => seq(
    optional($.keyword_as),
    $.keyword_begin,
    optional($.var_declarations),
    choice(
      repeat($.statement),
      repeat1(seq(
        $.keyword_begin,
        repeat($.statement),
        $.keyword_end,
      )),
    ),
    $._function_return,
    $.keyword_end,
  ),

  function_body: $ => choice(
    seq(
      $._function_return,
      ';'
    ),
    seq(
      $.keyword_begin,
      $.keyword_atomic,
      repeat1(
        seq(
          $._function_body_statement,
          ';',
        ),
      ),
      $.keyword_end,
    ),
    seq(
      $.keyword_as,
      alias($._dollar_quoted_string_start_tag, $.dollar_quote),
      optional(
        seq(
          $.keyword_declare,
          repeat1(
            $.function_declaration,
          ),
        ),
      ),
      $.keyword_begin,
      repeat1(
        seq(
          $._function_body_statement,
          ';',
        ),
      ),
      $.keyword_end,
      optional(';'),
      alias($._dollar_quoted_string_end_tag, $.dollar_quote),
    ),
    seq(
      $.keyword_as,
      alias(
        choice(
          $._single_quote_string,
          $._double_quote_string,
        ),
        $.literal
      ),
    ),
    seq(
      $.keyword_as,
      alias($._dollar_quoted_string_start_tag, $.dollar_quote),
      $._function_body_statement,
      optional(';'),
      alias($._dollar_quoted_string_end_tag, $.dollar_quote),
    ),
    // Snowflake SQL UDF: AS $$ <scalar expression> $$
    seq(
      $.keyword_as,
      alias($._dollar_quoted_string_start_tag, $.dollar_quote),
      $._expression,
      alias($._dollar_quoted_string_end_tag, $.dollar_quote),
    ),
    $._tsql_function_body_statement,
  ),

  function_language: $ => seq(
    $.keyword_language,
    // TODO Maybe we should do different version of function_body_statement in
    // regard to the defined language to match either sql, plsql or
    // plpgsql. Currently the function_body_statement support only sql.  And
    // maybe for other language the function_body should be a string.
    $.identifier
  ),

  function_volatility: $ => choice(
    $.keyword_immutable,
    $.keyword_stable,
    $.keyword_volatile,
  ),

  function_leakproof: $ => seq(
    optional($.keyword_not),
    $.keyword_leakproof,
  ),

  function_security: $ => seq(
    optional($.keyword_external),
    $.keyword_security,
    choice($.keyword_invoker, $.keyword_definer),
  ),

  function_safety: $ => seq(
    $.keyword_parallel,
    choice(
      $.keyword_safe,
      $.keyword_unsafe,
      $.keyword_restricted,
    ),
  ),

  function_strictness: $ => choice(
    seq(
      choice(
        $.keyword_called,
        seq(
          $.keyword_returns,
          $.keyword_null,
        ),
      ),
      $.keyword_on,
      $.keyword_null,
      $.keyword_input,
    ),
    $.keyword_strict,
  ),

  function_cost: $ => seq(
    $.keyword_cost,
    $._natural_number,
  ),

  function_rows: $ => seq(
    $.keyword_rows,
    $._natural_number,
  ),

  function_support: $ => seq(
    $.keyword_support,
    alias($._literal_string, $.literal),
  ),

};
