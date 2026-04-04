SELECT MAX(m.id) max
-- <- keyword
--     ^ function.call
--         ^ type
--           ^ variable.member
--               ^ variable
FROM my_table m
-- <- keyword
--   ^ type
--            ^ variable
WHERE m.id > 4
-- <- keyword
--      ^ variable.member
--         ^ operator
--           ^ number
  AND m.title LIKE '%foo%';
  -- <- keyword.operator
                 -- ^ string

