SELECT * FROM @~;
              -- <- string.special
SELECT * FROM @my_stage/path/file.csv;
              -- <- string.special

SELECT col:key FROM t;
       -- <- variable.member

SELECT func(param => 'value');
            -- <- variable.parameter

SELECT * FROM t QUALIFY ROW_NUMBER() OVER (ORDER BY id) = 1;
                -- <- keyword

SELECT TRY_CAST('123' AS INT);
       -- <- function.call

CREATE TABLE t (
  v VARIANT,
    -- <- type.builtin
  o OBJECT,
    -- <- type.builtin
  n NUMBER(10,2),
    -- <- type.builtin
  ts TIMESTAMP_LTZ,
     -- <- type.builtin
  vec VECTOR(FLOAT, 256)
      -- <- type.builtin
);

CREATE DYNAMIC TABLE t
       -- <- keyword.modifier
  AS SELECT 1;

GRANT SELECT ON TABLE t TO ROLE r;
-- <- keyword
REVOKE SELECT ON TABLE t FROM ROLE r;
-- <- keyword

SELECT CASE WHEN x = 1 THEN 'a' ELSE 'b' END;
       -- <- keyword.conditional
            -- <- keyword.conditional
