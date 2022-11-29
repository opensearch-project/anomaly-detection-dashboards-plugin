import { i18n } from '@osd/i18n';
import { IEmbeddable } from '../../../../src/plugins/dashboard/public/embeddable_plugin';
import {
  DASHBOARD_CONTAINER_TYPE,
  DashboardContainer,
} from '../../../../src/plugins/dashboard/public';
import { getContextMenuData as getMenuData } from '../utils/contextMenu/getContextMenuData';
import { IncompatibleActionError, createAction } from '../../../../src/plugins/ui_actions/public';
import { isReferenceOrValueEmbeddable } from '../../../../src/plugins/embeddable/public';

export const ACTION_AD = 'ad';

function isDashboard(embeddable: IEmbeddable): embeddable is DashboardContainer {
  return embeddable.type === DASHBOARD_CONTAINER_TYPE;
}

export interface ActionContext {
  embeddable: IEmbeddable;
}

export const createADAction = () =>
  createAction({
    getDisplayName: ({ embeddable }: ActionContext) => {
      if (!embeddable.parent || !isDashboard(embeddable.parent)) {
        throw new IncompatibleActionError();
      }
      return i18n.translate('dashboard.actions.adMenuItem.displayName', {
        defaultMessage: 'Anomaly Detection',
      });
    },
    type: ACTION_AD,
    isCompatible: async ({ embeddable }: ActionContext) => {
      const paramsType = embeddable.vis?.params?.type;
      const seriesParams = embeddable.vis?.params?.seriesParams || [];
      const series = embeddable.vis?.params?.series || [];
      const isLineGraph =
        seriesParams.find((item) => item.type === 'line') ||
        series.find((item) => item.chart_type === 'line');
      const isValidVis = isLineGraph && paramsType !== 'table';

      return Boolean(embeddable.parent && isDashboard(embeddable.parent) && isValidVis);
    },
    execute: async ({ embeddable }: ActionContext) => {
      if (!isReferenceOrValueEmbeddable(embeddable)) {
        throw new IncompatibleActionError();
      }
    },
    getContextMenuData: getMenuData,
  });