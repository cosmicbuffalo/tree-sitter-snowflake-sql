# Snowflake Scripting — Official Syntax Reference

Extracted from Snowflake documentation (fetched 2026-04-03).
This file is the source of truth for all grammar rules in this parser.

---

## Block Structure

Source: https://docs.snowflake.com/en/developer-guide/snowflake-scripting/blocks

```
DECLARE
  -- variable, cursor, RESULTSET, exception declarations
  ...
BEGIN
  -- Snowflake Scripting and SQL statements
  ...
EXCEPTION
  -- exception handling
  ...
END;
```

A simple block only requires BEGIN and END. DECLARE and EXCEPTION are optional.

**Important**: `BEGIN` that starts a block is different from `BEGIN` that starts a transaction.
Snowflake recommends `BEGIN TRANSACTION` (not bare `BEGIN`) for transactions.

---

## DECLARE

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/declare

```
DECLARE
  { <variable_declaration>
  | <cursor_declaration>
  | <resultset_declaration>
  | <nested_stored_procedure_declaration>
  | <exception_declaration>
  };
  [ ... ]
```

### Variable declaration

```
<variable_name> [ <type> ] [ { DEFAULT | := } <expression> ]
```

### Cursor declaration

```
<cursor_name> CURSOR FOR <query>
```

Where `query` is a SELECT statement (can contain `?` bind parameters).

### RESULTSET declaration

```
<resultset_name> RESULTSET [ { DEFAULT | := } [ ASYNC ] ( <query> ) ]
```

### Exception declaration

```
<exception_name> EXCEPTION [ ( <exception_number>, '<exception_message>' ) ]
```

Where `exception_number` is an integer between -20000 and -20999.

### Nested stored procedure declaration

```
<name> PROCEDURE ( [ <arg_name> <arg_data_type> ] [ , ... ] )
  RETURNS { <result_data_type> | TABLE ( [ <col_name> <col_data_type> [ , ... ] ] ) }
  AS <nested_procedure_definition>
```

---

## LET

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/let

### Variable assignment

```
LET <variable_name> <type> { DEFAULT | := } <expression> ;
LET <variable_name> { DEFAULT | := } <expression> ;
```

### Cursor assignment

```
LET <cursor_name> CURSOR FOR <query> ;
LET <cursor_name> CURSOR FOR <resultset_name> ;
```

### RESULTSET assignment

```
LET <resultset_name> RESULTSET := ( <query> ) ;
```

Note: the query is wrapped in parentheses.

---

## Assignment

Source: https://docs.snowflake.com/en/developer-guide/snowflake-scripting/variables

```
<variable_name> := <expression> ;
```

For RESULTSETs:
```
<resultset_name> := [ ASYNC ] ( <query> ) ;
```

---

## Variable binding in SQL

Source: https://docs.snowflake.com/en/developer-guide/snowflake-scripting/variables

Prefix variable with colon: `:my_variable`

For object identifiers: `IDENTIFIER(:variable_name)`

---

## IF

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/if

```
IF ( <condition> ) THEN
  <statement> ;
  [ <statement> ; ... ]
[ ELSEIF ( <condition> ) THEN
  <statement> ;
  [ <statement> ; ... ] ]
[ ELSE
  <statement> ;
  [ <statement> ; ... ] ]
END IF ;
```

Notes:
- ELSEIF is one word (no spaces)
- END IF is two words
- Parentheses around condition required
- THEN keyword required

---

## FOR

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/for

### Cursor-based

```
FOR <row_variable> IN <cursor_name> DO
  <statement> ;
  [ <statement> ; ... ]
END FOR [ <label> ] ;
```

### Counter-based

```
FOR <counter_variable> IN [ REVERSE ] <start> TO <end> { DO | LOOP }
  <statement> ;
  [ <statement> ; ... ]
END { FOR | LOOP } [ <label> ] ;
```

Notes:
- `DO` pairs with `END FOR`
- `LOOP` pairs with `END LOOP`
- `REVERSE` keyword counts backwards
- `start` and `end` should be INTEGER or expressions evaluating to INTEGER
- `end` should be >= `start` (or loop executes 0 times)

---

## WHILE

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/while

```
WHILE ( <condition> ) { DO | LOOP }
  <statement> ;
  [ <statement> ; ... ]
END { WHILE | LOOP } [ <label> ] ;
```

Notes:
- `DO` pairs with `END WHILE`
- `LOOP` pairs with `END LOOP`
- Parentheses around condition required

---

## LOOP

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/loop

```
LOOP
  <statement> ;
  [ <statement> ; ... ]
END LOOP [ <label> ] ;
```

Must use BREAK or RETURN to exit.

---

## REPEAT

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/repeat

