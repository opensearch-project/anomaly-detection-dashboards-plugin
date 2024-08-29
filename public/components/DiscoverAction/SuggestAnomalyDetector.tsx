/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Fragment } from 'react';
import {
    EuiFlyoutHeader,
    EuiFlyoutBody,
    EuiFlyoutFooter,
    EuiTitle,
    EuiButton,
    EuiSpacer,
    EuiText,
    EuiFormRow,
    EuiFieldText,
    EuiCheckbox,
    EuiFlexItem,
    EuiFlexGroup,
    EuiFieldNumber,
    EuiCallOut,
    EuiButtonEmpty,
    EuiPanel,
    EuiComboBox,
} from '@elastic/eui';
import '../FeatureAnywhereContextMenu/CreateAnomalyDetector/styles.scss';
import { useDispatch } from 'react-redux';
import { isEmpty, get } from 'lodash';
import {
    Field,
    FieldArray,
    FieldArrayRenderProps,
    FieldProps,
    Formik,
} from 'formik';
import {
    createDetector,
    getDetectorCount,
    matchDetector,
    startDetector,
} from '../../redux/reducers/ad';
import {
    getError,
    getErrorMessage,
    isInvalid,
    validateCategoryField,
    validateDetectorName,
    validateNonNegativeInteger,
    validatePositiveInteger,
} from '../../utils/utils';
import {
    CUSTOM_AD_RESULT_INDEX_PREFIX,
    MAX_DETECTORS,
} from '../../../server/utils/constants';
import {
    focusOnFirstWrongFeature,
    initialFeatureValue,
    validateFeatures,
} from '../../pages/ConfigureModel/utils/helpers';
import { formikToDetector } from '../../pages/ReviewAndCreate/utils/helpers';
import { FormattedFormRow } from '../FormattedFormRow/FormattedFormRow';
import { FeatureAccordion } from '../../pages/ConfigureModel/components/FeatureAccordion';
import { AD_DOCS_LINK, DEFAULT_SHINGLE_SIZE, MAX_FEATURE_NUM, PLUGIN_NAME } from '../../utils/constants';
import { getNotifications } from '../../services';
import { prettifyErrorMessage } from '../../../server/utils/helpers';
import EnhancedAccordion from '../FeatureAnywhereContextMenu/EnhancedAccordion';
import MinimalAccordion from '../FeatureAnywhereContextMenu/MinimalAccordion';
import { DataFilterList } from '../../pages/DefineDetector/components/DataFilterList/DataFilterList';
import { generateParameters } from '../../redux/reducers/assistant';
import { FEATURE_TYPE } from '../../models/interfaces';
import { FeaturesFormikValues } from '../../pages/ConfigureModel/models/interfaces';
import { DiscoverActionContext } from '../../../../../src/plugins/data_explorer/public/types';
import { getMappings } from '../../redux/reducers/opensearch';
import { mountReactNode } from '../../../../../src/core/public/utils';
import { formikToDetectorName } from '../FeatureAnywhereContextMenu/CreateAnomalyDetector/helpers';

export interface GeneratedParameters {
    categoryField: string;
    features: FeaturesFormikValues[];
    dateFields: string[];
}

