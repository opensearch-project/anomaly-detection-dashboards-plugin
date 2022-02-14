- [Developer guide](#developer-guide)
  - [Forking and Cloning](#forking-and-cloning)
  - [Install Prerequisites](#install-prerequisites)
  - [Environment Setup](#environment-setup)
  - [Build](#build)
  - [Run](#run)
  - [Test](#test)
    - [Unit Tests](#unit-tests)
    - [Integration Tests](#integration-tests)
  - [Formatting](#formatting)
  - [Backports](#backports)

## Developer guide

So you want to contribute code to this project? Excellent! We're glad you're here. Here's what you need to do.

### Forking and Cloning

Fork this repository on GitHub, and clone locally with `git clone`.

### Install Prerequisites

You will need to install [node.js](https://nodejs.org/en/), [nvm](https://github.com/nvm-sh/nvm/blob/master/README.md), and [yarn](https://yarnpkg.com/) in your environment to properly pull down dependencies to build and bootstrap the plugin.

### Environment Setup

1. Download OpenSearch for the version that matches the [OpenSearch Dashboards version specified in package.json](./package.json#L7).
2. Download and install the appropriate [Anomaly Detection OpenSearch Plugin](https://github.com/opensearch-project/anomaly-detection).
3. Download the OpenSearch Dashboards source code for the [version specified in package.json](./package.json#L7) you want to set up.

   See the [OpenSearch Dashboards contributing guide](https://github.com/opensearch-project/OpenSearch-Dashboards/blob/main/CONTRIBUTING.md) and [developer guide](https://github.com/opensearch-project/OpenSearch-Dashboards/blob/main/DEVELOPER_GUIDE.md) for more instructions on setting up your development environment.

4. Change your node version to the version specified in `.node-version` inside the OpenSearch Dashboards root directory (this can be done with the `nvm use` command).
5. Create a `plugins` directory inside the OpenSearch Dashboards source code directory, if `plugins` directory doesn't exist.
6. Check out this package from version control into the `plugins` directory.
7. Run `yarn osd bootstrap` inside `OpenSearch-Dashboards/plugins/anomaly-detection-dashboards-plugin`.

Ultimately, your directory structure should look like this:

<!-- prettier-ignore -->
```md
.
├── OpenSearch-Dashboards
│   └──plugins
│      └── anomaly-detection-dashboards-plugin
```

### Build

To build the plugin's distributable zip simply run `yarn build`.

Example output: `./build/anomaly-detection-dashboards-1.0.0.0.zip`

### Run

In the base OpenSearch Dashboards directory, run

`yarn start --no-base-path`

Starts OpenSearch Dashboards and includes this plugin. OpenSearch Dashboards will be available on `localhost:5601`.

### Test

#### Unit Tests

`yarn test:jest`

Runs the plugin unit tests.

#### Integration Tests

Integration tests for this plugin are written using the Cypress test framework. The tests are maintained in the central [opensearch-dashboards-functional-test](https://github.com/opensearch-project/opensearch-dashboards-functional-test) repository. Steps to run the tests:

1. Spin up a cluster with the Anomaly Detection plugin ([details](https://github.com/opensearch-project/anomaly-detection/blob/main/DEVELOPER_GUIDE.md#build)) and Anomaly Detection Dashboards Plugin ([details](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/blob/main/DEVELOPER_GUIDE.md#run)) installed.
2. Checkout [opensearch-dashboards-functional-test](https://github.com/opensearch-project/opensearch-dashboards-functional-test)
3. In the root directory of `opensearch-dashboards-functional-test`, run a command using [Cypress CLI](https://docs.cypress.io/guides/guides/command-line)

For more details and an example, see the [related GitHub workflow](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/blob/main/.github/workflows/remote-integ-tests-workflow.yml).

### Formatting

This codebase uses Prettier as our code formatter. All new code that is added has to be reformatted using the Prettier version listed in `package.json`. In order to keep consistent formatting across the project developers should only use the prettier CLI to reformat their code using the following command:

```
yarn prettier --write <relative file path>
```

> NOTE: There also exists prettier plugins on several editors that allow for automatic reformatting on saving the file. However using this is discouraged as you must ensure that the plugin uses the correct version of prettier (listed in `package.json`) before using such a plugin.

### Backports

The Github workflow in [`backport.yml`](.github/workflows/backport.yml) creates backport PRs automatically when the
original PR with an appropriate label `backport <backport-branch-name>` is merged to main with the backport workflow
run successfully on the PR. For example, if a PR on main needs to be backported to `1.x` branch, add a label
`backport 1.x` to the PR and make sure the backport workflow runs on the PR along with other checks. Once this PR is
merged to main, the workflow will create a backport PR to the `1.x` branch.
