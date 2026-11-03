export default {

  comment_statement: $ => seq(
    $.keyword_comment,
    $.keyword_on,
    $._comment_target,
    $.keyword_is,
    choice(
      $.keyword_null,
      alias($._literal_string, $.literal),
    ),
  ),

  _comment_target: $ => choice(
    // TODO: access method
    // TODO: aggregate
    // TODO: collation
    seq($.keyword_column, alias($._qualified_field, $.object_reference)),
    // TODO: constraint (on domain)
    // TODO: conversion
    seq($.keyword_database, $.identifier),
    // TODO: domain
    // TODO: event trigger
    // TODO: foreign data wrapper
    // TODO: foreign table
    seq($.keyword_function, $.object_reference, optional($.function_arguments)),
    // TODO: large object
    seq($.keyword_materialized, $.keyword_view, $.object_reference),
    // TODO: operator (|class|family)
    // TODO: policy
    // TODO: (procedural) language
    seq($.keyword_procedure, $.object_reference, optional($.function_arguments)),
    // TODO: publication
    seq($.keyword_role, $.identifier),
    // TODO: routine
    // TODO: rule
    seq($.keyword_schema, $.identifier),
    seq($.keyword_sequence, $.object_reference),
    // TODO: server
    // TODO: statistics
    // TODO: subscription
    seq($.keyword_table, $.object_reference),
    // TODO: text search (configuration|dictionary|parser|template)
    // TODO: transform for
    seq($.keyword_view, $.object_reference),
    // Snowflake objects
    seq(choice(
      $.keyword_stream,
      $.keyword_task,
      $.keyword_pipe,
      $.keyword_stage,
      $.keyword_warehouse,
      seq($.keyword_dynamic, $.keyword_table),
    ), $.object_reference),
  ),

};
