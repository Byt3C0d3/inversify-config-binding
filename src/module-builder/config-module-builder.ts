import { ContainerModule, interfaces } from 'inversify';
import flatMap from 'lodash.flatmap';

import { METADATA_KEY } from '../constants/constants';
import { ConfigObjectMetadata, ObjectBinderSettings, ResolverFunction } from '../interfaces/interfaces';

const defaultSettings: ObjectBinderSettings = {
  debug: false,
  excludePatterns: [
    /^_/ // Exclude members that start with _
  ],
  prefix: 'CFG'
};

export function buildAutoInjectionModule(resolver: ResolverFunction<any>) {
  return new ContainerModule((bind: interfaces.Bind) => {
    const metadata: ConfigObjectMetadata[] = Reflect.getMetadata(METADATA_KEY.configObject, Reflect);
    metadata.forEach((item) => {
      const identifier = (item.settings && item.settings.serviceIdentifier) || item.implementationType;
      bind(identifier).to(item.implementationType).inSingletonScope();

      const instance = resolver(identifier);
      bindAll(bind, instance, item.settings || defaultSettings);
    });
  });
}

/**
 * Builds an InversifyJS container module that can be loaded to register the provided
 * object and all of its valid subproperties
 * @param configObject the root config object that should be mapped
 * @param settings optional settings for the mapper
 */
export function buildInjectionModule(configObject: any, settings?: ObjectBinderSettings | undefined) {
  return new ContainerModule((bind: interfaces.Bind) => {
    const mergedSettings = Object.assign(defaultSettings, settings);
    bindAll(bind, configObject, mergedSettings);
  });
}

/**
 * Builds bindings for object and all valid subproperties
 * @param bind the InversifyJS bind function
 * @param configObject root config oject to bind
 * @param settings required settings for mapper
 */
function bindAll(bind: interfaces.Bind, configObject: any, settings: ObjectBinderSettings) {
  const logger = getLogger(settings);
  const prefix = (settings.prefix && settings.prefix.trim()) || 'CFG';
  const excludedPatterns = settings.excludePatterns as RegExp[];
  // Do an iterative DFS on all of object's properties
  // Stack stores the property path segments to be traversed
  // eg: config.person.name => ['config', 'person', 'name']
  const stack = new Array<string[]>(['']);
  while (stack.length > 0) {

    const item = stack.pop();

    // This is largely defensive, but also averts TS compile erros when `item` is used below
    /* istanbul ignore if */
    if (!item) {
        break;
    }

    // Stringify the current property path
    const objectPath = item.join('.');
    // Store the path to which we will bind the object. Same as the object path but with prefix, if provided.
    // Also, trim trailing dots.
    const bindPath = (prefix + objectPath).replace(/\.$/, '');

    // Get the value at the property path
    const data = getField(configObject, item);

    // Do the binding
    logger(`Binding "${objectPath}" to "${bindPath}"`);
    bind<{}>(bindPath).toConstantValue(data);

    // If the current property is not a primitive and can have children, recurse on them by adding to stack
    if (!isLeaf(data)) {
      // we get all of the valid child properties down the whole prototype chain
      const properties = getChildProperties(data)
        .filter((prop) => !isPropertyBlacklisted(excludedPatterns, prop)) ;
      for (const member of properties) {
          stack.push(item.concat(member));
      }
    }
  }
}

/**
 * Returns true if property matches no blacklist patterns
 * @param excludedPatterns array of `RegExp` objects to test against
 * @param propertyName name of property
 */
function isPropertyBlacklisted(excludedPatterns: RegExp[], propertyName: string) {
  return !excludedPatterns.every((pattern) => !pattern.test(propertyName));
}
/**
 * Get all valid child properties down the prototype chain in a flat list
 * @param obj object whose child properties we seek
 */
function getChildProperties(obj: any): string[] {
  return flatMap(
    getPrototypeChain(obj),
    (proto: any) => getPrototypeMembers(obj, proto));
}

/**
 * Get a list of the object and all of its prototypes except for Object{}
 * @param obj
 */
function getPrototypeChain(obj: any) {
  const prototypes: any[] = [obj];
  let prototype = Object.getPrototypeOf(obj);

  // When we reach Object, we are done
  while (prototype && prototype !== Object.prototype) {
    prototypes.push(prototype);
    prototype = Object.getPrototypeOf(prototype);
  }
  return prototypes;
}

/**
 * Get a list of valid property names that are defined by a prototype and also exist on the object
 * @param obj The original object whose properties we want
 * @param prototype The particular prototype we are testing
 */
function getPrototypeMembers(obj: any, prototype: any) {
  return (Object.getOwnPropertyNames(prototype))
    .filter((p) =>
      isPublicProperty(p) &&
      isValidPropertyType(obj[p]));
}

/**
 * Returns true for properties with valid values. We are interested in non-undefined and non-function properties only.
 * @param property a value of a property on an object
 */
function isValidPropertyType(property: any) {
    const type = typeof property;
    return !['undefined', 'function'].includes(type);
}

/**
 * Returns true for property names which aren't blacklisted as internal. We don't care about 'undefined'
 * or `function` type properties
 * @param propertyName the name of a property
 */
function isPublicProperty(propertyName: string) {
    return !['constructor', '__proto__'].includes(propertyName);
}

/**
 * Returns true if a property is a primitive type with no interesting subproperties
 * @param obj a property value
 */
function isLeaf(obj: any) {
  return obj === null ||
    typeof obj === 'undefined' ||
    obj instanceof Array ||
    ['string', 'number', 'boolean'].includes(typeof obj);
}

/**
 * Given an object and a property path, return the value of the property at that path
 * @param configObject The root config object
 * @param itemPathData A dot-delimited property path
 */
function getField(configObject: any, itemPathData: string[]): any {
  let value = configObject;

  // Iterate over the property path and iteratively select `value` until we terminate
  for (const part of itemPathData) {
    // Skip empty property segments (should only happen as the first item)
    if (part === '') {
      continue;
    }
    value = value[part];
  }

  return value;
}

/**
 * Return a logger. This can be a NOOP logger if `settings.debug` is falsey
 * @param settings
 */
function getLogger(settings: ObjectBinderSettings) {
  return settings.debug ?
    (message?: string, ...args: any[]) => console.log(message, ...args) :
    () => null;
}
