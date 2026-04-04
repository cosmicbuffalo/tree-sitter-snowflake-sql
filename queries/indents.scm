[
 (select)
 (cte)
 (column_definitions)
 (case)
 (when_clause)
 (subquery)
 (insert)
] @indent.begin


(snowflake_scripting_block
  (keyword_begin)
) @indent.begin

(column_definitions ")" @indent.branch)

(subquery ")" @indent.branch)

(cte ")" @indent.branch)

[
 (keyword_end)
 (keyword_values)
 (keyword_into)
] @indent.branch

(keyword_end) @indent.end
