import React from 'react';
import { useFormik, FormikProvider } from 'formik';

const FormikWrapper = ({ getFormikOptions, children, ...props }) => {
  const formik = useFormik(getFormikOptions());
  return <FormikProvider {...{ value: formik, ...props }}>{children}</FormikProvider>;
};

export default FormikWrapper;
