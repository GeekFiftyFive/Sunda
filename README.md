# Sunda

## Introduction

Sunda allows you to query JSON objects using a subset of SQL. It includes a simple REPL as exporting the main end-to-end query execution method, allowing it be used programatically as well as being a useful CLI utility.

## Running

To start Sunda in REPL mode, simply run Sunda using `npx sunda`, or just `sunda` if it has been globally installed, and pass in a filename, like so:

~~~
sunda <filename.json>
~~~

Additionally, Sunda can take a query as a command line argument, using `-q` or `--query`. This will read the JSON file (if specified) or read from `stdin` (if no file is specified) and write the query results to the output file (if specified via `-o` or `--output`) or to `stdout` if no output file has been specified.

For example, the following command will read data from `stdin`, execute the query `select count(*) from root` against the dataset and then write the result to `stdout`.

~~~
sunda -q 'select count(*) from root'
~~~

And this query will do the same, but instead of writing the output to `stdout` it will be written to a file named `output.json`:

~~~
sunda -q 'select count(*) from root' -o output.json
~~~

## Syntax

As previously mentioned, Sunda implements a subset of SQL. At this point, it allows for combining conditions using `NOT`, `AND` and `OR`, and performing comparisons on field values using `=`, `<>`, `>`, `<`, `>=`, `<=`, and `LIKE`. These comparison operators behave as one would expect from SQL.

Fields on the root level object are treated as tables (if they are an array). For example, if the JSON you are querying looks like this:

~~~
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
~~~

Running `SELECT * FROM fruit` would return:

~~~
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
~~~

Fields on the objects in the array can be accessed as if they were columns. Using our JSON object from the previous example, running `SELECT * FROM fruit WHERE name="apple"` would result in:

~~~
[
  {
    "name": "apple"
  }
]
~~~

## Aggregate Functions

Sunda supports the `AVG`, `SUM` and `COUNT` aggregations. When using an aggregate function, the result of the query will always follow this pattern:

~~~
[
  {
    "<aggregate-function>": <aggregate-value>
  }
]
~~~

Take this query, for example:

~~~
SELECT COUNT(*) FROM root
~~~

On a dataset with 42 items in the `root` table, I'd get the following result:

~~~
[
  {
    "count": 42
  }
]
~~~

### `COUNT`

Count can be used on any query, and will simply run the underlying query as normal and then return the number of results in the format listed above.

For example, I have a dataset full of individual cupcakes, with the following implicit schema:

~~~
{
  "cupcakes": [
    {
      "frosting": "<string>",
      "flavour": "<string>"
    }
  ]
}
~~~

I want to find the number of unique frosting and flavour combinations. This can be done by running the following query:

~~~
SELECT COUNT(DISTINCT frosting, flavour) FROM cupcakes
~~~

### `SUM`

Sum can only be used on single fields entirely comprised of numeric values. It will return the sum of all the values in the given field. Take the schema from the previous example, but this time let's add an additional `"price"` field, which will contain prices as numeric values:

~~~
{
  "cupcakes": [
    {
      "frosting": "<string>",
      "flavour": "<string>",
      "price": <number>
    }
  ]
}
~~~

If we wish to find the total cost of all cupcakes in the dataset, this could be achieved via the following query:

~~~
SELECT SUM(price) FROM cupcakes
~~~

If we had 3 entries with prices of 5, 3 and 1, we'd get this output:

~~~
[
  {
    sum: 9
  }
]
~~~

Attempting to execute a `SUM` against multiple fields, a wildcard or a field containing non numeric values will result in errors.

Attempting to run this query:

~~~
SELECT SUM(price, frosting) FROM cupcakes
~~~

Will result in this error:

~~~
Cannot use 'SUM' aggregation with multiple field names
~~~

Attempting to run this query:

~~~
SELECT SUM(*) FROM cupcakes
~~~

Will result in this error:

~~~
Cannot use 'SUM' aggregation with wildcard
~~~

And attempting to run this query:

~~~
SELECT SUM(frosting) FROM cupcakes
~~~

