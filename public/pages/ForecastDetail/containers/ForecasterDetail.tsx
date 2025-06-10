/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  RouteComponentProps,
  useLocation,
} from 'react-router-dom';
import { CoreStart, MountPoint } from '../../../../../../src/core/public';
import {
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiHealth,
  EuiTabs,
  EuiTab,
  EuiDescribedFormGroup,
  EuiBottomBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
  EuiSmallButtonIcon,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiProgress,
  EuiPanel,
  EuiFlexGrid,
  EuiSmallButtonEmpty,
  EuiToolTip,
} from '@elastic/eui';
import { get, isEmpty, } from 'lodash';
import { MDS_BREADCRUMBS, BREADCRUMBS, DEFAULT_OUTPUT_AFTER, USE_NEW_HOME_PAGE } from '../../../utils/constants';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { getDataSourceEnabled, getDataSourceManagementPlugin, getSavedObjectsClient, getNotifications, getUISettings, getNavigationUI, getApplication } from '../../../services';
import { constructHrefWithDataSourceId, getDataSourceFromURL } from '../../../pages/utils/helpers';
import { useFetchForecasterInfo } from '../../CreateForecasterSteps/hooks/useFetchForecasterInfo';
import { FORECASTER_STATE, isActiveState } from '../../../../server/utils/constants';
import { forecastStateToColorMap } from '../../utils/constants';
import moment from 'moment';
import { Forecaster, UNITS, VALIDATION_ISSUE_TYPES, ValidationModelResponse, ValidationSettingResponse, } from '../../../models/interfaces';
import { ConfirmDeleteForecastersModal } from '../../ForecastersList/containers/ConfirmActionModals/ConfirmDeleteForecastersModal';
import { startForecaster, stopForecaster, testForecaster, getForecaster, deleteForecaster, validateForecaster, updateForecaster } from '../../../redux/reducers/forecast';
import { getForecasterResults, getTopForecastResults, searchResults } from '../../../redux/reducers/forecastResults';
import { prettifyErrorMessage } from '../../../../server/utils/helpers';
import { useDispatch, useSelector } from 'react-redux';
import { toDuration, } from '../../../models/interfaces';
import {buildParamsForGetForecasterResultsWithDateRange, buildVisualizationParams, composeLatestForecastRunQuery, extractEntitiesFromResponse, parseLatestForecastRunResponse, VisualizationOptions } from '../../utils/forecastResultUtils';
import { getForecasterInitializationInfo, DEFAULT_ENTITIES_TO_SHOW } from '../utils/utils';
import { INIT_DETAILS_FIELD, INIT_ERROR_MESSAGE_FIELD, INIT_ACTION_ITEM_FIELD } from '../utils/utils';
import { ConfigCell } from '../../../components/ConfigCell/ConfigCell';
import { AppState } from '../../../redux/reducers';
import { getErrorMessage } from '../../../utils/utils';
import ContentPanel from '../../../components/ContentPanel/ContentPanel';
import { toStringConfigCell } from '../../ReviewAndCreate/utils/helpers';
import { StopForecastToEditModal } from '../components/StopForecastToEditModal/StopForecastToEditModal';
import NameAndDescription from '../../DefineForecaster/components/NameAndDescription/NameAndDescription';
import { validateForecasterNameTemplate } from '../../DefineForecaster/containers/DefineForecaster';
import { StorageSettings } from '../../ConfigureForecastModel/components/StorageSettings/StorageSettings';
import { Formik, FormikProps } from 'formik';
import { configureToFormik, detailsToFormik, formikToForecaster } from '../utils/helpers';
import { DataSource } from '../../DefineForecaster/components/Datasource/DataSource';
import { Features } from '../../DefineForecaster/components/Features/Features';
import { getCategoryFields } from '../../DefineForecaster/utils/helpers';
import { ForecastCategoryField } from '../../DefineForecaster/components/ForecastCategory/ForecastCategory';
import { getClustersInfo, getMappings } from '../../../redux/reducers/opensearch';
import { Settings } from '../../ConfigureForecastModel/components/Settings/Settings';
import { AdvancedSettings } from '../../ConfigureForecastModel/components/AdvancedSettings/AdvancedSettings';
import { ConfigureFormikValues } from '../models/interface';
import { DetailsFormikValues } from '../models/interface';
import { ForecastChart } from '../components/ForecastChart/ForecastChart';
import { ForecastEntity, ForecastResult } from '../../../../server/models/interfaces';
import {
  convertToEpochRange,
  createRelativeDateRange,
} from '../utils/dateUtils';
import { DateRange } from '../utils/interface';
import { DEFAULT_TIME_RANGE } from '../utils/constant';
import { ForecasterControls } from '../components/ForecasterControls/ForecasterControls';


export interface ForecasterRouterProps {
  forecasterId?: string;
}

interface ForecasterDetailProps extends RouteComponentProps<ForecasterRouterProps> {
  setActionMenu: (menuMount: MountPoint | undefined) => void;
}

/**
 * ForecasterDetail implements a unidirectional data flow pattern where:
 * 1. Parent component (ForecasterDetail) owns and manages all state
 * 2. Child component (ForecastChart) receives data and requests changes through callbacks
 * 3. Data flows down, actions flow up (through callbacks)
 * 4. State is centralized and easier to reason about
 */
