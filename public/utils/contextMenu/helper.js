export const getInitialValues = () => ({
  ...{ ...FORMIK_INITIAL_VALUES, name: 'Monitor 1' },
  triggers: [
    {
      ...FORMIK_INITIAL_TRIGGER_CONDITION_VALUES,
      name: 'New trigger',
      id: Date.now(),
      severity: '1',
    },
  ],
  monitors: getInitialMonitors(),
  alerts: getInitialAlerts(),
});