Will result in this error:

~~~
Cannot use 'SUM' on non numeric field
~~~

### `AVG`

Like `SUM`, `AVG` can only be ran against single fields containing numeric values. `AVG` will return the mean of all values in a given field. Taking the schema from before:

~~~
{
  "cupcakes": [
    {
      "frosting": "<string>",
      "flavour": "<string>",
      "price": <number>
    }
  ]
}
~~~

Consider the following query:

~~~
SELECT AVG(price) FROM cupcakes
~~~

If we had 3 entries with prices of 5, 3 and 1, we'd get this output:

~~~
[
  {
    avg: 3
  }
]
~~~

Like `SUM`, attempting to execute an `AVG` against multiple fields, a wildcard or a field containing non numeric values will result in errors.

Attempting to run this query:

~~~
SELECT AVG(price, frosting) FROM cupcakes
~~~

Will result in this error:

~~~
Cannot use 'AVG' aggregation with multiple field names
~~~

Attempting to run this query:

~~~
SELECT AVG(*) FROM cupcakes
~~~

Will result in this error:

~~~
Cannot use 'AVG' aggregation with wildcard
~~~

And attempting to run this query:

~~~
SELECT AVG(frosting) FROM cupcakes
~~~

Will result in this error:

~~~
Cannot use 'AVG' on non numeric field
~~~

## Joins

At the time of writing, Sunda has fairly limited support for joins. Only inner joins are supported, and only one can be used in a query, and the fields must be addressed via the table name. I.e. the `AS` keyword is not supported at present.

Say, we have the following schema:

~~~
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
~~~

Where `PosterID` can be treated as a foreign key, targetting the `ID` field in the `users` table.

If we wish to get all of the posts where the poster has `Name` equal to `"Luz"` we can run either of the following queries:

~~~
// joining using condition in 'on' clause
SELECT * FROM posts JOIN users ON posts.PosterID = users.ID WHERE users.Name = 'Luz';

// joining using condition in 'where' clause
SELECT * FROM posts JOIN users WHERE posts.PosterID = users.ID AND users.Name = 'Luz';
~~~

Both of the above queries will bring back data in the following format:

~~~
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
~~~

I.e. an array will be returned containing objects. Each object will have a field corresponding to each table name. These objects will follow the same schema as their original table.

### Join Shortcomings

Support for joins in Sunda is in its infancy. In addition to the previously highlighted restrictions, there are currently a few more 'gotchas', as outlined below:

* It is currently not possible to pull out individual fields in the `SELECT` clause when a join is in use, only a wildcard can be used
* When using an `OR` in the `WHERE` condition, any values matched via the use of `OR` will not pull back joined values from other tables

## JSONL Support

As well as individual JSON objects, Sunda also supports JSONL files. These are collections of JSON objects delimited by new lines. When using a JSONL file, one table will exist with the name `root`.

Say, for example, our file contained the following:

~~~
{ "type": "Sofa", "colour": "red", "material": "leather" }
{ "type": "Chair", "colour": "brown", "material": "oak" }
{ "type": "Curtains", "colour": "red", "material": "fabric" }
{ "type": "Table", "colour": "brown", "material": "oak" }
~~~

Running `SELECT * FROM root` would yield the following results:

~~~
[
  { type: 'Sofa', colour: 'red', material: 'leather' },
  { type: 'Chair', colour: 'brown', material: 'oak' },
  { type: 'Curtains', colour: 'red', material: 'fabric' },
  { type: 'Table', colour: 'brown', material: 'oak' }
]
~~~

## Root Level Arrays

It is also possible to load root level arrays. Take the following example, adapted from the previous section:

~~~
[
  { type: 'Sofa', colour: 'red', material: 'leather' },
  { type: 'Chair', colour: 'brown', material: 'oak' },
  { type: 'Curtains', colour: 'red', material: 'fabric' },
  { type: 'Table', colour: 'brown', material: 'oak' }
]
~~~

The behaviour here is identical to the behaviour when dealing with JSONL files. The array will be loaded as a single table called `root`.
