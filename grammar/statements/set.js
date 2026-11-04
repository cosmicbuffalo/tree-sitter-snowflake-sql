export default {

  // Snowflake session variable: SET name = value
  set_statement: $ => seq(
    $.keyword_set,
    $.object_reference,
    '=',
    $._expression,
  ),

};
