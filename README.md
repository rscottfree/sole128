# Sole 128

**A simple interpreter and REPL with elements of a compiler**

_This was my first attempt at trying to understand how compilers work. It was
also an opportunity to play with language constructs that would be easy for
beginners to learn. I wouldn't expect anyone to use this--it's strictly for
learning and fun._

- Language looks like basic
- Synchronous
- Interpreted in JavaScript
- Includes parsing/tokenizing; interpreter reads syntax tree
- HTML/CSS user interface for REPL and running code files

Some supported language features include:

- string (`a$`), integer (`a%`), float (`a`) and array (`a[]`) types
- loops with `step` and `to`
- `goto` and `gosub` but without line numbers, just labels
- most everything is an expression and returns a value always stored in the built-in `!` (bang) variable
- `input` and `print` for getting user input and printing to screen
- basic math with `add`, `subtract`, `multiply`, `divide`
- `if` and `then`
- `run` command to run a file

See `interpreter.js` for a full list of supported statements and expressions.
(This files also includes the parser.)

Examples of the languages can be found in `code.prg` and `code_backup.prg`.

`sole128.js` drives the REPL.

`editor.prg` is an attempt at writing an editor in Sole128.

`kernal.js` is the code that drives the UI (rendered with HTML canvas element)

## Running it

_Uses the node package `http-server` with `npm start` to serve up the /src directory, but any static server will do._

_IMPORTANT: Code uses some APIs no longer present in modern browsers, and most things will not work._

- Clone the repo
- `npm install -g http-server`
- `npm start`
- Go to `http://localhost:8000/sole128.html`
- Try `run "code.prg"`

## Acknowledgments
The series of posts starting with the link below inspired this project. If you know
nothing about where to start with building a compiler, try this.

http://noeffclue.blogspot.ca/2014/05/compiler-part-1-introduction-to-writing.html

The general structure of this follows closely what I did for Sole64, a now-defunct Chrome App I created for learning programming.