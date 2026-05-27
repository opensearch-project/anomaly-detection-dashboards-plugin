## Version 3.7.0 Release Notes

Compatible with OpenSearch and OpenSearch Dashboards version 3.7.0

### Features

* Add Daily Insights agent task polling, ML task API, and page stability fixes for async detector creation flow ([#1173](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1173))
* Add Daily Insights event detail modal with Discover deep links, per-anomaly navigation, and improved insight card UX ([#1184](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1184))
* Route AD results search through core `_search` on multi-tenant services where the AD backend plugin is unavailable ([#1190](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1190))
* Disable unsupported features (default result index, flattened result index, historical analysis) on multi-tenant services data sources ([#1189](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1189))
* Enforce workspace ACL and return 501 for unsupported routes on multi-tenant services data sources ([#1191](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1191))

### Enhancements

* Use `getIsIconSideNavEnabled` API for navigation registration in the Observability workspace ([#1187](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1187))

### Infrastructure

* Add issues write permission to untriaged label workflow to fix 403 errors ([#1200](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1200))
* Increase unit test coverage for utility functions with 95 new tests across forecast and anomaly result utilities ([#1172](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1172))
* Optimize CI workflows with yarn caching, action version bumps, bug fixes, and dead code removal ([#1163](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1163))
* Match jest-canvas-mock version with core ([#1202](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1202))

### Maintenance

* Bump axios from 1.13.5 to 1.15.0 ([#1180](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1180))
* Bump follow-redirects from 1.15.11 to 1.16.0 ([#1183](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1183))
* Bump picomatch and brace-expansion to resolve CVEs (CVE-2026-33750, CVE-2026-33671, CVE-2026-33672) ([#1161](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1161))
* Migrate plugin to TypeScript 6.0.2 compatibility ([#1186](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1186))
