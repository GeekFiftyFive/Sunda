# Sunda

## Introduction

Sunda allows you to query JSON objects using a subset of SQL. It includes a simple REPL as exporting the main end-to-end query execution method, allowing it be used programatically as well as being a useful CLI utility.

## Running

The REPL can be ran using `npx sunda` or `sunda` (if it has been installed globally), and the only parameter it takes is the name of the file containing the JSON you wish to query.

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
