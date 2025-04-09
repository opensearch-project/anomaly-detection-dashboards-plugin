## Version 3.0.0.0-beta1 Release Notes

Compatible with OpenSearch Dashboards 3.0.0.0-beta1

### Features
- Implmentation of contextual launch ([#1005](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1005))

### Bug Fixes
- Switching fieldcaps api to utilize js client ([#984](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/984))
- Update namespace for alerting plugin to avoid conflict with alerting ([#1003](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1003))
- Fix remote cluster bug when remote and local have same name ([#1007](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1007))
- Display selected clusters correctly on edit page ([#1011](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1011))

### Infrastructure
- change gradle run to dualcluster is true ([#998](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/998))

### Maintenance
- fix(security): Upgrade axios to 1.8.2 to fix SSRF ([#991](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/991))
- Update @babel/runtime to >=7.26.10 ([#993](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/993))
- Increment version to 3.0.0.0-beta1 ([#1004](https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/pull/1004))
