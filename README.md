# Markdown CLI Test

Test all the CLI commands and examples in your Markdown docs!

## Quick Start

**Install markdown-clitest:**

```console
npm install -g markdown-clitest
```

**Add comments in your Markdown files for the code blocks you want to test:**

````markdown
# Instructions for generating a random quote

First, install wikiquote-cli:

[This comment says to actually run the commands in the following code block.]
<!-- doctest command -->
```
npm install -g wikiquote-cli
```

[This comment runs wikiquote to confirm it got installed]
<!-- doctest exec { cmd: "wikiquote --help", matchRegex: "Get quotes from Wikiquote" } -->

Now you can get quotes!

[Run the command]
<!-- doctest command -->
```
wikiquote random "Steve Jobs"
```

[And check the output from the previous command]
<!-- doctest output { matchRegex: "-- Steve Jobs" } -->
````

**Then run `markdown-clitest` on your Markdown file:**

This example uses the `-i` flag to run in interactive mode.

```console
$ ./bin/markdown-clitest -i README.md

Changed to new cwd: '/src'
Running in temp dir: /tmp/clitest-PP2CZr
Testing file: README.md

CWD: /tmp/clitest-PP2CZr
Command: npm install -g wikiquote-cli
Continue? [Yes, No, Skip] y
/usr/local/bin/wikiquote -> /usr/local/lib/node_modules/wikiquote-cli/index.js
+ wikiquote-cli@1.2.7
added 64 packages from 83 contributors in 2.598s

Output OK? [Yes, No] y

CWD: /tmp/clitest-PP2CZr
Command: wikiquote --help
Continue? [Yes, No, Skip] y
Get quotes from Wikiquote

Usage: wikiquote <cmd> [options]

Commands:
  wikiquote cache <cmd>              issue cache commands
  wikiquote list <name> [options]    list quotes for a given page name
  wikiquote random <name> [options]  get a random quote from a page
  wikiquote search <query>           search for a page name
  wikiquote completion               generate completion script

Options:
  -v, --version  Show version number                           [boolean]
  -h, --help     Show help                                     [boolean]

Examples:
  wikiquote random "Steve Jobs"
  wikiquote search "bill gates"

CWD: /tmp/clitest-PP2CZr
Command: wikiquote random "Steve Jobs"
Continue? [Yes, No, Skip] y
We have always been shameless about stealing great ideas.
Triumph of the Nerds (1996) -- Steve Jobs

Output OK? [Yes, No] y
Removing temp dir: /tmp/clitest-PP2CZr
```

## Command Line Usage

```console
Usage: markdown-clitest [options] <filepath>

Options:
  -i, --interactive  Ask for user input at each action
  --list             List actions, but do not run them
  --no-cleanup       Don't remove temporary directory on exit
  -h, --help         output usage information

When used with a single file, it must be a markdown file and only that
file will be tested.

When used with a directory, all markdown files in that directory will be
tested, ordered with index.md first, followed by the remaining files sorted
by filename.
```

## Releasing markdown-clitest

```console
git checkout master
git pull origin master
yarn run release
git push --follow-tags origin master
yarn publish
```
