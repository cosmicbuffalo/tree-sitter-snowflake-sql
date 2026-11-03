import { comma_list } from "../helpers.js";

export default {

  _delete_statement: $ => seq(
    $.delete,
    alias($._delete_from, $.from),
    optional($.returning),
  ),

  _delete_from: $ => seq(
    $.keyword_from,
    optional(
      $.keyword_only,
    ),
    $.object_reference,
    optional($._alias),
    // Snowflake: DELETE FROM t1 alias USING t2, t3, (subquery) AS alias WHERE ...
    optional(seq(
      $.keyword_using,
      comma_list(seq(
        choice($.subquery, $.object_reference),
        optional($._alias),
      ), true),
    )),
    optional($.where),
    optional($.order_by),
    optional($.limit),
  ),

  delete: $ => seq(
    $.keyword_delete,
  ),

};
