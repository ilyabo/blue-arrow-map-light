export enum ConfigPropName {
  TITLE = 'title',
  DESCRIPTION = 'description',
  SOURCE_NAME = 'source.name',
  SOURCE_URL = 'source.url',
  MAP_BBOX = 'map.bbox',
  IGNORE_ERRORS = 'ignore.errors',
  MAPBOX_ACCESS_TOKEN = 'mapbox.accessToken',
}

export interface ConfigProp {
  property: ConfigPropName
  value: string | undefined
}

export type Config = {
  [prop in ConfigPropName]: string | undefined
}

export interface Location {
  id: string
  lon: string
  lat: string
  name: string
}

export interface Flow {
  origin: string
  dest: string
  count: string
}

export interface LocationSelection {
  id: string;
  direction: FlowDirection;
}

export enum FlowDirection {
  BOTH = 'BOTH',
  IN = 'IN',
  OUT = 'OUT',
}