export const ForecasterDetail = (props: ForecasterDetailProps) => {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  // setDataSourceEnabled is called in public/plugin.ts when the plugin is initialized
  const dataSourceEnabled = getDataSourceEnabled().enabled;
  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  const dataSourceId = MDSQueryParams.dataSourceId;

  // We can get forecasterId from URL params because this component is rendered by React Router
  // and the route path APP_PATH.FORECASTER_DETAIL is defined with a URL parameter like
  // '/forecasters/:forecasterId/'
  const forecasterId = get(props, 'match.params.forecasterId', '');
  const { forecaster } = useFetchForecasterInfo(forecasterId, dataSourceId);

  // Track active tab
  const [selectedTabId, setSelectedTabId] = useState('configuration');

  // Local UI state for showing the delete dialog
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const dispatch = useDispatch();

  // Add new state to track edit mode
  const [isEditing, setIsEditing] = useState(false);

  const [isStopEditModalOpen, setIsStopEditModalOpen] = useState<boolean>(false);

  // Add handler for edit button
  const onEditForecasterSettings = () => {
    if (isActiveState(forecaster?.curState) || forecaster?.curState === FORECASTER_STATE.INIT_TEST) {
      setIsStopEditModalOpen(true);
    } else {
      setIsEditing(true);
    }
  };

  // Create separate refs for each Formik instance.
  const configFormikRef = useRef<FormikProps<ConfigureFormikValues>>(null);
  const detailsFormikRef = useRef<FormikProps<DetailsFormikValues>>(null);

  const onUpdateSettings = () => {
    // Cache the current Formik instances.
    const configFormik = configFormikRef.current;
    const detailsFormik = detailsFormikRef.current;
    // If either is missing, exit early.
    if (!configFormik || !detailsFormik) return;

    // Create a new values object with categoryFieldEnabled overridden
    const updatedConfigValues = {
      ...configFormik.values,
      categoryFieldEnabled: isHCForecaster
    };

    // Validate both forms concurrently.
    return Promise.all([
      configFormik.validateForm(updatedConfigValues),
      detailsFormik.validateForm()
    ])
      .then(([configErrors, detailsErrors]) => {
        const hasErrors =
          Object.keys(configErrors).length > 0 ||
          Object.keys(detailsErrors).length > 0;

        if (hasErrors) {
          // Use the cached non-null instances.
          configFormik.setTouched(
            Object.keys(configFormik.values).reduce((acc, key) => {
              acc[key] = true;
              return acc;
            }, {} as Record<string, boolean>)
          );
          detailsFormik.setTouched(
            Object.keys(detailsFormik.values).reduce((acc, key) => {
              acc[key] = true;
              return acc;
            }, {} as Record<string, boolean>)
          );
          core.notifications.toasts.addDanger({
            title: 'One or more input fields is invalid',
            text: (element: HTMLElement) => {
              // The toast API expects the text property to be either a string or a "mount point" 
              // (a function that receives a DOM element and mounts your UI into it).
              // Here we use ReactDOM.render to mount our error message UI into the provided element.
              ReactDOM.render(
                <>
                  {Object.keys(configErrors).length > 0 ? (
                    <div>
                      <strong>Configuration errors:</strong>
                      <ul>
                        {Object.entries(configErrors).map(([field, error]) => (
                          <li key={field}>{`${field}: ${error}`}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {Object.keys(detailsErrors).length > 0 && (
                    <div>
                      <strong>Details errors:</strong>
                      <ul>
                        {Object.entries(detailsErrors).map(([field, error]) => (
                          <li key={field}>{`${field}: ${error}`}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>,
                element
              );
              return () => ReactDOM.unmountComponentAtNode(element);
            },
          });
          // just return (or throw) so the `.finally` below gets triggered.
          return Promise.reject(new Error('Validation errors'));
        }

        // Use the updated values when creating the forecaster
        const updatedForecaster = formikToForecaster(
          updatedConfigValues,
          detailsFormik.values,
          forecaster,
        );

        // return the promise so we stay in the same chain
        return handleUpdateForecaster(updatedForecaster);
      })
      .catch((error) => {
        // Log error to console and show toast notification
        console.error("Validation failed:", error);
        core.notifications.toasts.addDanger({
          title: 'Validation failed',
          text: prettifyErrorMessage(getErrorMessage(error, 'There was a problem validating the form'))
        });
      })
      .finally(() => {
        // All paths (success or error) come through here exactly once
        // will trigger validation in useEffect when updateForecaster is done
        setIsEditing(false);
      });
  };

  const handleUpdateForecaster = (updatedForecaster: Forecaster) => {
    // Return the dispatch so we can chain off of it
    return dispatch(updateForecaster(forecasterId, updatedForecaster, dataSourceId))
      .then((response: any) => {
        core.notifications.toasts.addSuccess(
          `Forecaster updated: ${response.response.name}`
        );
      })
      .catch((err: any) => {
        core.notifications.toasts.addDanger(
          prettifyErrorMessage(
            getErrorMessage(err, 'There was a problem updating the forecaster')
          )
        );
        // Re-throw so the parent `.catch` or `.finally` sees it
        throw err;
      });
  }

  const onUpdateTestSettings = async () => {
    try {
      // wait until the settings are updated and the test is started
      await onUpdateSettings();
      await handleStartTest();
    } catch (error) {
      console.error('Failed to update and/or test forecaster:', error);
    }
  };

  const onCancelEdit = () => {
    setIsEditing(false);
    // Reset the configuration form to its initial values
    configFormikRef.current?.resetForm();
    // Reset the details form to its initial values
    detailsFormikRef.current?.resetForm();
  };

  // Update the ContentPanel actions to include Save/Cancel buttons when editing
  const getContentPanelActions = () => {
    return [
      <EuiSmallButton
        data-test-subj="editForecasterSettingsButton"
        onClick={onEditForecasterSettings}
        disabled={isEditing}
      >
        Edit
      </EuiSmallButton>,
    ];
  };

  const runOnceRunning = useRef(false);

  // Add this function to reset view state when forecaster starts running
  const resetChartState = () => {
    // Reset date range to default (last 3 hours)
    setDateRange(createRelativeDateRange(DEFAULT_TIME_RANGE.start, DEFAULT_TIME_RANGE.end));

    // Reset forecast point selection
    setForecastFrom(undefined);

    // debugging msg
    console.log('Chart state reset after forecaster operation');
  };

  const handleStartTest = async () => {
    try {
      runOnceRunning.current = true;
      // Wait for test forecaster to complete
      await dispatch(testForecaster(forecasterId, dataSourceId));
      // Wait for get forecaster to complete
      await dispatch(getForecaster(forecasterId, dataSourceId));

      core.notifications.toasts.addSuccess(
        `Successfully started test for ${forecaster?.name}`
      );

      // Reset chart state to show fresh data
      resetChartState();

      // Set runOnceRunning to false only after both operations complete
      runOnceRunning.current = false;
    } catch (err) {
      core.notifications.toasts.addDanger(
        prettifyErrorMessage(
          getErrorMessage(
            err,
            `There was a problem starting test for ${forecaster?.name}`
          )
        )
      );
      // Make sure to set runOnceRunning to false if there's an error
      runOnceRunning.current = false;
    }
  };

  const handleStartForecasting = async () => {
    try {
      await dispatch(startForecaster(forecasterId, dataSourceId));
      dispatch(getForecaster(forecasterId, dataSourceId));
      core.notifications.toasts.addSuccess(`Successfully started ${forecaster?.name}`);

      // Reset chart state to show fresh data
      resetChartState();
    } catch (error) {
      core.notifications.toasts.addDanger(
        prettifyErrorMessage(`Error starting forecaster: ${error}`)
      );
    }
  };

  const handleDeleteForecaster = async () => {
    try {
      await dispatch(deleteForecaster(forecasterId, dataSourceId));
      core.notifications.toasts.addSuccess(`Successfully deleted ${forecaster?.name}`);
    } catch (error) {
      core.notifications.toasts.addDanger(
        prettifyErrorMessage(`Error starting forecaster: ${error}`)
      );
    }
  };

  const handleCancelForecasting = async () => {
    try {
      await dispatch(stopForecaster(forecasterId, dataSourceId));
      dispatch(getForecaster(forecasterId, dataSourceId));
      core.notifications.toasts.addSuccess(`Successfully stopped ${forecaster?.name}`);
    } catch (error) {
      core.notifications.toasts.addDanger(
        prettifyErrorMessage(`Error stopping forecaster: ${error}`)
      );
    }
  };

  // When clicking trash icon, decide which modal to show
  const handleDeleteClick = async () => {
    // Show the real deletion modal
    setShowDeleteModal(true);
  };

  useEffect(() => {
    if (forecaster && forecaster.name) {
      if (dataSourceEnabled) {
        core.chrome.setBreadcrumbs([
          MDS_BREADCRUMBS.FORECASTING(dataSourceId),
          { text: forecaster.name },
        ]);
      } else {
        core.chrome.setBreadcrumbs([
          BREADCRUMBS.FORECASTING,
          { text: forecaster.name },
        ]);
      }
    }
  }, [forecaster]);

  // Add a ref to track the first load attempt
  const initialLoadAttempted = useRef(false);

  // Modified first useEffect for forecaster polling
  useEffect(() => {
    // If the forecaster is undefined and we haven't attempted to load it yet
    if (!forecaster && !initialLoadAttempted.current) {
      initialLoadAttempted.current = true;
      dispatch(getForecaster(forecasterId, dataSourceId));
    } else if (forecaster && forecaster.curState) { // Make sure curState exists
      // Normal polling logic for valid forecaster objects
      if (runOnceRunning.current || forecaster.curState === FORECASTER_STATE.INIT_TEST ||
        forecaster.curState === FORECASTER_STATE.INITIALIZING_FORECAST) {
        const pollingInterval = forecaster.curState === FORECASTER_STATE.INITIALIZING_FORECAST
          ? 60000  // 1 minute for INITIALIZING_FORECAST
          : 1000;  // 1 second for other states

        console.log(`Setting polling interval to ${pollingInterval}ms for state: ${forecaster.curState}`);

        const intervalId = setInterval(() => {
          dispatch(getForecaster(forecasterId, dataSourceId));
        }, pollingInterval);

        return () => {
          clearInterval(intervalId);
        };
      }
    }
  }, [forecaster, forecasterId, dataSourceId]);

  useEffect(() => {
    if (forecaster &&
      forecaster.curState && // Make sure curState exists
      isActiveState(forecaster.curState) &&
      forecaster.forecastInterval?.period?.interval > 0) {

      // trigger initial checkLatestResults before setting up recurring polling
      checkLatestResults();

      // Set up polling interval
      const intervalId = setInterval(() => {
        console.log('forecaster.forecastInterval.period.interval', forecaster.forecastInterval.period.interval);
        dispatch(getForecaster(forecasterId, dataSourceId));
        console.log('checkLatestResults');
        checkLatestResults();
      }, forecaster.forecastInterval.period.interval * 60000); // 60000ms = 1 minute

      // when forecaster changes, the useEffect will run again and the cleanup function from the previous effect run is called.
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [forecaster]); // Re-run effect if forecaster changes

  useEffect(() => {
    const getInitialClusters = async () => {
      await dispatch(getClustersInfo(dataSourceId));
    };
    getInitialClusters();
  }, [dataSourceId]);

  // Initial date range set to last 1 day
  const [dateRange, setDateRangeState] = useState<DateRange>(
    createRelativeDateRange(DEFAULT_TIME_RANGE.start, DEFAULT_TIME_RANGE.end)
  );

  // Create a ref that always points to the current dateRange
  const dateRangeRef = useRef<DateRange>(dateRange);

  // Create a ref for tracking if this is the initial load
  const initialFetchExecutedRef = useRef(false);

  // Create a wrapper around setDateRange to enforce boundaries
  const setDateRange = (newDateRange: DateRange) => {
    if (!forecaster) {
      // If forecaster isn't loaded yet, just set the state
      setDateRangeState(newDateRange);
      return;
    }

    // Calculate the earliest allowed time
    const windowDelay = forecaster.windowDelay?.period || { interval: 0, unit: UNITS.MINUTES };
    const windowDelayUnit = get(windowDelay, 'unit', UNITS.MINUTES);
    const windowDelayInterval = get(windowDelay, 'interval', 0);
    const windowDelayInMinutes = windowDelayInterval * toDuration(windowDelayUnit).asMinutes();

    // Calculate earliest allowed time based on lastUiBreakingChangeTime
    const lastUiBreakingTime = forecaster.lastUiBreakingChangeTime || 0;
    // FIXME: We intentionally limit data display to [earliestAllowedTime, now] because:
    // 1. Showing data before (current - history) would result in overlapping time series
    //    from different forecast runs
    // 2. Multiple overlapping series make it difficult for users to hover and inspect specific data points
    // 3. This keeps the visualization clean and ensures consistent data interaction
    const earliestAllowedTime = lastUiBreakingTime - (windowDelayInMinutes * 60 * 1000) - ((forecaster.history || 0) * forecaster.forecastInterval.period.interval * 60 * 1000);

    // Convert the new date range to epoch for comparison
    const { startDate: newStartEpoch } = convertToEpochRange(newDateRange);

    console.log('newStartEpoch', newStartEpoch, earliestAllowedTime, lastUiBreakingTime);
    // Check if the start date is earlier than allowed
    if (lastUiBreakingTime > 0 && newStartEpoch < earliestAllowedTime) {
      if (!initialFetchExecutedRef.current) {
        // For initial load, adjust the range to fit within boundaries
        initialFetchExecutedRef.current = true;

        // Create an adjusted date range
        const adjustedDateRange = {
          ...newDateRange,
          startDate: earliestAllowedTime,
          isRelative: false
        };

        // Set the adjusted date range
        setDateRangeState(adjustedDateRange);

        // Inform the user with a toast
        core.notifications.toasts.addInfo({
          title: 'Date range adjusted',
          text: 'The date range has been adjusted to the earliest available data.'
        });

      } else {
        // For user-initiated changes, show a warning and keep the current range
        core.notifications.toasts.addWarning({
          title: 'Date range limited',
          text: `Data is only available from ${moment(earliestAllowedTime).format('MMM DD, YYYY HH:mm')} onwards based on the forecaster's history window.`,
        });

        // Don't update the date range
        return;
      }
    } else {
      // If within bounds, update normally
      setDateRangeState(newDateRange);

      // No longer initial load
      if (!initialFetchExecutedRef.current) {
        initialFetchExecutedRef.current = true;
      }
    }
  };

  const isLoading = useSelector((state: AppState) => state.forecast.requesting);
  const [isResultsLoading, setIsResultsLoading] = useState(false);
  // Add a ref for immediate access in logic
  // If we only used the ref and not the state, the UI wouldn't update to reflect
  // loading status because refs don't trigger re-renders when they change.
  const isResultsLoadingRef = useRef(false);

  const [atomicForecastResults, setAtomicForecastResults] =
    useState<ForecastResult[]>();

  // Add this helper function to handle the retry with a delay
  const getResultsWithRetry = async (
    id: string,
    dataSourceId: string,
    requestParams: any,
    isTest: boolean,
    resultIndex: string,
    initialDelay = 1000, // Initial delay of 1 second
    maxRetries = 6 // Maximum 6 retries
  ) => {
    // Define a constant for the minimum number of new results to continue retrying
    // This represents the threshold for determining if data has stabilized
    const MIN_NEW_RESULTS_THRESHOLD = 3;
    
    let currentRetry = 0;
    let currentDelay = initialDelay;
    
    // First attempt
    let forecastResultResponse = await dispatch(
      getForecasterResults(
        id,
        dataSourceId,
        requestParams,
        isTest,
        resultIndex || ''
      )
    );

    // Extract the results
    let rawResults = get(forecastResultResponse, 'response.results', []) as ForecastResult[];
    
    // Add a variable to track the previous retry's result count
    let prevResultsCount = rawResults.length;
    
    // Modified retry condition:
    // 1. Continue if max retries not reached
    // 2. For the first retry (currentRetry === 0), always proceed regardless of results
    // 3. For subsequent retries, continue only if we're still getting significant new results
    //    (defined as at least MIN_NEW_RESULTS_THRESHOLD more results than the previous retry)
    while (isTest && currentRetry < maxRetries && 
          (currentRetry === 0 || (rawResults.length - prevResultsCount) >= MIN_NEW_RESULTS_THRESHOLD)) {
      currentRetry++;
      console.log(`Retry attempt ${currentRetry}/${maxRetries}, previous results: ${prevResultsCount}, current results: ${rawResults.length}, delta: ${rawResults.length - prevResultsCount}`);
      
      // Wait for the current delay
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      
      // Exponential backoff - double the delay for next attempt
      currentDelay *= 2;
      
      // Store the current results count before making a new request
      prevResultsCount = rawResults.length;
      
      // Retry the request
      forecastResultResponse = await dispatch(
        getForecasterResults(
          id,
          dataSourceId,
          requestParams,
          isTest,
          resultIndex || ''
        )
      );
      
      // Check if we got results
      rawResults = get(forecastResultResponse, 'response.results', []) as ForecastResult[];
      
      // Calculate how many new results we got in this retry
      const newResultsCount = rawResults.length - prevResultsCount;
      
      // Log the delta between retries
      console.log(`Retry ${currentRetry} completed: previous=${prevResultsCount}, current=${rawResults.length}, new results=${newResultsCount}`);
      
      // If we're not getting many new results (less than threshold), we can exit
      // This means the data has stabilized and further retries likely won't yield much
      if (currentRetry > 0 && newResultsCount < MIN_NEW_RESULTS_THRESHOLD) {
        console.log(`Exiting retry loop: only ${newResultsCount} new results found (< ${MIN_NEW_RESULTS_THRESHOLD}), data appears stable`);
        break;
      }
      
      // If this was the last attempt, log it
      if (currentRetry === maxRetries) {
        console.log(`All ${maxRetries} retry attempts completed. Final results count: ${rawResults.length}`);
      }
    }
    
    // Return the final results (either from first attempt or successful retry)
    return { results: rawResults };
  };


const [visualizationOptions, setVisualizationOptions] = useState<VisualizationOptions>({
  filterByOption: 'builtin',
  filterByValue: 'MIN_CONFIDENCE_INTERVAL_WIDTH',
  sortByOption: 'min_ci_width',
  thresholdValue: 0,
  thresholdDirection: '>',
  filterQuery: {},
  forecast_from: undefined,
  splitByOption: '',
  operatorValue: '',
  subaggregations: []
});

  /**
   * Consolidated data fetching function that references dateRange from the ref
   */
  const fetchForecasterResults = async (
    params: {
      source?: string; // Add source for tracking
      updatedOptions?: VisualizationOptions;
    }
  ) => {
    const { source = 'unknown', updatedOptions } = params;

    // If there's already a fetch in progress and this isn't a forced update, skip
    if (isResultsLoadingRef.current) {
      console.log(`Skipping redundant fetch from ${source} - another fetch is already in progress`);
      return;
    }

    // Set both the ref (for immediate checks) and the state (for UI updates)
    isResultsLoadingRef.current = true;
    setIsResultsLoading(true);

    console.log('fetchForecasterResults call', {
      source,
      callTime: new Date().toISOString()
    });

    try {
      if (!forecaster) {
        console.warn('No forecaster available');
        return;
      }

      // Get the current dateRange from the ref
      const currentDateRange = dateRangeRef.current;
      if (!currentDateRange) {
        console.warn('No date range available');
        return;
      }

      // Convert dateRange to epoch milliseconds
      const { startDate: startEpoch, endDate: endEpoch } = convertToEpochRange(currentDateRange);

      // Determine if we should fetch results.
      const active = isActiveState(forecaster?.curState);
      const testComplete = forecaster?.curState === FORECASTER_STATE.TEST_COMPLETE && forecaster?.taskId !== '';

      console.log('currentDateRange', currentDateRange, startEpoch, endEpoch, active, testComplete, forecaster?.curState);

      // Early return if conditions aren't met
      if (!active && !testComplete) {
        console.log('Skipping fetch: forecaster not active or test not complete');
        return;
      }

      // If HC is enabled => always re‐fetch top forecast entities
      let selectedEntityList: ForecastEntity[] | undefined = undefined;
      // isHCForecaster may be stale, so we need to check the categoryField again
      const hcEnabled = get(forecaster, 'categoryField', []).length > 0;

      
      const maxEntities = hcEnabled ? DEFAULT_ENTITIES_TO_SHOW : 0;

      // Fetch entities if needed
      if (hcEnabled) {
        // Use the provided options or fall back to current state
        const effectiveOptions = updatedOptions || visualizationOptions;
        if (effectiveOptions.forecast_from === undefined) {
          // Get the latest forecast run
          const latestRunResponse = await dispatch(searchResults(
            composeLatestForecastRunQuery(forecaster.taskId),
            forecaster.resultIndex || '',
            dataSourceId
          ));

          const maxPlotTime = parseLatestForecastRunResponse(latestRunResponse);
          if (maxPlotTime === undefined) {
            throw new Error('No forecast data end time found in response');
          }
          const params = buildVisualizationParams(forecaster, effectiveOptions, maxPlotTime, maxEntities);
          console.log('params', params);

          const topResultsResponse = await dispatch(
            getTopForecastResults(forecaster.id, dataSourceId, !active, params)
          );

          // Extract and set entities
          const entities = extractEntitiesFromResponse(topResultsResponse);
          if (entities.length === 0) {
            console.warn('No entities found in top results');
            setAtomicForecastResults([]);
            return;
          } else {
            selectedEntityList = entities;
          }

        } else {
          console.log(`using an old forecast_from ${visualizationOptions.forecast_from}, skip fetching results`);
          return;
        }
      }

      // Build the params based on forecaster state
      const requestParams = buildParamsForGetForecasterResultsWithDateRange(
        startEpoch,
        endEpoch,
        forecaster.enabledTime ?? 0,
        maxEntities,
        selectedEntityList
      );

      console.log('requestParams', requestParams);

      // Choose the correct id and test flag based on the forecaster state
      const id = active ? forecasterId : forecaster.taskId;
      const isTest = !active;

      // Note on Redux architecture:
      // The fetchForecasterResults function uses dispatch to update state through Redux:
      // - Dispatch sends actions to the Redux store, following the Flux architecture pattern
      // - This enables centralized state management across the application
      // - API calls are handled as async actions (thunks) that can dispatch multiple actions
      // - Components remain decoupled from data fetching logic
      // - State updates trigger re-renders in all connected components automatically
      // - We get predictable state transitions and improved debugging capabilities
      const { results: rawForecastResults } =
        await getResultsWithRetry(
          id,
          dataSourceId,
          requestParams,
          isTest,
          forecaster.resultIndex || ''
        );

      console.log('rawForecastResults', rawForecastResults);

      // Update state with the new forecast results
      setAtomicForecastResults(rawForecastResults);

    } catch (error) {
      console.error(`Failed to get atomic forecast results for ${forecasterId} from ${source}:`, error);
      setAtomicForecastResults([]);
    } finally {
      // Clear both the ref and the state
      isResultsLoadingRef.current = false;
      setIsResultsLoading(false);
    }
  };

  const [isHCForecaster, setIsHCForecaster] = useState<boolean>(false);

  // Add this reference outside the useEffect to track previous state
  const prevStateRef = useRef<FORECASTER_STATE | undefined>(undefined);

  // Modify the useEffect to check for specific state transition
  useEffect(() => {
    if (forecaster) {
      const currentState = forecaster.curState;
      const prevState = prevStateRef.current;

      // Check for the specific transition from INIT_TEST to TEST_COMPLETE
      const isCompletingTest =
        prevState === FORECASTER_STATE.INIT_TEST &&
        currentState === FORECASTER_STATE.TEST_COMPLETE &&
        forecaster.taskId;

      // Only fetch if we detect the specific transition
      if (isCompletingTest) {
        console.log('Test completed - fetching results');

        fetchForecasterResults({ source: "useEffect - test complete" });
      }

      // Update the previous state reference for the next render
      prevStateRef.current = currentState;
    }
  }, [forecaster?.curState]);

  useEffect(() => {
    // Only proceed if forecaster is loaded and curState is defined
    if (!forecaster || forecaster.curState === undefined) return;

    console.log('Forecaster available with state', forecaster.id, forecaster.curState);

    // If this is the first time we've seen the forecaster and we haven't fetched yet
    if (!initialFetchExecutedRef.current) {
      // Fetch results directly
      fetchForecasterResults({ source: "useEffect - first time" });

      // Mark that we've executed the initial fetch
      initialFetchExecutedRef.current = true;
    }
  }, [forecaster]);

  // Keep the dateRange effect, but make it only respond to out of range changes
  useEffect(() => {
    console.log('User changed dateRange', dateRange, initialFetchExecutedRef.current);

    // Skip if we haven't done the initial fetch yet
    if (!initialFetchExecutedRef.current) {
      // Just update the ref and return
      dateRangeRef.current = dateRange;
      return;
    }

    // Check if new dateRange is fully contained within the old dateRange
    const oldRange = dateRangeRef.current;
    const isWithinOldRange = (() => {
      // Convert any relative date strings to absolute timestamps
      const parseDate = (dateValue: string | number | moment.Moment) => {
        // If it's already a number, assume it's a timestamp in milliseconds
        if (typeof dateValue === 'number') {
          return moment(dateValue);
        }

        // Handle string formats including relative dates
        if (typeof dateValue === 'string') {
          if (dateValue.startsWith('now')) {
            return moment(dateValue); // Handles relative times like "now-4h"
          }
          return moment(dateValue); // Handles other date strings
        }

        // If it's already a moment object
        return dateValue;
      };

      // Get absolute timestamps for comparison
      const currentStartMs = parseDate(dateRange.startDate).valueOf();
      const currentEndMs = parseDate(dateRange.endDate).valueOf();
      const oldStartMs = parseDate(oldRange.startDate).valueOf();
      const oldEndMs = parseDate(oldRange.endDate).valueOf();

      // Now compare using the timestamps
      return currentStartMs >= oldStartMs && currentEndMs <= oldEndMs;
    })();

    if (isWithinOldRange) {
      console.log('New date range is within old range, skipping fetch');
      // Still update the ref
      dateRangeRef.current = dateRange;
      return;
    }

    // Now we know this is a user-initiated change that requires new data
    dateRangeRef.current = dateRange;
    if (forecaster) {
      console.log('Fetching new data for date range change');
      fetchForecasterResults({ source: "useEffect - date range change" });
    }
  }, [dateRange]);

  // FIXME: After testing, 120 was chosen as the optimal number of data points to display:
  // - Too few points (e.g., 72): Chart appears sparse with insufficient detail
  // - Too many points (e.g., 1024+): Chart becomes dense and makes tooltip interaction difficult
  // - 540 points: Provides good balance between detail and usability
  const TARGET_DISPLAY_POINTS = 540;

  // Build "maxPoints" for the largest window
  const maxPoints = useMemo(() => {
    const horizon = forecaster?.horizon ?? 0;
    if (horizon > 0) {
      const multiplier = Math.ceil(TARGET_DISPLAY_POINTS / horizon);
      return horizon * multiplier;
    }
    return TARGET_DISPLAY_POINTS;
  }, [forecaster?.horizon]);

  // ran during real state. If users' window delay is too long and we use a small relative date range,
  // the result page might not show anything.
  const checkLatestResults = async () => {
    let windowDelayInMinutes = 0;
    if (forecaster.windowDelay !== undefined && forecaster.forecastInterval.period.interval > 0) {
      const windowDelay = forecaster.windowDelay.period;
      const windowDelayUnit = get(windowDelay, 'unit', UNITS.MINUTES);
      // current time minus window delay
      const windowDelayInterval = get(windowDelay, 'interval', 0);
      windowDelayInMinutes =
        windowDelayInterval * toDuration(windowDelayUnit).asMinutes();

      // The query in this function uses data start/end time. So we should consider window delay
      let adjustedCurrentTime = moment().subtract(
        windowDelayInMinutes,
        'minutes'
      );

      const endDate = adjustedCurrentTime.valueOf();

      const intervalInMilliseconds = forecaster.forecastInterval.period.interval * 60000;
      const historyPeriod = intervalInMilliseconds * (forecaster?.history ?? DEFAULT_OUTPUT_AFTER + forecaster?.shingleSize);
      const earliestAllowedTime = (forecaster.lastUiBreakingChangeTime ?? forecaster.enabledTime ?? 0) - historyPeriod;
      const latestWindowStart = adjustedCurrentTime.valueOf() - (intervalInMilliseconds * maxPoints);

      const startDate = Math.max(
        latestWindowStart,
        earliestAllowedTime
      );

      if (startDate < endDate) {
        // Convert the dates to epoch timestamps
        fetchForecasterResults({ source: "useEffect - check latest results" });
      }
    };
  }

  const onTabClick = (id) => {
    setSelectedTabId(id);
  };

  

  

  // If the detector is returning undefined estimated minutes left, then it
  // is still performing the cold start.
  const isPerformingColdStart =
    forecaster &&
    (forecaster.curState === FORECASTER_STATE.INIT_TEST || forecaster.curState === FORECASTER_STATE.INITIALIZING_FORECAST) &&
    forecaster.initProgress &&
    forecaster.initProgress.estimatedMinutesLeft === undefined;

  const isForecasterRunning =
    forecaster && forecaster.curState === FORECASTER_STATE.RUNNING;

  const isForecasterPaused =
    forecaster &&
    (forecaster.curState === FORECASTER_STATE.INACTIVE_STOPPED || forecaster.curState === FORECASTER_STATE.INACTIVE_NOT_STARTED) &&
    !forecaster.enabled &&
    forecaster.enabledTime &&
    forecaster.disabledTime;

  const isForecasterUpdated =
    // @ts-ignore
    isForecasterPaused && forecaster.lastUpdateTime > forecaster.disabledTime;

  const isForecasterInitializing =
    forecaster && (forecaster.curState === FORECASTER_STATE.INIT_TEST || forecaster.curState === FORECASTER_STATE.INITIALIZING_FORECAST);

  const isForecasterMissingData = forecaster?.curState === FORECASTER_STATE.AWAITING_DATA_TO_INIT || forecaster?.curState === FORECASTER_STATE.AWAITING_DATA_TO_RESTART;

  const initializationInfo = isForecasterMissingData
    ? getForecasterInitializationInfo(forecaster)
    : undefined;

  const isInitOvertime = forecaster?.curState === FORECASTER_STATE.AWAITING_DATA_TO_INIT;
  const initDetails = get(initializationInfo, INIT_DETAILS_FIELD, {});
  const initErrorMessage = get(initDetails, INIT_ERROR_MESSAGE_FIELD, '');
  const initActionItem = get(initDetails, INIT_ACTION_ITEM_FIELD, '');

  const isForecasterFailed =
    forecaster &&
    (forecaster.curState === FORECASTER_STATE.INIT_ERROR ||
      forecaster.curState === FORECASTER_STATE.FORECAST_FAILURE ||
      forecaster.curState === FORECASTER_STATE.INIT_TEST_FAILED);

  const isInitializingNormally =
    isForecasterInitializing &&
    isInitOvertime != undefined &&
    !isInitOvertime &&
    isForecasterMissingData != undefined &&
    !isForecasterMissingData;

  const getCalloutTitle = () => {
    if (isForecasterUpdated) {
      return 'The forecaster configuration has changed since it was last stopped.';
    }
    if (isForecasterMissingData) {
      return `Data is not being ingested correctly for feature: ${forecaster?.featureAttributes[0].featureName}. So, forecast result is missing during this time.`;
    }
    if (isPerformingColdStart) {
      const history = get(forecaster, 'history', 0);
      const shingleSize = get(forecaster, 'shingleSize', 8);
      const consecutiveIntervals = history > 0 ? history : (DEFAULT_OUTPUT_AFTER + shingleSize);

      return (
        <div>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiLoadingSpinner
              size="l"
              style={{
                marginLeft: '4px',
                marginRight: '8px',
                marginBottom: '8px',
              }}
            />
            <EuiText size="s">
              <p>
                Initializing the forecaster with historical data. This process takes approximately 1–2 minutes if your data covers each of the last{' '}
                {consecutiveIntervals}{' '}
                consecutive intervals.
              </p>
            </EuiText>
          </EuiFlexGroup>
        </div>
      );
    }
    if (isInitializingNormally) {
      if (forecaster?.curState === FORECASTER_STATE.INIT_TEST) {
        return 'The test is initializing.';
      } else {
        return 'The forecaster is being initialized based on the latest configuration changes.';
      }
    }
    if (isInitOvertime) {
      return `Forecaster initialization is not complete because ${initErrorMessage}.`;
    }
    if (isForecasterFailed) {
      return `The forecaster is not initialized${
        //@ts-ignore
        forecaster.stateError ? ` because ${forecaster.stateError}` : ''
        }.`;
    }
  };
  const getCalloutColor = () => {
    if (
      isForecasterFailed
    ) {
      return 'danger';
    }
    if (
      isInitOvertime ||
      isForecasterUpdated
    ) {
      return 'warning';
    }
    if (isInitializingNormally) {
      return 'primary';
    }
  };

  const getInitProgressMessage = () => {
    if (!forecaster || !isForecasterInitializing) return '';

    return `Initialization may take 1–2 minutes.${forecaster.curState !== FORECASTER_STATE.INIT_TEST
      ? ' It may take longer if your data stream is not continuous.'
      : ''
    }`;    
  };

  const getCalloutContent = () => {
    return isForecasterUpdated ? (
      <p>
        Restart the forecaster to see accurate forecast based on configuration
        changes.
      </p>
    ) : isForecasterMissingData ? (
      <p>
        {getInitProgressMessage()}
        {get(
          initDetails,
          INIT_ACTION_ITEM_FIELD,
          ''
        )}
      </p>
    ) : isPerformingColdStart ? null : isInitializingNormally ? (
      <p>
        {getInitProgressMessage()}
        {forecaster?.curState !== FORECASTER_STATE.INIT_TEST &&
          'After the initialization is complete, you will see the forecast results based on your latest configuration changes.'
        }
      </p>
    ) : isInitOvertime ? (
      <p>{`${getInitProgressMessage()} ${initActionItem}`}</p>
    ) : (
      // forecaster has failure
      <p>{`Fix the issue or report bugs to the support team.`}</p>
    );
  };

  // Jump to top of page on first load
  useEffect(() => {
    scroll(0, 0);
  }, []);

  // This variable indicates if validate API declared forecaster settings as valid
  const [validForecasterSettings, setValidForecasterSettings] =
    useState<boolean>(false);
  // This variable indicates if validate API declared model configs as valid
  const [validModelConfigurations, setValidModelConfigurations] =
    useState<boolean>(false);
  // This variable indicates if validate API returned an exception and hence no callout regarding
  // specifically forecaster settings or model configs
  const [validationError, setValidationError] = useState<boolean>(false);
  const [settingsResponse, setSettingsResponse] =
    useState<ValidationSettingResponse>({} as ValidationSettingResponse);
  const [featureResponse, setFeatureResponse] =
    useState<ValidationModelResponse>({} as ValidationModelResponse);
  const [validationLoading, setValidationLoading] = useState<boolean>(false);

  // This effect runs whenever forecaster.id, dataSourceId, or isEditing changes.
  // It calls the validation API and displays appropriate callouts.
  // This will either return an empty response
  // meaning validation has passed and succesful callout will display or validation has failed
  // and callouts displaying what the issue is will be displayed instead.
  useEffect(() => {
    if (forecaster?.id) {  // Only validate if we have a valid forecaster
      // Use forecaster.id instead of name for validation since this is an existing forecaster
      // We keep the name field to satisfy validation requirements but use ID to avoid duplicate name errors
      const validationForecaster = {
        ...forecaster,
        name: forecaster.id
      };
      setValidationLoading(true);
      dispatch(
        validateForecaster(validationForecaster, 'model', dataSourceId)
      )
        .then((resp: any) => {
          console.log('validateForecaster resp', resp);
          if (isEmpty(Object.keys(resp.response))) {
            setValidForecasterSettings(true);
            setValidModelConfigurations(true);
          } else {
            if (
              resp.response.hasOwnProperty('forecaster') ||
              resp.response.hasOwnProperty('model')
            ) {
              const validationType = Object.keys(resp.response)[0];
              const issueType = Object.keys(resp.response[validationType])[0];
              if (
                resp.response[validationType][issueType].hasOwnProperty('message')
              ) {
                const validationMessage =
                  resp.response[validationType][issueType].message;
                const forecasterSettingIssue: ValidationSettingResponse = {
                  issueType: issueType,
                  message: validationMessage,
                  validationType: validationType,
                };

                // These issue types only come up during non-blocker validation after blocker validation has passed
                // This means that the configurations don't have any blocking issues but request either timed out during
                // non blocking validation or due to an issue in core. This means we aren't able to provide any recommendation
                // and user has no way of re-trying except re-rendering page which isn't straightforward. At the moment we will
                // hide these failures instead of explaining both levels of validation being done in the backend.
                if (issueType == 'aggregation' || issueType == 'timeout') {
                  setValidForecasterSettings(true);
                  setValidModelConfigurations(true);
                  return;
                }

                switch (issueType) {
                  // need to handle model validation issue case seperatly
                  case VALIDATION_ISSUE_TYPES.FEATURE_ATTRIBUTES:
                  case VALIDATION_ISSUE_TYPES.CATEGORY:
                  case VALIDATION_ISSUE_TYPES.SHINGLE_SIZE_FIELD:
                    const modelResp = resp.response[validationType][
                      issueType
                    ] as ValidationModelResponse;
                    modelResp.validationType = validationType;
                    setFeatureResponse(modelResp);
                    setValidForecasterSettings(true);
                    setValidModelConfigurations(false);
                    break;
                  // this includes all other forecaster setting issues that don't need
                  // anything else added to their message
                  default:
                    setValidModelConfigurations(true);
                    setValidForecasterSettings(false);
                    setSettingsResponse(forecasterSettingIssue);
                }
              }
            }
          }
        })
        .catch((err: any) => {
          setValidationError(true);
          core.notifications.toasts.addDanger(
            prettifyErrorMessage(
              getErrorMessage(err, 'There was a problem validating the forecaster')
            )
          );
        }).finally(() => {
          // Always reset the loading flag
          setValidationLoading(false);
        });
    }
  }, [forecaster?.id, dataSourceId, isEditing]);

  const getValidationCallout = () => {
    //When validation response is loading then displaying loading spinner, don't display
    // after clicking on "create forecaster" button as isLoading will be true from that request
    if (validationLoading) {
      return (
        <EuiCallOut
          title={
            <div>
              <EuiFlexGroup direction="row" gutterSize="xs">
                <EuiLoadingSpinner size="l" style={{ marginRight: '12px' }} />
                <EuiText size="s">
                  <p>Validating forecaster configurations</p>
                </EuiText>
              </EuiFlexGroup>
            </div>
          }
          style={{ marginBottom: '10px' }}
          size="s"
          color="primary"
        />
      );
    }
    // Callouts only displayed based on response content from validation API (empty body or response issue body).
    // validationError refers to if there was an exception from validation API
    // such as a security exception or error establishing network connection on request.
    // This means no callout will be displayed since validation wasn't able to say if settings are valid or not.
    if (!validationError) {
      if (validForecasterSettings && validModelConfigurations) {
        return (
          <EuiCallOut
            title="Forecaster settings are validated"
            color="success"
            iconType="check"
            size="s"
            style={{ marginBottom: '10px' }}
          ></EuiCallOut>
        );
      } else if (
        !validForecasterSettings &&
        settingsResponse.message
      ) {
        return (
          <EuiCallOut
            title="Issues found in the forecaster settings"
            color="danger"
            iconType="alert"
            size="s"
            style={{ marginBottom: '10px' }}
          >
            <ul>
              <li>{settingsResponse.message}</li>
            </ul>
          </EuiCallOut>
        );
      } else if (
        !validModelConfigurations &&
        featureResponse.message
      ) {
        return (
          <EuiCallOut
            title="We identified some areas that might improve your model"
            color="warning"
            iconType="iInCircle"
            size="s"
            style={{ marginBottom: '10px' }}
          >
            {JSON.stringify(featureResponse.message).replace(/\"/g, '')}
          </EuiCallOut>
        );
      } else {
        return null;
      }
    } else {
      return null;
    }
  };

  const handleStopForecasterJob = async (forecasterId: string, forecasterName: string) => {
    try {
      await dispatch(stopForecaster(forecasterId, dataSourceId));
      core.notifications.toasts.addSuccess(`Successfully stopped ${forecasterName}`);
    } catch (error) {
      core.notifications.toasts.addDanger(
        prettifyErrorMessage(`Error stopping forecaster: ${error}`)
      );
    }
  };

  const handleValidateName = async (forecasterName: string) => {
    return validateForecasterNameTemplate(
      forecasterName,
      dispatch,
      dataSourceId,
      isEditing,
      forecaster?.name
    );
  };

  const indexDataTypes = useSelector(
    (state: AppState) => state.opensearch.dataTypes
  );

  // When forecaster is loaded: get any category fields (if applicable) and
  // get all index mappings based on forecaster's selected index
  useEffect(() => {
    if (forecaster) {
      console.log('setIsHCForecaster from forecaster check', Date.now());
      if (get(forecaster, 'categoryField', []).length > 0) {
        setIsHCForecaster(true);
      } else {
        setIsHCForecaster(false);
      }
    }

    if (forecaster?.indices) {
      dispatch(getMappings(forecaster.indices, dataSourceId));
    }
  }, [forecaster]);

  const opensearchState = useSelector((state: AppState) => state.opensearch);

  // Define tab content
  const tabs = [
    {
      id: 'configuration',
      name: 'Configuration',
      content: (
        <Formik
          initialValues={
            configureToFormik(forecaster, opensearchState.clusters)
          }
          enableReinitialize={true}
          onSubmit={() => { }}
          validateOnMount={false}
          innerRef={configFormikRef}
        >
          {(formikProps) => (
            <Fragment>
              <EuiSpacer size="m" />
              {getValidationCallout()}
              <EuiSpacer size="m" />

              <ContentPanel
                title="Configuration"
                titleDataTestSubj="forecasterSettingsHeader"
                titleSize="s"
                panelStyles={{ margin: '0px' }}
                actions={getContentPanelActions()}
              >
                {isStopEditModalOpen ? (
                  <StopForecastToEditModal
                    onCancel={() => setIsStopEditModalOpen(false)}
                    onStopAndEdit={() => {
                      setIsStopEditModalOpen(false);
                      handleStopForecasterJob(forecasterId, forecaster?.name);
                      setIsEditing(true);
                    }}
                    curState={forecaster?.curState}
                  />
                ) : null}
                <EuiDescribedFormGroup
                  title={
                    <EuiTitle size="s">
                      <h3>Data Source</h3>
                    </EuiTitle>
                  }
                  description="Select the clusters and focus the relevant data with filters."

                  // Pin left column at 300px (no auto growing).
                  descriptionFlexItemProps={{ style: { flex: '0 0 400px' } }}

                  // Let the field column expand to fill remaining space.
                  // flex: 1 0 auto - Item can grow to fill space (1), won't shrink below its size (0), 
                  // and starts at its content width (auto)
                  // We want to make custom index section wider as smaller font makes it harder to read.
                  // To be consistent, all of the other EuiDescribedFormGroup have the same layout.
                  fieldFlexItemProps={{ style: { flex: '1 0 auto' } }}
                >
                  <DataSource
                    formikProps={formikProps}
                    isEdit={true}
                    isEditable={isEditing}
                  />
                </EuiDescribedFormGroup>

                <EuiSpacer size="l" />

                <EuiDescribedFormGroup
                  title={
                    <EuiTitle size="s">
                      <h3>Indicator</h3>
                    </EuiTitle>
                  }
                  description="Define the variable to use in your prediction."
                  // Pin left column at 300px (no auto growing).
                  descriptionFlexItemProps={{ style: { flex: '0 0 400px' } }}

                  // Let the field column expand to fill remaining space.
                  fieldFlexItemProps={{ style: { flex: '1 0 auto' } }}
                >
                  <Features formikProps={formikProps} isEditable={isEditing} />
                  <EuiSpacer />
                  <ForecastCategoryField
                    isEdit={isEditing}
                    isHCForecaster={isHCForecaster}
                    categoryFieldOptions={getCategoryFields(indexDataTypes)}
                    setIsHCForecaster={setIsHCForecaster}
                    isLoading={isLoading}
                    formikProps={formikProps}
                    isEditable={isEditing}
                  />
                </EuiDescribedFormGroup>

                <EuiSpacer size="l" />

                <EuiDescribedFormGroup
                  title={
                    <EuiTitle size="s">
                      <h3>Core Model Parameters</h3>
                    </EuiTitle>
                  }
                  description="Define how often the forecast will generate the next value based on historical data and how far to
                      forecast into the future."
                  // Pin left column at 300px (no auto growing).
                  descriptionFlexItemProps={{ style: { flex: '0 0 400px' } }}

                  // Let the field column expand to fill remaining space.
                  fieldFlexItemProps={{ style: { flex: '1 0 auto' } }}
                >
                  <Settings isEditable={isEditing} />
                </EuiDescribedFormGroup>

                <EuiSpacer size="l" />
                <EuiDescribedFormGroup
                  title={
                    <EuiTitle size="s">
                      <h3>Advanced Model Parameters</h3>
                    </EuiTitle>
                  }
                  description="Fine-tune your forecasting model's behavior with advanced parameters to optimize performance for your specific use case."
                  // Pin left column at 300px (no auto growing).
                  descriptionFlexItemProps={{ style: { flex: '0 0 400px' } }}

                  // Let the field column expand to fill remaining space.
                  fieldFlexItemProps={{ style: { flex: '1 0 auto' } }}
                >
                  <AdvancedSettings isEditable={isEditing} />
                </EuiDescribedFormGroup>
              </ContentPanel>
            </Fragment>

          )}
        </Formik>)
    },
    {
      id: 'details',
      name: 'Details',
      content: (
        <Formik
          initialValues={
            detailsToFormik(forecaster)
          }
          enableReinitialize={true}
          onSubmit={() => { }}
          validateOnMount={false}
          innerRef={detailsFormikRef}
        >
          {(formikProps) => (
            <Fragment>
              <ContentPanel
                title="Details"
                titleDataTestSubj="forecasterDetailsHeader"
                titleSize="s"
                panelStyles={{ margin: '0px' }}
                actions={getContentPanelActions()}
              >
                {isStopEditModalOpen ? (
                  <StopForecastToEditModal
                    onCancel={() => setIsStopEditModalOpen(false)}
                    onStopAndEdit={() => {
                      setIsStopEditModalOpen(false);
                      handleStopForecasterJob(forecasterId, forecaster?.name);
                      setIsEditing(true);
                    }}
                    curState={forecaster?.curState}
                  />
                ) : null}
                <EuiDescribedFormGroup
                  title={
                    <EuiTitle size="s">
                      <h3>Details</h3>
                    </EuiTitle>
                  }
                  // Pin left column at 300px (no auto growing).
                  descriptionFlexItemProps={{ style: { flex: '0 0 400px' } }}

                  // Let the field column expand to fill remaining space.
                  fieldFlexItemProps={{ style: { flex: '1 0 auto' } }}
                >
                  <NameAndDescription
                    onValidateForecasterName={handleValidateName}
                    omitTitle={true}
                    isEditable={isEditing}
                  />
                </EuiDescribedFormGroup>
                <EuiSpacer size="l" />

                <EuiDescribedFormGroup
                  title={
                    <EuiTitle size="s">
                      <h3>Storage</h3>
                    </EuiTitle>
                  }
                  description={
                    //<div style={{ maxWidth: '400px', marginRight: 0 }}>
                    // style={{ marginRight: 0 }}
                    <EuiText size="s">
                      <p>Defined way to store and manage forecasting results:</p>
                      <ul>
                        <li>
                          <strong>Default index</strong>: The forecasting results are retained
                          automatically for at least 30 days.
                        </li>
                        <li>
                          <strong>Custom result index</strong>: You can manage the index and
                          retention period.
                        </li>
                      </ul>
                    </EuiText>
                    // </div>
                  }
                  // Pin left column at 300px (no auto growing).
                  descriptionFlexItemProps={{ style: { flex: '0 0 400px' } }}

                  // Let the field column expand to fill remaining space.
                  fieldFlexItemProps={{ style: { flex: '1 0 auto' } }}
                >
                  {/* 
                    Note: StorageSettings appears smaller than usual as it's nested inside EuiDescribedFormGroup.
                    We can't use fullWidth prop as it would create an undesirable large gap between description 
                    and fields. While negative marginLeft could fix this, it's not ideal for maintenance as we'd 
                    need to ensure consistent styling across all EuiDescribedFormGroup components.
                  */}
                  <StorageSettings
                    formikProps={formikProps}
                    isEditable={isEditing}
                    omitTitle={true}
                  />
                </EuiDescribedFormGroup>
              </ContentPanel>
            </Fragment>

          )}
        </Formik>)
    },
  ];

  // Add this with your other state declarations
  const [forecastFrom, setForecastFrom] = useState<number | undefined>(undefined);

  return (
    <EuiPage paddingSize="m">
      <EuiPageBody panelled={false}>
        <ForecasterControls
          forecaster={forecaster}
          dataSourceId={dataSourceId}
          setActionMenu={props.setActionMenu}
          handleDeleteClick={handleDeleteClick}
          handleStartTest={handleStartTest}
          handleCancelForecasting={handleCancelForecasting}
          handleStartForecasting={handleStartForecasting}
          runOnceRunning={runOnceRunning}
        />

        {/* Actual Delete Confirmation Modal (with "type delete" check) */}
        {showDeleteModal && (
          <ConfirmDeleteForecastersModal
            forecasterId={forecasterId || ''}
            forecasterName={forecaster?.name || ''}
            forecasterState={forecaster?.curState || FORECASTER_STATE.INACTIVE_STOPPED}
            onHide={() => setShowDeleteModal(false)}
            onConfirm={() => {
              // Called after delete is done
              // Possibly refresh page or navigate away
              props.history.push(constructHrefWithDataSourceId('/forecasters', dataSourceId, false));
            }}
            onStopForecasters={async () => {
              await handleCancelForecasting();
            }}
            onDeleteForecasters={async () => {
              await handleDeleteForecaster();
            }}
            // a parameter for list page we don't care about
            // we have to include it because the list page is using the same modal
            isListLoading={false}
          />
        )}

        {/* Forecast Metadata (key-value pairs) */}
        <EuiSpacer size="m" />

        {isForecasterUpdated ||
          isForecasterMissingData ||
          isInitializingNormally ||
          isInitOvertime ||
          isForecasterFailed ? (
          <EuiCallOut
            title={getCalloutTitle()}
            color={getCalloutColor()}
            iconType={
              isPerformingColdStart
                ? ''
                : isInitializingNormally
                  ? 'iInCircle'
                  : 'alert'
            }
            style={{ marginBottom: '20px' }}
          >
            {getCalloutContent()}
            {/* Only show progress bar if the init state is for realTime and the initProgress is not null */}
            {/* We don't have initProgress for runOnce */}
            {isPerformingColdStart ? null : forecaster?.curState === FORECASTER_STATE.INITIALIZING_FORECAST &&
              forecaster?.initProgress
              ? (
                <div>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem
                      style={{ maxWidth: '20px', marginRight: '5px' }}
                    >
                      <EuiText size="s">
                        {
                          //@ts-ignore
                          forecaster?.initProgress.percentageStr
                        }
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiProgress
                        //@ts-ignore
                        value={forecaster?.initProgress.percentageStr.replace(
                          '%',
                          ''
                        )}
                        max={100}
                        color="primary"
                        size="xs"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="l" />
                </div>
              ) : null}
          </EuiCallOut>
        ) : null}

        <EuiPanel
          style={{ padding: '20px' }}
        >
          <EuiFlexGrid columns={0} gutterSize="l" style={{ border: 'none' }}>
            <EuiFlexItem data-test-subj="forecasterDescriptionCell">
              <ConfigCell
                title="Description"
                description={forecaster?.description || '-'}
              />
            </EuiFlexItem>
            <EuiFlexItem data-test-subj="forecasterIdCell">
              <ConfigCell
                title="ID"
                description={forecaster?.id || '-'}
              />
            </EuiFlexItem>
            {/* FIXME: There is no created time recorded in the backend */}
            <EuiFlexItem>
              <ConfigCell
                title="Last Updated"
                description={toStringConfigCell(
                  forecaster?.lastUpdateTime || '-'
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <ConfigCell
                title="Storage"
                description={forecaster?.resultIndex || 'Default index'}
              />
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiPanel>

        <EuiSpacer size="l" />

        {/* 
          Rendering ForecastChart with unidirectional data flow pattern:
          - Data flows down: We pass data as props (isLoading, forecaster, forecasterResults)
          - Actions flow up: We provide a callback (onDataRequest) for the child to request data changes
          - The child component remains pure and doesn't own state related to data fetching
          - We avoid circular dependencies and prop drilling
        */}
        <ForecastChart
          isLoading={isLoading}
          isResultsLoading={isResultsLoading}
          forecaster={forecaster}
          dateRange={dateRange}
          setDateRange={setDateRange}
          maxPoints={maxPoints}
          forecastResults={atomicForecastResults}
          dataSourceId={dataSourceId}
          onDataRequest={() => {
            fetchForecasterResults({
              source: "onDataRequest"
            });
          }}
          forecastFrom={forecastFrom}
          setForecastFrom={setForecastFrom}
          visualizationOptions={visualizationOptions}
          onUpdateVisualizationOptions={(options) => {
            setVisualizationOptions(options);
            // fetch new results immediately here
            fetchForecasterResults({
              source: "onUpdateVisualizationOptions",
              updatedOptions: options
            });
          }}
        />

        <EuiSpacer size="l" />

        {/* Tabs: Configuration / Details */}
        <EuiTabs size='s'>
          {tabs.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={tab.id === selectedTabId}
              onClick={() => onTabClick(tab.id)}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
        {/* Render all tabs but hide the inactive ones */}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{ display: tab.id === selectedTabId ? 'block' : 'none' }}
          >
            {tab.content}
          </div>
        ))}

        {/* Bottom Bar for actions */}
        {isEditing && (
          <EuiBottomBar paddingSize="m">
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiSmallButtonEmpty
                  data-test-subj="cancelEditForecasterSettingsButton"
                  onClick={onCancelEdit}
                  iconSide='left'
                  iconType="cross"
                >
                  Cancel
                </EuiSmallButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSmallButton
                  data-test-subj="updateForecasterSettingsButton"
                  onClick={onUpdateSettings}
                >
                  Update
                </EuiSmallButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSmallButton
                  fill
                  data-test-subj="updateTestForecasterSettingsButton"
                  onClick={onUpdateTestSettings}
                >
                  Update and test
                </EuiSmallButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiBottomBar>
        )}
      </EuiPageBody>
    </EuiPage>
  );
};