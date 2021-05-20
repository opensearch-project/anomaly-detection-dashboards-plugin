[![Unit tests](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/workflows/Unit%20tests%20workflow/badge.svg)](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/actions?query=workflow%3A%22Unit+tests+workflow%22)
[![Integration tests](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/workflows/E2E%20tests%20workflow/badge.svg)](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/actions?query=workflow%3A%22E2E+tests+workflow%22)
[![codecov](https://codecov.io/gh/opensearch-project/anomaly-detection-dashboards-plugin/branch/main/graph/badge.svg)](https://codecov.io/gh/opensearch-project/anomaly-detection-dashboards-plugin)
[![Documentation](https://img.shields.io/badge/doc-reference-blue)](https://docs-beta.opensearch.org/docs/ad/)
[![Forum](https://img.shields.io/badge/chat-on%20forums-blue)](https://discuss.opendistrocommunity.dev/c/Use-this-category-for-all-questions-around-machine-learning-plugins)
![PRs welcome!](https://img.shields.io/badge/PRs-welcome!-success)

## OpenSearch Anomaly Detection Dashboards

The OpenSearch Anomaly Detection Dashboards plugin enables you to leverage Machine Learning based algorithms to automatically detect anomalies as your log data is ingested. Combined with Alerting, you can monitor your data in near real time and automatically send alert notifications. With an intuitive OpenSearch Dashboards interface and a powerful API, it is easy to set up, tune, and monitor your anomaly detectors.

## Highlights

Anomaly detection is using Random Cut Forest (RCF) algorithm for detecting anomalous data points.

You should use the plugin with the same version of the [OpenSearch Alerting Dashboards plugin](https://github.com/opensearch-project/alerting-dashboards-plugin). You can also create monitors based on a created anomaly detector. A scheduled monitor run checks the anomaly detection results regularly and collects anomalies to trigger alerts based on custom trigger conditions.

## Current Limitations

- We will continuously add new unit test cases, but we don't have 100% unit test coverage for now. This is a great area for developers from the community to contribute and help improve test coverage.
- Please see documentation links and GitHub issues for other details.

## Documentation

Please see our [documentation](https://docs-beta.opensearch.org/docs/ad).

## Setup

1. Download OpenSearch for the version that matches the [OpenSearch Dashboards version specified in package.json](./package.json#L7).
1. Download and install the appropriate [Anomaly Detection OpenSearch plugin](https://github.com/opensearch-project/anomaly-detection).
1. Download the OpenSearch Dashboards source code for the [version specified in package.json](./package.json#L7) you want to set up.

   See the [OpenSearch Dashboards contributing guide](https://github.com/opensearch-project/OpenSearch-Dashboards/blob/main/CONTRIBUTING.md) and [developer guide](https://github.com/opensearch-project/OpenSearch-Dashboards/blob/main/DEVELOPER_GUIDE.md) for more instructions on setting up your development environment.

1. Change your node version to the version specified in `.node-version` inside the OpenSearch Dashboards root directory.
1. Create a `plugins` directory inside the OpenSearch Dashboards source code directory, if `plugins` directory doesn't exist.
1. Check out this package from version control into the `plugins` directory.
1. Run `yarn osd bootstrap` inside `OpenSearch-Dashboards/plugins/anomaly-detection-dashboards-plugin`.

Ultimately, your directory structure should look like this:

<!-- prettier-ignore -->
```md
.
├── OpenSearch-Dashboards
│   └──plugins
│      └── anomaly-detection-dashboards-plugin
```

## Build

To build the plugin's distributable zip simply run `yarn build`.

Example output: `./build/anomalyDetectionDashboards-1.0.0.0.zip`

## Run

In the base OpenSearch Dashboards directory, run

- `yarn start --no-base-path`

  Starts OpenSearch Dashboards and includes this plugin. OpenSearch Dashboards will be available on `localhost:5601`.

## Test

- `yarn test:jest`

  Runs the plugin unit tests.

- `yarn test:e2e`

  Start OpenSearch Dashboards, wait for it to be available on `localhost:5601`, and runs end-to-end tests.

- `yarn cy:run`

  Runs end-to-end tests on a currently running OpenSearch Dashboards server. Defaults to run the tests on `localhost:5601`, although you can change this to run on any
  OpenSearch Dashboards server with the command `yarn cy:run --config baseUrl=<your-custom-URL>`

## Contributing

We welcome you to get involved in development, documentation, testing the anomaly detection plugin. See our [CONTRIBUTING.md](CONTRIBUTING.md) and join in.

Since this is a OpenSearch Dashboards plugin, it can be useful to review the [OpenSearch Dashboards contributing guide](https://github.com/opensearch-project/OpenSearch-Dashboards/blob/main/CONTRIBUTING.md) as well as the [developer guide](https://github.com/opensearch-project/OpenSearch-Dashboards/blob/main/DEVELOPER_GUIDE.md) to help get started.

## Code of Conduct

This project has adopted an [Open Source Code of Conduct](CODE_OF_CONDUCT.md).

## Security issue notifications

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public GitHub issue.

## License

See the [LICENSE](LICENSE.txt) file for our project's licensing. We will ask you to confirm the licensing of your contribution.

## Copyright

Copyright 2021 OpenSearch Contributors
