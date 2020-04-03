import * as React from 'react';
import sheetFetcher, { makeSheetQueryUrl } from './sheetFetcher';
import { PromiseState } from 'react-refetch';
import { Config, ConfigProp, ConfigPropName, Flow, Location } from './types';
import LoadingSpinner from './LoadingSpinner';
import { Helmet } from 'react-helmet';
import sendEvent from './ga';
import { DEFAULT_CONFIG } from './config';
import FlowMap, {
  ErrorsLocationsBlock,
  MAX_NUM_OF_IDS_IN_ERROR,
  Props as FlowMapProps,
} from './FlowMap';
import MapContainer from './MapContainer';
import { nest } from 'd3-collection';
import { AppToaster } from './AppToaster';
import { Intent } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { ToastContent } from './Boxes';

interface Props {
  spreadSheetKey: string;
  embed: boolean;
}

type PropsWithData = Props & {
  configFetch: PromiseState<Config>;
};

const FlowMapWithData = sheetFetcher<any>(({ spreadSheetKey, config }: FlowMapProps) => ({
  locationsFetch: {
    url: makeSheetQueryUrl(spreadSheetKey!, 'locations', 'SELECT A,B,C,D'),
    then: (rows: any[]) => ({
      value: rows.map(
        ({ id, name, lon, lat }: any) =>
          ({
            id: `${id}`,
            name: name ?? id,
            lon: +lon,
            lat: +lat,
          } as Location)
      ),
    }),
  } as any,
  flowsFetch: {
    url: makeSheetQueryUrl(spreadSheetKey!, 'flows', 'SELECT A,B,C'),
    then: (rows: Flow[]) => {
      let dupes: Flow[] = [];
      // Sum up duplicate flows (with same origin and dest)
      const grouped = nest<Flow, Flow>()
        .key((d: Flow) => d.origin)
        .key((d: Flow) => d.dest)
        .rollup(dd => {
          const { origin, dest } = dd[0];
          if (dd.length > 1) {
            dupes.push(dd[0]);
          }
          return {
            origin,
            dest,
            count: dd.reduce((m, d) => {
              if (d.count != null) {
                const c = +d.count;
                if (!isNaN(c) && isFinite(c)) return m + c;
              }
              return m;
            }, 0),
          };
        })
        .entries(rows);
      const rv: Flow[] = [];
      for (const { values } of grouped) {
        for (const { value } of values) {
          if (value.origin != null && value.dest != null) {
            rv.push(value);
          }
        }
      }
      if (dupes.length > 0) {
        if (config[ConfigPropName.IGNORE_ERRORS] !== 'yes') {
          AppToaster.show({
            intent: Intent.WARNING,
            icon: IconNames.WARNING_SIGN,
            timeout: 0,
            message: (
              <ToastContent>
                The following flows (origin → dest pairs) were encountered more than once in the
                dataset:
                <ErrorsLocationsBlock>
                  {(dupes.length > MAX_NUM_OF_IDS_IN_ERROR
                    ? dupes.slice(0, MAX_NUM_OF_IDS_IN_ERROR)
                    : dupes
                  )
                    .map(({ origin, dest }) => `${origin} → ${dest}`)
                    .join(', ')}
                  {dupes.length > MAX_NUM_OF_IDS_IN_ERROR &&
                    ` … and ${dupes.length - MAX_NUM_OF_IDS_IN_ERROR} others`}
                </ErrorsLocationsBlock>
                Their counts were summed up.
              </ToastContent>
            ),
          });
        }
      }
      return {
        value: rv,
      };
    },
  } as any,
}))(FlowMap as any);

const GSheetsFlowMap = sheetFetcher<any>(({ spreadSheetKey }: Props) => ({
  configFetch: {
    url: makeSheetQueryUrl(spreadSheetKey, 'properties', 'SELECT A,B'),
    then: (props: ConfigProp[]) => {
      const value = { ...DEFAULT_CONFIG };
      for (const prop of props) {
        if (prop.value != null && `${prop.value}`.length > 0) {
          value[prop.property] = prop.value;
        }
      }
      sendEvent(
        `${spreadSheetKey} "${value[ConfigPropName.TITLE] || 'Untitled'}"`,
        `Load config`,
        `Load config "${value[ConfigPropName.TITLE] || 'Untitled'}"`
      );
      return { value };
    },
  } as any,
}))(({ spreadSheetKey, embed, configFetch }: PropsWithData) => {
  return (
    <MapContainer embed={embed}>
      {configFetch.pending || configFetch.refreshing ? (
        <LoadingSpinner />
      ) : (
        <FlowMapWithData
          animate={true}
          spreadSheetKey={spreadSheetKey}
          embed={embed}
          config={configFetch.fulfilled ? configFetch.value : DEFAULT_CONFIG}
        />
      )}
      {configFetch.fulfilled && configFetch.value[ConfigPropName.TITLE] && (
        <Helmet>
          <title>{`${configFetch.value[ConfigPropName.TITLE]} - Flowmap.blue`}</title>
          <link href={`https://flowmap.blue/${spreadSheetKey}`} rel="canonical" />
        </Helmet>
      )}
    </MapContainer>
  );
});

export default GSheetsFlowMap;
