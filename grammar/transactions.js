export default {

  transaction: $ => seq(
    choice($.keyword_begin, $.keyword_start),
    // TRANSACTION keyword is required to disambiguate from scripting blocks.
    // Snowflake docs recommend BEGIN TRANSACTION (not bare BEGIN) for transactions.
    $.keyword_transaction,
    optional(';'),
    repeat(
      seq(
        $.statement,
        ';'
      ),
    ),
    choice(
      $._commit,
      $._rollback,
    ),
  ),

  _commit: $ => seq(
    $.keyword_commit,
    optional(
      $.keyword_transaction,
    ),
  ),

  _rollback: $ => seq(
    $.keyword_rollback,
    optional(
      $.keyword_transaction,
    ),
  ),

};
