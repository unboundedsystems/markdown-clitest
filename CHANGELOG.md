# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.5.1](https://github.com/unboundedsystems/markdown-clitest/compare/v0.5.0...v0.5.1) (2020-02-11)


### Bug Fixes

* Allow either ordering of output in stdout/stderr test ([756c02c](https://github.com/unboundedsystems/markdown-clitest/commit/756c02c6f68ef144329b53adc9619f9d3ae257e4))
* Stderr output matching not working correctly ([fc93290](https://github.com/unboundedsystems/markdown-clitest/commit/fc932908e0987c59b29c0e5b63022a389098e2a7))

## [0.5.0](https://github.com/unboundedsystems/markdown-clitest/compare/v0.4.2...v0.5.0) (2020-02-11)


### Features

* Capture both stdout and stderr from command for matching to output ([ba7ac56](https://github.com/unboundedsystems/markdown-clitest/commit/ba7ac56182434dd2e3c4947ab72afc4f3d7abcce))

### [0.4.2](https://github.com/unboundedsystems/markdown-clitest/compare/v0.4.1...v0.4.2) (2020-01-15)


### Bug Fixes

* Correctly handle code blocks with comments, improve failure output ([6f16e3f](https://github.com/unboundedsystems/markdown-clitest/commit/6f16e3f570fedb92ec5a04f259c47dda09088960))

### [0.4.1](https://github.com/unboundedsystems/markdown-clitest/compare/v0.4.0...v0.4.1) (2020-01-15)


### Bug Fixes

* Correctly parse indented code blocks ([7da8b22](https://github.com/unboundedsystems/markdown-clitest/commit/7da8b22c45b45321231d98916132b3b8577d3c7e))

## [0.4.0](https://github.com/unboundedsystems/markdown-clitest/compare/v0.3.0...v0.4.0) (2020-01-04)


### Features

* Give filename and line number when action parameters are incorrect ([5fc4d3a](https://github.com/unboundedsystems/markdown-clitest/commit/5fc4d3a5b9f384b27e571783448ad9a4410f9d07))

## [0.3.0](https://github.com/unboundedsystems/markdown-clitest/compare/v0.2.0...v0.3.0) (2019-12-21)


### Features

* Add regexFlags to output and exec actions ([f1eb0c3](https://github.com/unboundedsystems/markdown-clitest/commit/f1eb0c36252fb5a3edc5736dd6d354dc4ee8a346))

## [0.2.0](https://github.com/unboundedsystems/markdown-clitest/compare/v0.1.3...v0.2.0) (2019-12-20)


### Features

* Add new 'exec' action for testing conditions not present in Markdown text ([2e5f831](https://github.com/unboundedsystems/markdown-clitest/commit/2e5f83140a92e600da49b505aea75ce33de398ca))
* Add new 'output' action for checking output of previous command ([f55cb64](https://github.com/unboundedsystems/markdown-clitest/commit/f55cb64321e073cfa62d0d8efb81813276f6da44))


### Bug Fixes

* Don't strip final newline from 'command' actions ([fefb6e1](https://github.com/unboundedsystems/markdown-clitest/commit/fefb6e1cd461ab6a7b005a378d6c6a9f599fd653))
* Improve output for errors ([05a5719](https://github.com/unboundedsystems/markdown-clitest/commit/05a5719431c73be6733a2005d8615f6009d8bc79))
* Stream command output while commands run instead of buffering output ([5b8300a](https://github.com/unboundedsystems/markdown-clitest/commit/5b8300a185d8a95dfd3d17c6a57b1a35bf9643e3))

### [0.1.2](https://github.com/unboundedsystems/markdown-clitest/compare/v0.1.1...v0.1.2) (2019-09-04)


### Bug Fixes

* Give more complete output on command error ([66dcde4](https://github.com/unboundedsystems/markdown-clitest/commit/66dcde4))
* Remove unneeded @types/execa ([df6ac52](https://github.com/unboundedsystems/markdown-clitest/commit/df6ac52))
* Replace custom parsing with commander ([63ddc6c](https://github.com/unboundedsystems/markdown-clitest/commit/63ddc6c))


### Features

* Allow skipping actions in interactive mode ([c7ca563](https://github.com/unboundedsystems/markdown-clitest/commit/c7ca563))

### [0.1.1](https://github.com/unboundedsystems/markdown-clitest/compare/v0.1.0...v0.1.1) (2019-08-30)

## [0.1.0](https://github.com/unboundedsystems/markdown-clitest/compare/v0.0.2...v0.1.0) (2019-08-30)


### ⚠ BREAKING CHANGES

* Changes name of bin file and published npm name

* Change project name to markdown-clitest ([8dfc273](https://github.com/unboundedsystems/markdown-clitest/commit/8dfc273))


### Bug Fixes

* **deps:** update dependency @adpt/utils to ^0.0.5 ([65eb90e](https://github.com/unboundedsystems/markdown-clitest/commit/65eb90e))
* Update dependencies ([705c1ac](https://github.com/unboundedsystems/markdown-clitest/commit/705c1ac))
* Update more dependencies ([5103c70](https://github.com/unboundedsystems/markdown-clitest/commit/5103c70))
