import { ContainerModule, interfaces } from 'inversify';
import flatMap from 'lodash.flatmap';

import { ObjectBinderSettings } from '../interfaces/interfaces';

const defaultSettings: ObjectBinderSettings = {
  debug: false,
  prefix: 'CFG'
};

/**
 * Builds an InversifyJS container module that can be loaded to register the provided
 * object and all of its valid subproperties
 * @param configObject the root config object that should be mapped
 * @param settings optional settings for the mapper
 */
export function buildInjectionModule(configObject: any, settings?: ObjectBinderSettings | undefined) {
  return new ContainerModule((bind: interfaces.Bind) => {
    bindAll(bind, configObject, settings || defaultSettings);
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
      for (const member of getChildProperties(data)) {
          stack.push(item.concat(member));
      }
    }
  }
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
  while (prototype !== Object.prototype) {
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
  return (prototype && Object.getOwnPropertyNames(prototype)) || []
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
  return obj instanceof Array || ['string', 'number', 'boolean'].includes(typeof obj);
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
