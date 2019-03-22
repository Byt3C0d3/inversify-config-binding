import { interfaces } from 'inversify';
export type ResolverFunction<T> = (serviceIdentifier: interfaces.ServiceIdentifier<any>) => T;

export interface DecoratorObjectBinderSettings extends ObjectBinderSettings {
  serviceIdentifier?: interfaces.ServiceIdentifier<any>;
}
export interface ObjectBinderSettings {
    prefix?: string;
    debug?: boolean;
    excludePatterns?: RegExp[];
  }

export interface ConfigObjectMetadata {
  implementationType: any;
  settings?: DecoratorObjectBinderSettings;
}
