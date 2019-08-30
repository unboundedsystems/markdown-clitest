# Markdown CLI Test

Test all the CLI commands and exmaples in your Markdown docs!

## Quick Start

**Install markdown-clitest:**
```console
npm install -g markdown-clitest
```

**Add comments in your Markdown files for the code blocks you want to test:**
````markdown
# Generate a random quote!

First, install wikiquote-cli:

<!-- doctest command -->
```
npm install -g wikiquote-cli
```

Now you can get quotes!

<!-- doctest command -->
```
wikiquote random "Steve Jobs"
```
````

**Then run `markdown-clitest` on your Markdown file:**

This example uses the `-i` flag to run in interactive mode.
```console
markdown-clitest -i README.md

Running in temp dir: /tmp/clitest-bMpIIS
Testing file: README.md

CWD: /tmp/clitest-bMpIIS
Running: npm install -g wikiquote-cli
Continue? y

+ wikiquote-cli@1.2.7
added 64 packages from 79 contributors in 3.207s

Output OK? y

CWD: /tmp/clitest-bMpIIS
Running: wikiquote random "Steve Jobs"
Continue? y

We have always been shameless about stealing great ideas.
Triumph of the Nerds (1996) -- Steve Jobs


Output OK? y
Removing temp dir: /tmp/clitest-bMpIIS
```

## Releasing markdown-clitest
```console
git checkout master
git pull origin master
yarn run standard-version
git push --follow-tags origin master
npm publish
```
