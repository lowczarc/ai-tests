# ai-tests

## Overview

`ai-tests` is a tool designed to assist developers in generating initial test boilerplates. It generates an initial batch of tests using LLMs based on a code file.

Although it's not always perfect, it could save you a ton of time and effort. It can provide a solid starting point for simple test suites, sometimes even generating fully working test suites on the first try!

## Getting Your PolyFact Token

AI-Tests uses PolyFact to generate AI responses. PolyFact is a managed backend, it abstract from the client all the hassle of managing different APIs, models, databases, etc...

To use it, you need to get a PolyFact token.

Follow these steps to get your PolyFact token:

1. Go to app.PolyFact.com.
2. Connect with GitHub.
3. Copy the token.

Then, you need to export the PolyFact token in your environment:

```bash
export POLYFACT_TOKEN=<your_polyfact_token>
```

## Usage

To use `ai-tests`, pass the file path to the command as follows:

```bash
$ npx ai-tests <input_file>
```

The output will be a batch of tests in the programming language corresponding to the input file. You can then modify and add to these tests as needed.

## Limitations

The generated tests are by no means a replacement for manually written, thoughtful test cases. The quality of tests varies - sometimes they are perfect and ready to run, and other times they serve as a starting point for further refinement. In general, be a good engineer, **use the right tool for the right job**.

Also, the tool currently has a limitation on file size. If a file is too large, it will generate multiple tests and concatenate them, which is, depending on the language, not always a good way of generating syntaxically valid test files.

## Contribute

Of course, contributions or suggestions are always welcome! Feel free to submit a pull request or open an issue.
