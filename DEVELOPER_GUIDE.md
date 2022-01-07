- [Developer guide](#developer-guide)
  - [Forking and Cloning](#forking-and-cloning)
  - [Install Prerequisites](#install-prerequisites)
  - [Environment Setup](#environment-setup)
  - [Build](#build)
  - [Run](#run)
  - [Test](#test)

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

- `yarn start --no-base-path`

  Starts OpenSearch Dashboards and includes this plugin. OpenSearch Dashboards will be available on `localhost:5601`.

### Test

- `yarn test:jest`

  Runs the plugin unit tests.

- `yarn test:e2e`

  Start OpenSearch Dashboards, wait for it to be available on `localhost:5601`, and runs end-to-end tests.

- `yarn cy:run`

  Runs end-to-end tests on a currently running OpenSearch Dashboards server. Defaults to run the tests on `localhost:5601`, although you can change this to run on any
  OpenSearch Dashboards server with the command `yarn cy:run --config baseUrl=<your-custom-URL>`

### Formatting

This codebase uses Prettier as our code formatter. All new code that is added has to be reformatted using the Prettier version listed in `package.json`. In order to keep consistent formatting across the project developers should only use the prettier CLI to reformat their code using the following command:

```
yarn prettier --write <relative file path>
```

> NOTE: There also exists prettier plugins on several editors that allow for automatic reformatting on saving the file. However using this is discouraged as you must ensure that the plugin uses the correct version of prettier (listed in `package.json`) before using such a plugin.
