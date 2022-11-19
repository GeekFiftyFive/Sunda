# Sunda

[![Node.js Package](https://github.com/GeekFiftyFive/Sunda/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/GeekFiftyFive/Sunda/actions/workflows/npm-publish.yml) [![Node.js Test](https://github.com/GeekFiftyFive/Sunda/actions/workflows/test-package.yml/badge.svg)](https://github.com/GeekFiftyFive/Sunda/actions/workflows/test-package.yml)

## Introduction

Sunda allows you to query JSON objects using a subset of SQL. It includes a simple REPL as exporting the main end-to-end query execution method, allowing it be used programatically as well as being a useful CLI utility.

## Running

To start Sunda in REPL mode, simply run Sunda using `npx sunda`, or just `sunda` if it has been globally installed, and pass in a filename, like so:

```
sunda <filename.json>
```

Additionally, Sunda can take a query as a command line argument, using `-q` or `--query`. This will read the JSON file (if specified) or read from `stdin` (if no file is specified) and write the query results to the output file (if specified via `-o` or `--output`) or to `stdout` if no output file has been specified.

For example, the following command will read data from `stdin`, execute the query `select count(*) from root` against the dataset and then write the result to `stdout`.

```
sunda -q 'select count(*) from root'
```

And this query will do the same, but instead of writing the output to `stdout` it will be written to a file named `output.json`:

```
sunda -q 'select count(*) from root' -o output.json
```

Additionally, using the flags `--help` or `-h` will print the command usage.

## Syntax

As previously mentioned, Sunda implements a subset of SQL. At this point, it allows for combining conditions using `NOT`, `AND` and `OR`, and performing comparisons on field values using `=`, `<>`, `>`, `<`, `>=`, `<=`, `LIKE`, and `IN`. These comparison operators behave as one would expect from SQL.

Fields on the root level object are treated as tables (if they are an array). For example, if the JSON you are querying looks like this:

```
{
  "fruit": [
    {
      "name": "apple"
    },
    {
      "name": "orange"
    },
    {
      "name": "grape"
    }
  ]
}
```

Running `SELECT * FROM fruit` would return:

```
[
  {
    "name": "apple"
  },
  {
    "name": "orange"
  },
  {
    "name": "grape"
  }
]
```

Fields on the objects in the array can be accessed as if they were columns. Using our JSON object from the previous example, running `SELECT * FROM fruit WHERE name="apple"` would result in:

```
[
  {
    "name": "apple"
  }
]
```

## Aggregate Functions

Sunda supports the `AVG`, `SUM` and `COUNT` aggregations. When using an aggregate function, the result of the query will always follow this pattern:

```
[
  {
    "<aggregate-function>": <aggregate-value>
  }
]
```

Take this query, for example:

```
SELECT COUNT(*) FROM root
```

On a dataset with 42 items in the `root` table, I'd get the following result:

```
[
  {
    "count": 42
  }
]
```

### `COUNT`

Count can be used on any query, and will simply run the underlying query as normal and then return the number of results in the format listed above.

For example, I have a dataset full of individual cupcakes, with the following implicit schema:

```
{
  "cupcakes": [
    {
      "frosting": "<string>",
      "flavour": "<string>"
    }
  ]
}
```

I want to find the number of unique frosting and flavour combinations. This can be done by running the following query:

```
SELECT COUNT(DISTINCT frosting, flavour) FROM cupcakes
```

### `SUM`

Sum can only be used on single fields entirely comprised of numeric values. It will return the sum of all the values in the given field. Take the schema from the previous example, but this time let's add an additional `"price"` field, which will contain prices as numeric values:

```
{
  "cupcakes": [
    {
      "frosting": "<string>",
      "flavour": "<string>",
      "price": <number>
    }
  ]
}
```

If we wish to find the total cost of all cupcakes in the dataset, this could be achieved via the following query:

```
SELECT SUM(price) FROM cupcakes
```

If we had 3 entries with prices of 5, 3 and 1, we'd get this output:

```
[
  {
    sum: 9
  }
]
```

Attempting to execute a `SUM` against multiple fields, a wildcard or a field containing non numeric values will result in errors.

Attempting to run this query:

```
SELECT SUM(price, frosting) FROM cupcakes
```

Will result in this error:

```
Cannot use 'SUM' aggregation with multiple field names
```

Attempting to run this query:

```
SELECT SUM(*) FROM cupcakes
```

Will result in this error:

```
Cannot use 'SUM' aggregation with wildcard
```

And attempting to run this query:

```
SELECT SUM(frosting) FROM cupcakes
```

Will result in this error:

```
Cannot use 'SUM' on non numeric field
```

### `AVG`

Like `SUM`, `AVG` can only be ran against single fields containing numeric values. `AVG` will return the mean of all values in a given field. Taking the schema from before:

```
{
  "cupcakes": [
    {
      "frosting": "<string>",
      "flavour": "<string>",
      "price": <number>
    }
  ]
}
```

Consider the following query:

```
SELECT AVG(price) FROM cupcakes
```

If we had 3 entries with prices of 5, 3 and 1, we'd get this output:

```
[
  {
    avg: 3
  }
]
```

Like `SUM`, attempting to execute an `AVG` against multiple fields, a wildcard or a field containing non numeric values will result in errors.

Attempting to run this query:

```
SELECT AVG(price, frosting) FROM cupcakes
```

Will result in this error:

```
Cannot use 'AVG' aggregation with multiple field names
```

Attempting to run this query:

```
SELECT AVG(*) FROM cupcakes
```

Will result in this error:

```
Cannot use 'AVG' aggregation with wildcard
```

And attempting to run this query:

```
SELECT AVG(frosting) FROM cupcakes
```

Will result in this error:

```
Cannot use 'AVG' on non numeric field
```

## Joins

At the time of writing, Sunda has fairly limited support for joins. Only inner joins are supported, and only one can be used in a query, and the fields must be addressed via the table name. I.e. the `AS` keyword is not supported at present.

Say, we have the following schema:

```
{
  "posts": [
    {
      "ID": <number>,
      "PosterID" <number>
    }
  ],
  "users": [
    {
      "ID": <number>,
      "Name": <string>
    }
  ]
}
```

Where `PosterID` can be treated as a foreign key, targetting the `ID` field in the `users` table.

If we wish to get all of the posts where the poster has `Name` equal to `"Luz"` we can run either of the following queries:

```
// joining using condition in 'on' clause
SELECT * FROM posts JOIN users ON posts.PosterID = users.ID WHERE users.Name = 'Luz';

// joining using condition in 'where' clause
SELECT * FROM posts JOIN users WHERE posts.PosterID = users.ID AND users.Name = 'Luz';
```

Both of the above queries will bring back data in the following format:

```
[
  {
    "posts": {
      "ID": <number>,
      "PosterID": <number>
    }
    "users": {
      "ID": <number>,
      "Name": <string>
    }
  }
]
```

I.e. an array will be returned containing objects. Each object will have a field corresponding to each table name. These objects will follow the same schema as their original table.

### Join Shortcomings

Support for joins in Sunda is in its infancy. In addition to the previously highlighted restrictions, there are currently a few more 'gotchas', as outlined below:

- It is currently not possible to pull out individual fields in the `SELECT` clause when a join is in use, only a wildcard can be used
- When using an `OR` in the `WHERE` condition, any values matched via the use of `OR` will not pull back joined values from other tables

## Subqueries

Sunda has some support for sub queries. At present they require the use of an alias. The result of a subquery passed to an outer query will have each object nested in a field named after the chosen alias. Take this query for example:

```
SELECT * FROM (SELECT * FROM cats) as c
```

Assume that our dataset looks something like this:

```
{
  "cats": [
    {
      "name": "Tom",
      "breed": "Tabby",
      "age": 5
    },
    {
      "name": "Sarah",
      "breed": "Maine Coon",
      "age": 7
    },
    {
      "name": "Rocket",
      "breed": "Bengal",
      "age": 2
    },
    {
      "name": "Biscuits",
      "breed": "British Shorthair",
      "age": 10
    },
    {
      "name": "Sam",
      "breed": "Bengal",
      "age": 14
    }
  ]
}
```

The result of this query would look like this:

```
[
  {
    "c": {
      "name": "Tom",
      "breed": "Tabby",
      "age": 5
    }
  },
  {
    "c": {
      "name": "Sarah",
      "breed": "Maine Coon",
      "age": 7
    }
  },
  {
    "c": {
      "name": "Rocket",
      "breed": "Bengal",
      "age": 2
    }
  },
  {
    "c": {
      "name": "Biscuits",
      "breed": "British Shorthair",
      "age": 10
    }
  },
  {
    "c": {
      "name": "Sam",
      "breed": "Bengal",
      "age": 14
    }
  }
]
```

## Function Calls

It is possible to call functions to perform some processing on the data being queried.

### `array_position`

`array_position` provides the index at which a search value is located in an array, or `null` if it is not present in the array. Indexes start at 1.

An example of `array_position` is provided below:

```
SELECT array_position(('Doug', 'Abby', 'Joe'), name) FROM users
```

Given the following input data:

```
{
  "users": [
    {
      "name": "Doug"
    },
    {
      "name": "Joe"
    },
    {
      "name": "Abby"
    },
    {
      "name": "Hannah"
    }
  ]
}
```

Running this query will give the following output:

```
[
  { "0": 1 },
  { "0": 3 },
  { "0": 2 },
  { "0": null }
]
```

You can also pass in a 3rd optional parameter, specifying the index to start searching from. Take the following query:

```
SELECT array_position(('Doug', 'Abby', 'Joe', 'Doug'), name) FROM users
```

Running this against the above dataset will yield the same results we saw previously, but making one minor change to the query:

```
SELECT array_position(('Doug', 'Abby', 'Joe', 'Doug'), name, 2) FROM users
```

Will yield thse results:

```
[
  { "0": 4 },
  { "0": 3 },
  { "0": 2 },
  { "0": null }
]
```

Note that the first returned result now points to index `4` rather than one `1`. This is because our updated query passes in a 3rd optional parameter indicating that we should begin our search at index `2`.

### `array_length`

`array_length` allows you to get the length of an array

- Argument 1: The array to find the length of

As an example, say we have the following data:

```
{
  "testData": [
    {
      "array": [1,2,3]
    },
    {
      "array": [4,5,6,7,8]
    },
    {
      "array": []
    }
  ]
}
```

If we were to run the following query against it:

```
SELECT array_length(array) FROM testData
```

We'd get the following results:

```
[
  {"0": 3},
  {"0": 5},
  {"0": 0}
]
```

### `coalesce`

`coalesce` takes N number of arguments and returns the first one that does not evaluate to `undefined` or `null`

As an example, say we have the following data:

```
{
  "testData": [
    {
      "array": [1,2,3]
    },
    {
      "array": [4,5,6,7,8]
    },
    {
      "array": []
    },
    {}
  ]
}
```

If we were to run the following query against it:

```
SELECT coalesce(array, ()) FROM testData
```

We'd get the following results:

```
[
  {"0": [1,2,3]},
  {"0": [4,5,6,7,8]},
  {"0": []},
  {"0": []}
]
```

### `regex_group`

`regex_group` allows you to select a value from a match group in some regex. It takes 3 arguments:

- Argument 1: The regex to use when matching
- Argument 2: The value to match against
- Argument 3: 1-base index of the match group to select value from

As an example, say we have the following data:

```
{
  "testData": [
    {
      "message": "Hello, world!",
      "age": 24
    },
    {
      "message": "Hello, friends!",
      "age": 26
    },
    {
      "message": "Hello, friends!",
      "age": 27
    },
    {
      "message": "Not in pattern",
      "age": 30
    }
  ]
}
```

If we were to run the following query against it:

```
SELECT REGEX_GROUP("^Hello, (\w*)(!)$", message, 1) FROM testData
```

We'd get the following result:

```
[
  { "0": "world" },
  { "0": "friends" },
  { "0": "friends" },
  { "0": undefined }
]
```

Note that a plain JavaScript `undefined` is returned if nothing was matched.

### `parse_number`

`parse_number` allows you to parse a string representing a number to a JavaScript number type. This allows
numeric operations to be performed on it.

- Argument 1: The value containing a string to parse

As an example, say we have the following data:

```
{
  "testData": [
    {
      "stringNum": "42"
    },
    {
      "stringNum": "-1"
    },
    {
      "stringNum": "7.5"
    }
  ]
}
```

If we were to run the following query against it:

```
SELECT PARSE_NUMBER(stringNum) FROM testData
```

We'd get the following result:

```
[
  { "0": 42 },
  { "0": -1 },
  { "0": 7.5 }
]
```

## JSONL Support

As well as individual JSON objects, Sunda also supports JSONL files. These are collections of JSON objects delimited by new lines. When using a JSONL file, one table will exist with the name `root`.

Say, for example, our file contained the following:

```
{ "type": "Sofa", "colour": "red", "material": "leather" }
{ "type": "Chair", "colour": "brown", "material": "oak" }
{ "type": "Curtains", "colour": "red", "material": "fabric" }
{ "type": "Table", "colour": "brown", "material": "oak" }
```

Running `SELECT * FROM root` would yield the following results:

```
[
  { type: 'Sofa', colour: 'red', material: 'leather' },
  { type: 'Chair', colour: 'brown', material: 'oak' },
  { type: 'Curtains', colour: 'red', material: 'fabric' },
  { type: 'Table', colour: 'brown', material: 'oak' }
]
```

## Root Level Arrays

It is also possible to load root level arrays. Take the following example, adapted from the previous section:

```
[
  { type: 'Sofa', colour: 'red', material: 'leather' },
  { type: 'Chair', colour: 'brown', material: 'oak' },
  { type: 'Curtains', colour: 'red', material: 'fabric' },
  { type: 'Table', colour: 'brown', material: 'oak' }
]
```

The behaviour here is identical to the behaviour when dealing with JSONL files. The array will be loaded as a single table called `root`.

## MetaInterface

The MetaInterface is an interface built into the REPL intended to provide the user with additional information about the dataset being queried.

At the time of writing, this MetaInterface is able to list all tables in the dataset, dump the schema for each table as well as provide usage information for the MetaInterface itself. All MetaInterface commands are prefixed with `!`. This is how the REPL distinguishes MetaInterface commands from queries.

The available MetaInterface commands are as follows:

| Command       | Arguments    | Functionality                                        |
| ------------- | ------------ | ---------------------------------------------------- |
| `list_tables` | None         | List all tables in the dataset                       |
| `dump_schema` | `table_name` | Dump the schema for the table with name `table_name` |
| `help`        | None         | Print MetaInterface command usage instructions       |

As an example, say I wanted to dump the schema for a table named 'Users'. The command would be as follows:

```
sunda> !dump_schema Users
```
