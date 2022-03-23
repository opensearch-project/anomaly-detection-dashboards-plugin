[![Unit tests](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/workflows/Unit%20tests%20workflow/badge.svg)](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/actions?query=workflow%3A%22Unit+tests+workflow%22)
[![Integration tests](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/actions/workflows/remote-integ-tests-workflow.yml/badge.svg)](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/actions/workflows/remote-integ-tests-workflow.yml)
[![codecov](https://codecov.io/gh/opensearch-project/anomaly-detection-dashboards-plugin/branch/main/graph/badge.svg)](https://codecov.io/gh/opensearch-project/anomaly-detection-dashboards-plugin)
[![Documentation](https://img.shields.io/badge/doc-reference-blue)](https://opensearch.org/docs/monitoring-plugins/ad)
[![Forum](https://img.shields.io/badge/chat-on%20forums-blue)](https://discuss.opendistrocommunity.dev/c/Use-this-category-for-all-questions-around-machine-learning-plugins)
![PRs welcome!](https://img.shields.io/badge/PRs-welcome!-success)

<img src="https://opensearch.org/assets/img/opensearch-logo-themed.svg" height="64px">

- [OpenSearch Anomaly Detection Dashboards Plugin](#opensearch-anomaly-detection-dashboards-plugin)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Code of Conduct](#code-of-conduct)
- [Security](#security)
- [License](#license)
- [Copyright](#copyright)

## OpenSearch Anomaly Detection Dashboards Plugin

The OpenSearch Anomaly Detection Dashboards plugin enables you to leverage Machine Learning based algorithms to automatically detect anomalies as your log data is ingested. Combined with [Alerting](https://opensearch.org/docs/monitoring-plugins/alerting), you can monitor your data in near real time and automatically send alert notifications. With an intuitive OpenSearch Dashboards interface and a powerful API, it is easy to set up, tune, and monitor your anomaly detectors.

Anomaly detection uses the Random Cut Forest (RCF) algorithm for detecting anomalous data points.

You should use the plugin with the same version of the [OpenSearch Alerting Dashboards Plugin](https://github.com/opensearch-project/alerting-dashboards-plugin). You can also create monitors based on a created anomaly detector. A scheduled monitor run checks the anomaly detection results regularly and collects anomalies to trigger alerts based on custom trigger conditions.

## Documentation

Please see our [documentation](https://opensearch.org/docs/monitoring-plugins/ad).

## Contributing

See [developer guide](DEVELOPER_GUIDE.md) and [how to contribute to this project](CONTRIBUTING.md).

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](CODE_OF_CONDUCT.md). For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq), or contact [opensource-codeofconduct@amazon.com](mailto:opensource-codeofconduct@amazon.com) with any additional questions or comments.

## Security

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public GitHub issue.

## License

This project is licensed under the [Apache v2.0 License](LICENSE.txt).

## Copyright

Copyright OpenSearch Contributors. See [NOTICE](NOTICE.txt) for details.