function GenerateAnomalyDetector({
    closeFlyout,
    context,
}: {
    closeFlyout: any;
    context: DiscoverActionContext;
}) {
    const dispatch = useDispatch();
    const notifications = getNotifications();
    const indexPatternId = context.indexPattern?.id;
    const indexPatternName = context.indexPattern?.title;
    if (!indexPatternId || !indexPatternName) {
        notifications.toasts.addDanger(
            'Cannot extract index pattern from the context'
        );
        return <></>;
    }

    const dataSourceId = context.indexPattern?.dataSourceRef?.id;
    const timeFieldFromIndexPattern = context.indexPattern?.timeFieldName;
    const fieldsFromContext = context.indexPattern?.fields || [];
    const [categoricalFields, dateFields] = fieldsFromContext.reduce(
        ([cFields, dFields], indexPatternField) => {
            const esType = indexPatternField.spec.esTypes?.[0];
            const name = indexPatternField.spec.name;
            if (esType === 'keyword' || esType === 'ip') {
                cFields.push(name);
            } else if (esType === 'date') {
                dFields.push(name);
            }
            return [cFields, dFields];
        },
        [[], []] as [string[], string[]]
    ) || [[], []];

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [buttonName, setButtonName] = useState<string>(
        'Generating parameters...'
    );
    const [categoryFieldEnabled, setCategoryFieldEnabled] =
        useState<boolean>(false);

    const [accordionsOpen, setAccordionsOpen] = useState<Record<string, boolean>>({ modelFeatures: true });
    const [intervalValue, setIntervalalue] = useState(10);
    const [delayValue, setDelayValue] = useState(1);
    const [enabled, setEnabled] = useState<boolean>(false);
    const [detectorName, setDetectorName] = useState(
        formikToDetectorName(indexPatternName.substring(0, 40))
    );

    // let LLM to generate parameters for creating anomaly detector
    async function getParameters() {
        try {
            const result = await dispatch(
                generateParameters(indexPatternName!, dataSourceId)
            );
            const rawGeneratedParameters = get(result, 'generatedParameters');
            if (!rawGeneratedParameters) {
                throw new Error('Cannot get generated parameters!');
            }

            const generatedParameters = formatGeneratedParameters(rawGeneratedParameters);
            if (generatedParameters.features.length == 0) {
                throw new Error('Generated parameters have empty model features!');
            }

            initialDetectorValue.featureList = generatedParameters.features;
            initialDetectorValue.categoryFieldEnabled = !!generatedParameters.categoryField;
            initialDetectorValue.categoryField = initialDetectorValue.categoryFieldEnabled ? [generatedParameters.categoryField] : [];

            setIsLoading(false);
            setButtonName('Create detector');
            setCategoryFieldEnabled(!!generatedParameters.categoryField);
        } catch (error) {
            notifications.toasts.addDanger(
                'Generate parameters for creating anomaly detector failed, reason: ' + error
            );
        }
    }

    const formatGeneratedParameters = function (rawGeneratedParameters: any): GeneratedParameters {
        const categoryField = rawGeneratedParameters['categoryField'];

        const rawAggregationFields = rawGeneratedParameters['aggregationField'];
        const rawAggregationMethods = rawGeneratedParameters['aggregationMethod'];
        const rawDataFields = rawGeneratedParameters['dateFields'];
        if (!rawAggregationFields || !rawAggregationMethods || !rawDataFields) {
            throw new Error('Cannot find aggregation field, aggregation method or data fields!');
        }
        const aggregationFields =
            rawAggregationFields.split(',');
        const aggregationMethods =
            rawAggregationMethods.split(',');
        const dateFields = rawDataFields.split(',');

        if (aggregationFields.length != aggregationMethods.length) {
            throw new Error('The number of aggregation fields and the number of aggregation methods are different!');
        }

        const featureList = aggregationFields.map((field: string, index: number) => {
            const method = aggregationMethods[index];
            if (!field || !method) {
                throw new Error('The generated aggregation field or aggregation method is empty!');
            }
            const aggregationOption = {
                label: field,
            };
            const feature: FeaturesFormikValues = {
                featureName: `feature_${field}`,
                featureType: FEATURE_TYPE.SIMPLE,
                featureEnabled: true,
                aggregationQuery: '',
                aggregationBy: aggregationMethods[index],
                aggregationOf: [aggregationOption],
            };
            return feature;
        });

        return {
            categoryField: categoryField,
            features: featureList,
            dateFields: dateFields,
        };
    };

    useEffect(() => {
        async function fetchData() {
            await getParameters();
            const getMappingDispatchCall = dispatch(
                getMappings(indexPatternName, dataSourceId)
            );
            await Promise.all([getMappingDispatchCall]);
        }
        fetchData();
    }, []);

    const onDetectorNameChange = (e: any, field: any) => {
        field.onChange(e);
        setDetectorName(e.target.value);
    };

    const onAccordionToggle = (key: string) => {
        const newAccordionsOpen = { ...accordionsOpen };
        newAccordionsOpen[key] = !accordionsOpen[key];
        setAccordionsOpen(newAccordionsOpen);
    };

    const onIntervalChange = (e: any, field: any) => {
        field.onChange(e);
        setIntervalalue(e.target.value);
    };

    const onDelayChange = (e: any, field: any) => {
        field.onChange(e);
        setDelayValue(e.target.value);
    };

    const handleValidationAndSubmit = (formikProps: any) => {
        if (formikProps.values.featureList.length !== 0) {
            formikProps.setFieldTouched('featureList', true);
            formikProps.validateForm().then(async (errors: any) => {
                if (!isEmpty(errors)) {
                    focusOnFirstWrongFeature(errors, formikProps.setFieldTouched);
                    notifications.toasts.addDanger(
                        'One or more input fields is invalid.'
                    );
                } else {
                    handleSubmit(formikProps);
                }
            });
        } else {
            notifications.toasts.addDanger('One or more features are required.');
        }
    };

    const handleSubmit = async (formikProps: any) => {
        formikProps.setSubmitting(true);
        try {
            const detectorToCreate = formikToDetector(formikProps.values);
            await dispatch(createDetector(detectorToCreate, dataSourceId))
                .then(async (response: any) => {
                    const detectorId = response.response.id;
                    dispatch(startDetector(detectorId, dataSourceId))
                        .then(() => { })
                        .catch((err: any) => {
                            notifications.toasts.addDanger(
                                prettifyErrorMessage(
                                    getErrorMessage(
                                        err,
                                        'There was a problem starting the real-time detector'
                                    )
                                )
                            );
                        });

                    const shingleSize = get(
                        formikProps.values,
                        'shingleSize',
                        DEFAULT_SHINGLE_SIZE
                    );
                    notifications.toasts.addSuccess({
                        title: mountReactNode(
                            <EuiText>
                                Detector created: <a href="#" onClick={(e) => {
                                    e.preventDefault();
                                    const url = `../${PLUGIN_NAME}#/detectors/${detectorId}`;
                                    window.open(url, '_blank');
                                }} style={{ textDecoration: 'underline' }}>{formikProps.values.name}</a>
                            </EuiText >
                        ),
                        text: mountReactNode(
                            <EuiText size="s">
                                <p>
                                    Attempting to initialize the detector with historical data. This
                                    initializing process takes approximately 1 minute if you have data in
                                    each of the last {32 + shingleSize} consecutive intervals.
                                </p>
                            </EuiText>
                        ),
                        className: 'createdAndAssociatedSuccessToast',
                    });

                })
                .catch((err: any) => {
                    dispatch(getDetectorCount(dataSourceId)).then((response: any) => {
                        const totalDetectors = get(response, 'response.count', 0);
                        if (totalDetectors === MAX_DETECTORS) {
                            notifications.toasts.addDanger(
                                'Cannot create detector - limit of ' +
                                MAX_DETECTORS +
                                ' detectors reached'
                            );
                        } else {
                            notifications.toasts.addDanger(
                                prettifyErrorMessage(
                                    getErrorMessage(
                                        err,
                                        'There was a problem creating the detector'
                                    )
                                )
                            );
                        }
                    });
                });
            closeFlyout();
        } catch (e) {
        } finally {
            formikProps.setSubmitting(false);
        }
    };

    const validateAnomalyDetectorName = async (detectorName: string) => {
        if (isEmpty(detectorName)) {
            return 'Detector name cannot be empty';
        } else {
            const error = validateDetectorName(detectorName);
            if (error) {
                return error;
            }
            const resp = await dispatch(matchDetector(detectorName, dataSourceId));
            const match = get(resp, 'response.match', false);
            if (!match) {
                return undefined;
            }
            //If more than one detectors found, duplicate exists.
            if (match) {
                return 'Duplicate detector name';
            }
        }
    };

    let initialDetectorValue = {
        name: detectorName,
        index: [{ label: indexPatternName }],
        timeField: timeFieldFromIndexPattern,
        interval: intervalValue,
        windowDelay: delayValue,
        shingleSize: DEFAULT_SHINGLE_SIZE,
        filterQuery: { match_all: {} },
        description: 'Created based on the OpenSearch Assistant',
        resultIndex: undefined,
        filters: [],
        featureList: [] as FeaturesFormikValues[],
        categoryFieldEnabled: false,
        categoryField: [] as string[],
        realTime: true,
        historical: false,
    };

    return (
        <div className="add-anomaly-detector">
            <Formik
                initialValues={initialDetectorValue}
                onSubmit={handleSubmit}
                validateOnChange={true}
                validate={validateFeatures}
            >
                {(formikProps) => (
                    <>
                        <EuiFlyoutHeader>
                            <EuiTitle size='s'>
                                <h2 id="add-anomaly-detector__title">
                                    Suggest anomaly detector
                                </h2>
                            </EuiTitle>
                            <EuiSpacer size="m" />
                            <EuiText size='xs'>
                                Create an anomaly detector based on the parameters(model features and categorical field) suggested by OpenSearch Assistant.
                            </EuiText>
                        </EuiFlyoutHeader>
                        <EuiFlyoutBody>
                            <div className="create-new">
                                <EuiTitle size="s">
                                    <h3>Detector details</h3>
                                </EuiTitle>
                                <EuiSpacer size="m" />

                                <EnhancedAccordion
                                    id="detectorDetailsAccordion"
                                    title={detectorName}
                                    isOpen={accordionsOpen.detectorDetails}
                                    onToggle={() => onAccordionToggle('detectorDetails')}
                                    subTitle={
                                        <EuiText size="m">
                                            <p>
                                                Detector interval: {intervalValue} minute(s); Window
                                                delay: {delayValue} minute(s)
                                            </p>
                                        </EuiText>
                                    }
                                >
                                    <Field name="name" validate={validateAnomalyDetectorName}>
                                        {({ field, form }: FieldProps) => (
                                            <FormattedFormRow
                                                title="Name"
                                                isInvalid={isInvalid(field.name, form)}
                                                error={getError(field.name, form)}
                                            >
                                                <EuiFieldText
                                                    data-test-subj="detectorNameTextInputFlyout"
                                                    isInvalid={isInvalid(field.name, form)}
                                                    {...field}
                                                    onChange={(e) => onDetectorNameChange(e, field)}
                                                />
                                            </FormattedFormRow>
                                        )}
                                    </Field>

                                    <EuiSpacer size="s" />
                                    <Field name="interval" validate={validatePositiveInteger}>
                                        {({ field, form }: FieldProps) => (
                                            <EuiFlexGroup>
                                                <EuiFlexItem style={{ maxWidth: '70%' }}>
                                                    <FormattedFormRow
                                                        fullWidth
                                                        title="Detector interval"
                                                        isInvalid={isInvalid(field.name, form)}
                                                        error={getError(field.name, form)}
                                                    >
                                                        <EuiFlexGroup gutterSize="s" alignItems="center">
                                                            <EuiFlexItem grow={false}>
                                                                <EuiFieldNumber
                                                                    id="detectionInterval"
                                                                    placeholder="Detector interval"
                                                                    data-test-subj="detectionInterval"
                                                                    min={1}
                                                                    {...field}
                                                                    onChange={(e) => onIntervalChange(e, field)}
                                                                />
                                                            </EuiFlexItem>
                                                            <EuiFlexItem>
                                                                <EuiText>
                                                                    <p className="minutes">minute(s)</p>
                                                                </EuiText>
                                                            </EuiFlexItem>
                                                        </EuiFlexGroup>
                                                    </FormattedFormRow>
                                                </EuiFlexItem>
                                            </EuiFlexGroup>
                                        )}
                                    </Field>

                                    <EuiSpacer size="s" />
                                    <Field
                                        name="windowDelay"
                                        validate={validateNonNegativeInteger}
                                    >
                                        {({ field, form }: FieldProps) => (
                                            <FormattedFormRow
                                                fullWidth
                                                title="Window delay"
                                                isInvalid={isInvalid(field.name, form)}
                                                error={getError(field.name, form)}
                                            >
                                                <EuiFlexGroup gutterSize="s" alignItems="center">
                                                    <EuiFlexItem grow={false}>
                                                        <EuiFieldNumber
                                                            id="windowDelay"
                                                            placeholder="Window delay"
                                                            data-test-subj="windowDelay"
                                                            {...field}
                                                            onChange={(e) => onDelayChange(e, field)}
                                                        />
                                                    </EuiFlexItem>
                                                    <EuiFlexItem>
                                                        <EuiText>
                                                            <p className="minutes">minute(s)</p>
                                                        </EuiText>
                                                    </EuiFlexItem>
                                                </EuiFlexGroup>
                                            </FormattedFormRow>
                                        )}
                                    </Field>
                                </EnhancedAccordion>

                                <EuiSpacer size="m" />

                                <EnhancedAccordion
                                    id="advancedConfigurationAccordion"
                                    title="Advanced configuration"
                                    isOpen={accordionsOpen.advancedConfiguration}
                                    onToggle={() => onAccordionToggle('advancedConfiguration')}
                                    initialIsOpen={false}
                                >
                                    <EuiSpacer size="s" />
                                    <MinimalAccordion
                                        id="dataFilter"
                                        title="Data Filter"
                                        subTitle="Choose a data source subset to focus the data stream and reduce data noise."
                                    >
                                        <EuiSpacer size="s" />
                                        <EuiText size="xs">
                                            <p>Source: {'test'}</p>
                                        </EuiText>
                                        <EuiSpacer size="s" />
                                        <DataFilterList formikProps={formikProps} />
                                    </MinimalAccordion>

                                    <MinimalAccordion
                                        id="shingleSize"
                                        title="Shingle size"
                                        subTitle="Set number of intervals in the model's detection window."
                                        isUsingDivider={true}
                                    >
                                        <EuiSpacer size="m" />
                                        <Field
                                            name="shingleSize"
                                            validate={validatePositiveInteger}
                                        >
                                            {({ field, form }: FieldProps) => (
                                                <FormattedFormRow
                                                    title="Shingle size"
                                                    hint={[
                                                        `Set the number of intervals to consider in a detection
                                window for your model. The anomaly detector expects the
                                shingle size to be in the range of 1 and 60. The default
                                shingle size is 8. We recommend that you don’t choose 1
                                unless you have two or more features. Smaller values might
                                increase recall but also false positives. Larger values
                                might be useful for ignoring noise in a signal.`,
                                                    ]}
                                                    hintLink={AD_DOCS_LINK}
                                                    isInvalid={isInvalid(field.name, form)}
                                                    error={getError(field.name, form)}
                                                >
                                                    <EuiFlexGroup gutterSize="s" alignItems="center">
                                                        <EuiFlexItem grow={false}>
                                                            <EuiFieldNumber
                                                                id="shingleSize"
                                                                placeholder="Shingle size"
                                                                data-test-subj="shingleSize"
                                                                {...field}
                                                            />
                                                        </EuiFlexItem>
                                                        <EuiFlexItem>
                                                            <EuiText>
                                                                <p className="minutes">intervals</p>
                                                            </EuiText>
                                                        </EuiFlexItem>
                                                    </EuiFlexGroup>
                                                </FormattedFormRow>
                                            )}
                                        </Field>
                                    </MinimalAccordion>

                                    <MinimalAccordion
                                        id="customResultIndex"
                                        title="Custom result index"
                                        subTitle="Store detector results to our own index."
                                        isUsingDivider={true}
                                    >
                                        <Field name="resultIndex">
                                            {({ field, form }: FieldProps) => (
                                                <EuiFlexGroup direction="column">
                                                    <EuiFlexItem>
                                                        <EuiCheckbox
                                                            id={'resultIndexCheckbox'}
                                                            label="Enable custom result index"
                                                            checked={enabled}
                                                            onChange={() => {
                                                                if (enabled) {
                                                                    form.setFieldValue('resultIndex', '');
                                                                }
                                                                setEnabled(!enabled);
                                                            }}
                                                        />
                                                    </EuiFlexItem>

                                                    {enabled ? (
                                                        <EuiFlexItem>
                                                            <EuiCallOut
                                                                data-test-subj="cannotEditResultIndexCallout"
                                                                title="You can't change the custom result index after you create the detector. You can manage the result index with the Index Management plugin."
                                                                color="warning"
                                                                iconType="alert"
                                                                size="s"
                                                            ></EuiCallOut>
                                                        </EuiFlexItem>
                                                    ) : null}

                                                    {enabled ? (
                                                        <EuiFlexItem>
                                                            <EuiFormRow
                                                                label="Field"
                                                                isInvalid={isInvalid(field.name, form)}
                                                                helpText={`Custom result index name must contain less than 255 characters including the prefix "opensearch-ad-plugin-result-". Valid characters are a-z, 0-9, -(hyphen) and _(underscore).`}
                                                            >
                                                                <EuiFieldText
                                                                    id="resultIndex"
                                                                    placeholder="Enter result index name"
                                                                    prepend={CUSTOM_AD_RESULT_INDEX_PREFIX}
                                                                    {...field}
                                                                />
                                                            </EuiFormRow>
                                                        </EuiFlexItem>
                                                    ) : null}
                                                </EuiFlexGroup>
                                            )}
                                        </Field>
                                    </MinimalAccordion>

                                    <MinimalAccordion
                                        id="categoricalFields"
                                        title="Categorical fields"
                                        subTitle="Split a single time series into multiple time series based on categorical fields."
                                        isUsingDivider={true}
                                    >
                                        <Field
                                            name="categoryField"
                                            validate={
                                                categoryFieldEnabled ? validateCategoryField : null
                                            }
                                        >
                                            {({ field, form }: FieldProps) => (
                                                <EuiFlexGroup direction="column">
                                                    <EuiFlexItem>
                                                        <EuiCheckbox
                                                            id={'categoryFieldCheckbox'}
                                                            label="Enable categorical fields"
                                                            checked={categoryFieldEnabled}
                                                            onChange={() => {
                                                                if (categoryFieldEnabled) {
                                                                    form.setFieldValue('categoryField', []);
                                                                }
                                                                setCategoryFieldEnabled(!categoryFieldEnabled);
                                                            }}
                                                        />
                                                    </EuiFlexItem>
                                                    {categoryFieldEnabled ? (
                                                        <EuiFlexItem>
                                                            <EuiCallOut
                                                                data-test-subj="cannotEditCategoryFieldCallout"
                                                                title="You can't change the category fields after you create the detector. Make sure that you only select the fields necessary for your use case."
                                                                color="warning"
                                                                iconType="alert"
                                                                size="s"
                                                            ></EuiCallOut>
                                                        </EuiFlexItem>
                                                    ) : null}
                                                    {categoryFieldEnabled ? (
                                                        <EuiFlexItem>
                                                            <EuiFormRow
                                                                label="Field"
                                                                isInvalid={isInvalid(field.name, form)}
                                                                error={getError(field.name, form)}
                                                                helpText={`You can only apply the categorical fields to the 'ip' and 'keyword' OpenSearch data types, and you can add up to 2 categorical fields.`}
                                                            >
                                                                <EuiComboBox
                                                                    data-test-subj="categoryFieldComboBox"
                                                                    id="categoryField"
                                                                    placeholder="Select your categorical fields"
                                                                    selectedOptions={
                                                                        field.value.map((value: any) => {
                                                                            return {
                                                                                label: value,
                                                                            };
                                                                        })
                                                                    }
                                                                    options={categoricalFields?.map((field) => {
                                                                        return {
                                                                            label: field,
                                                                        };
                                                                    })}
                                                                    onBlur={() => {
                                                                        form.setFieldTouched('categoryField', true);
                                                                    }}
                                                                    onChange={(options) => {
                                                                        const selection = options.map(
                                                                            (option) => option.label
                                                                        );
                                                                        if (!isEmpty(selection)) {
                                                                            if (selection.length <= 2) {
                                                                                form.setFieldValue(
                                                                                    'categoryField',
                                                                                    selection
                                                                                );
                                                                            }
                                                                        } else {
                                                                            form.setFieldValue('categoryField', []);
                                                                        }
                                                                    }}
                                                                    singleSelection={false}
                                                                    isClearable={true}
                                                                />
                                                            </EuiFormRow>
                                                        </EuiFlexItem>
                                                    ) : null}
                                                </EuiFlexGroup>
                                            )}
                                        </Field>
                                    </MinimalAccordion>

                                    <MinimalAccordion
                                        id="categoricalFields"
                                        title="Timestamp field"
                                        subTitle="Choose the time field you want to use for time filter."
                                        isUsingDivider={true}
                                    >
                                        <Field name="timeField">
                                            {({ field, form }: FieldProps) => (
                                                <FormattedFormRow
                                                    title="Timestamp field"
                                                    isInvalid={isInvalid(field.name, form)}
                                                    error={getError(field.name, form)}
                                                >
                                                    <EuiComboBox
                                                        data-test-subj="timestampFilter"
                                                        id="timeField"
                                                        placeholder="Find timestamp"
                                                        options={dateFields.map((field) => {
                                                            return {
                                                                label: field,
                                                            };
                                                        })}
                                                        onBlur={() => {
                                                            form.setFieldTouched('timeField', true);
                                                        }}
                                                        onChange={(options) => {
                                                            form.setFieldValue(
                                                                'timeField',
                                                                get(options, '0.label')
                                                            );
                                                        }}
                                                        selectedOptions={
                                                            field.value
                                                                ? [
                                                                    {
                                                                        label: field.value,
                                                                    },
                                                                ]
                                                                : [{ label: timeFieldFromIndexPattern }]
                                                        }
                                                        singleSelection={{ asPlainText: true }}
                                                        isClearable={false}
                                                    />
                                                </FormattedFormRow>
                                            )}
                                        </Field>
                                    </MinimalAccordion>
                                </EnhancedAccordion>

                                <EuiSpacer size="l" />
                                <EuiTitle size="s">
                                    <h3>Model Features</h3>
                                </EuiTitle>
                                <EuiSpacer size="m" />

                                <EnhancedAccordion
                                    id="modelFeaturesAccordion"
                                    title="Features"
                                    isOpen={accordionsOpen.modelFeatures}
                                    onToggle={() => onAccordionToggle('modelFeatures')}
                                >
                                    <FieldArray name="featureList">
                                        {({
                                            push,
                                            remove,
                                            form: { values },
                                        }: FieldArrayRenderProps) => {
                                            return (
                                                <Fragment>
                                                    {values.featureList.map(
                                                        (feature: any, index: number) => (
                                                            <FeatureAccordion
                                                                onDelete={() => {
                                                                    remove(index);
                                                                }}
                                                                index={index}
                                                                feature={feature}
                                                                handleChange={formikProps.handleChange}
                                                                displayMode="flyout"
                                                                key={index}
                                                            />
                                                        )
                                                    )}

                                                    <EuiSpacer size="m" />
                                                    <EuiPanel paddingSize="none">
                                                        <EuiButton
                                                            className="featureButton"
                                                            data-test-subj="addFeature"
                                                            isDisabled={
                                                                values.featureList.length >= MAX_FEATURE_NUM
                                                            }
                                                            onClick={() => {
                                                                push(initialFeatureValue());
                                                            }}
                                                            disabled={isLoading}
                                                        >
                                                            Add another feature
                                                        </EuiButton>
                                                    </EuiPanel>
                                                    <EuiSpacer size="s" />
                                                    <EuiText className="content-panel-subTitle">
                                                        <p>
                                                            You can add up to{' '}
                                                            {Math.max(
                                                                MAX_FEATURE_NUM - values.featureList.length,
                                                                0
                                                            )}{' '}
                                                            more features.
                                                        </p>
                                                    </EuiText>
                                                </Fragment>
                                            );
                                        }}
                                    </FieldArray>
                                </EnhancedAccordion>
                                <EuiSpacer size="m" />
                            </div>
                        </EuiFlyoutBody>
                        <EuiFlyoutFooter>
                            <EuiFlexGroup justifyContent="spaceBetween">
                                <EuiFlexItem grow={false}>
                                    <EuiButtonEmpty onClick={closeFlyout}>Cancel</EuiButtonEmpty>
                                </EuiFlexItem>
                                <EuiFlexItem grow={false}>
                                    <EuiButton
                                        fill={true}
                                        data-test-subj="GenerateAnomalyDetectorCreateButton"
                                        isLoading={isLoading}
                                        onClick={() => {
                                            handleValidationAndSubmit(formikProps);
                                        }}
                                    >
                                        {buttonName}
                                    </EuiButton>
                                </EuiFlexItem>
                            </EuiFlexGroup>
                        </EuiFlyoutFooter>
                    </>
                )}
            </Formik>
        </div>
    );
}

export default GenerateAnomalyDetector;
