/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import { IEmbeddable } from '../../../../src/plugins/dashboard/public/embeddable_plugin';
import {
  DASHBOARD_CONTAINER_TYPE,
  DashboardContainer,
} from '../../../../src/plugins/dashboard/public';
import {
  IncompatibleActionError,
  createAction,
  Action,
} from '../../../../src/plugins/ui_actions/public';
import { isReferenceOrValueEmbeddable } from '../../../../src/plugins/embeddable/public';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';

export const ACTION_AD = 'ad';

function isDashboard(
  embeddable: IEmbeddable
): embeddable is DashboardContainer {
  return embeddable.type === DASHBOARD_CONTAINER_TYPE;
}

export interface ActionContext {
  embeddable: IEmbeddable;
}

export interface CreateOptions {
  grouping: Action['grouping'];
  title: string;
  icon: EuiIconType;
  id: string;
  order: number;
  onClick: Function;
}

export const createADAction = ({
  grouping,
  title,
  icon,
  id,
  order,
  onClick,
}: CreateOptions) =>
  createAction({
    id,
    order,
    getDisplayName: ({ embeddable }: ActionContext) => {
      if (!embeddable.parent || !isDashboard(embeddable.parent)) {
        throw new IncompatibleActionError();
      }
      return title;
    },
    getIconType: () => icon,
    type: ACTION_AD,
    grouping,
    isCompatible: async ({ embeddable }: ActionContext) => {
      const paramsType = embeddable.vis?.params?.type;
      const seriesParams = embeddable.vis?.params?.seriesParams || [];
      const series = embeddable.vis?.params?.series || [];
      const isLineGraph =
        seriesParams.find((item) => item.type === 'line') ||
        series.find((item) => item.chart_type === 'line');
      const isValidVis = isLineGraph && paramsType !== 'table';
      return Boolean(
        embeddable.parent && isDashboard(embeddable.parent) && isValidVis
      );
    },
    execute: async ({ embeddable }: ActionContext) => {
      if (!isReferenceOrValueEmbeddable(embeddable)) {
        throw new IncompatibleActionError();
      }

      onClick({ embeddable });
    },
  });