```
REPEAT
  <statement> ;
  [ <statement> ; ... ]
UNTIL ( <condition> )
END REPEAT [ <label> ] ;
```

Notes:
- Body executes at least once (condition checked at end)
- Parentheses around condition required

---

## CASE (statement-level)

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/case

### Simple CASE

```
CASE ( <expression_to_match> )
  WHEN <expression> THEN
    <statement> ;
    [ <statement> ; ... ]
  [ WHEN ... ]
  [ ELSE
    <statement> ;
    [ <statement> ; ... ] ]
END [ CASE ] ;
```

### Searched CASE

```
CASE
  WHEN <boolean_expression> THEN
    <statement> ;
    [ <statement> ; ... ]
  [ WHEN ... ]
  [ ELSE
    <statement> ;
    [ <statement> ; ... ] ]
END [ CASE ] ;
```

---

## BREAK

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/break

```
{ BREAK | EXIT } [ <label> ] ;
```

BREAK and EXIT are synonymous.

---

## CONTINUE

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/continue

```
{ CONTINUE | ITERATE } [ <label> ] ;
```

CONTINUE and ITERATE are synonymous.

---

## RETURN

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/return

```
RETURN <expression> ;
```

Can return:
- A SQL data type value
- `TABLE(resultset_name)` for table return

---

## RAISE

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/raise

```
RAISE <exception_name> ;
```

In an exception handler, omit `exception_name` to re-raise the current exception:
```
RAISE ;
```

---

## EXCEPTION

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/exception

```
EXCEPTION
  WHEN <exception_name> [ OR <exception_name> ... ] [ { EXIT | CONTINUE } ] THEN
    <statement> ;
    [ <statement> ; ... ]
  [ WHEN ... ]
  [ WHEN OTHER [ { EXIT | CONTINUE } ] THEN ]
    <statement> ;
    [ <statement> ; ... ]
```

Notes:
- `EXIT` is the default behavior (exit block after handler)
- `CONTINUE` resumes at the statement after the one that caused the error
- `WHEN OTHER` catches all unspecified exceptions
- Multiple exceptions can be chained with `OR`
- Built-in exceptions: `STATEMENT_ERROR`, `EXPRESSION_ERROR`

---

## OPEN

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/open

```
OPEN <cursor_name> [ USING ( <bind_variable_1> [, <bind_variable_2> ...] ) ] ;
```

---

## FETCH

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/fetch

```
FETCH <cursor_name> INTO <variable> [, <variable> ... ] ;
```

---

## CLOSE

Source: https://docs.snowflake.com/en/sql-reference/snowflake-scripting/close (implied)

```
CLOSE <cursor_name> ;
```

---

## CREATE TASK

Source: https://docs.snowflake.com/en/sql-reference/sql/create-task

```
CREATE [ OR REPLACE ] TASK [ IF NOT EXISTS ] <name>
  [ WAREHOUSE = <string> ]
  [ SCHEDULE = ... ]
  [ ... options ... ]
  [ COMMENT = '<string_literal>' ]
  [ AFTER <string> [, ...] ]
  [ WHEN <boolean_expr> ]
AS <sql>
```

Variant: `CREATE OR ALTER TASK` (no IF NOT EXISTS, no OR REPLACE)

`<sql>` can be:
- Single SQL statement
- Call to a stored procedure
- Procedural logic using Snowflake Scripting

---

## CREATE PROCEDURE (Snowflake Scripting handler)

Source: https://docs.snowflake.com/en/sql-reference/sql/create-procedure

```
CREATE [ OR REPLACE ] PROCEDURE <name>
  ( [ <arg_name> [ { IN | INPUT | OUT | OUTPUT } ] <arg_data_type> [ DEFAULT <default_value> ] ] [ , ... ] )
  [ COPY GRANTS ]
  RETURNS { <result_data_type> | TABLE ( [ <col_name> <col_data_type> [ , ... ] ] ) }
  [ NOT NULL ]
  LANGUAGE SQL
  [ { CALLED ON NULL INPUT | { RETURNS NULL ON NULL INPUT | STRICT } } ]
  [ { VOLATILE | IMMUTABLE } ]
  [ COMMENT = '<string_literal>' ]
  [ EXECUTE AS { OWNER | CALLER | RESTRICTED CALLER } ]
AS <procedure_definition>
```

Variant: `CREATE OR ALTER PROCEDURE` (same syntax, no OR REPLACE/IF NOT EXISTS)

`<procedure_definition>` for Snowflake Scripting:
- Direct: `AS DECLARE ... BEGIN ... END;`
- Dollar-quoted: `AS $$ DECLARE ... BEGIN ... END; $$`
- String literal: `AS '...'`
