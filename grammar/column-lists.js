import { comma_list, optional_parenthesis, paren_list, wrapped_in_parenthesis } from "./helpers.js";

export default {

  _column_list: $ => paren_list(alias($._column, $.column), true),

  _column: $ => choice(
    $.identifier,
    alias($._literal_string, $.literal),
  ),

  _key_value_pair: $ => seq(
    field('key',$.identifier),
    '=',
    field('value', alias($._literal_string, $.literal)),
  ),

  column_definitions: $ => seq(
    '(',
    comma_list($.column_definition, true),
    optional($.constraints),
    ')',
  ),

  column_definition: $ => prec.left(seq(
    field('name', $._column),
    field('type', $._type),
    repeat($._column_constraint),
  )),

  _column_comment: $ => seq(
    $.keyword_comment,
    alias($._literal_string, $.literal)
  ),

  _column_constraint: $ => prec.left(choice(
    choice(
      $.keyword_null,
      $._not_null,
    ),
    seq(
      optional(seq($.keyword_foreign, $.keyword_key)),
      $.keyword_references,
      $.object_reference,
      paren_list($.identifier, true),
      repeat(
        seq(
          $.keyword_on,
          choice($.keyword_delete, $.keyword_update),
          choice(
            seq($.keyword_no, $.keyword_action),
            $.keyword_restrict,
            $.keyword_cascade,
            seq(
              $.keyword_set,
              choice($.keyword_null, $.keyword_default),
                optional(paren_list($.identifier, true))
            ),
          ),
        ),
      ),
    ),
    $._default_expression,
    $._primary_key,
    seq($.keyword_auto_increment, optional(choice($.keyword_order, seq($.keyword_no, $.keyword_order)))),
    $.direction,
    $._column_comment,
    $._check_constraint,
    seq(
      optional(seq($.keyword_generated, $.keyword_always)),
      $.keyword_as,
      $._expression,
    ),
    choice(
      $.keyword_stored,
      $.keyword_virtual,
    ),
    $.keyword_unique
  )),

  _check_constraint: $ => seq(
    optional(
      seq(
        $.keyword_constraint,
        $.literal
      )
    ),
    $.keyword_check,
    wrapped_in_parenthesis($.binary_expression)
  ),

  _default_expression: $ => seq(
    $.keyword_default,
    choice(
      // Prefer ending the default at a plain literal so that a following
      // NOT NULL starts the next constraint instead of a NOT LIKE/NOT IN operator.
      prec(10, $.literal),
      optional_parenthesis($._inner_default_expression),
    ),
  ),
  _inner_default_expression: $ => choice(
      $.literal,
      $.list,
      $.cast,
      $.binary_expression,
      $.unary_expression,
      $.array,
      $.invocation,
      prec.left(seq($.keyword_current_timestamp, optional(seq('(', optional($._expression), ')')), optional(seq('::', $._type)))),
      prec.left(seq($.keyword_current_date, optional(seq('(', optional($._expression), ')')), optional(seq('::', $._type)))),
      alias($.implicit_cast, $.cast),
  ),

  constraints: $ => seq(
    ',',
    $.constraint,
    repeat(
      seq(',', $.constraint),
    ),
  ),

  constraint: $ => choice(
    $._constraint_literal,
    $._key_constraint,
    $._primary_key_constraint,
    $._check_constraint
  ),

  _constraint_literal: $ => prec.left(seq(
    $.keyword_constraint,
    field('name', $.identifier),
    choice(
      seq(
        $._primary_key,
        $.ordered_columns,
      ),
      seq(
        $._check_constraint
      ),
      seq(
        $.keyword_unique,
        $.ordered_columns,
      ),
      seq(
        $.keyword_foreign,
        $.keyword_key,
        $.ordered_columns,
        $._references_clause,
      ),
    ),
    optional($._column_comment),
  )),

  _primary_key_constraint: $ => seq(
    $._primary_key,
    $.ordered_columns,
  ),

  _key_constraint: $ => seq(
    choice(
      seq(
        $.keyword_unique,
        optional(
          choice(
            $.keyword_index,
            $.keyword_key,
            seq($.keyword_nulls, optional($.keyword_not), $.keyword_distinct),
          ),
        ),
      ),
      seq(optional($.keyword_foreign), $.keyword_key, optional($._if_not_exists)),
      $.keyword_index,
    ),
    optional(field('name', $.identifier)),
    $.ordered_columns,
    optional($._references_clause),
  ),

  // REFERENCES t (cols) [ON DELETE|UPDATE action ...]
  _references_clause: $ => seq(
    $.keyword_references,
    $.object_reference,
    paren_list($.identifier, true),
    repeat(
      seq(
        $.keyword_on,
        choice($.keyword_delete, $.keyword_update),
        choice(
          seq($.keyword_no, $.keyword_action),
          $.keyword_restrict,
          $.keyword_cascade,
          seq(
            $.keyword_set,
            choice($.keyword_null, $.keyword_default),
            optional(paren_list($.identifier, true))
          ),
        ),
      ),
    ),
  ),

  ordered_columns: $ => paren_list(alias($.ordered_column, $.column), true),

  ordered_column: $ => seq(
    field('name', $._column),
    optional($.direction),
  ),

};
