# inversify-config-binding
Lets you bind constants to an InversifyJS container. You can bind a plain object, prototyped class, or es6 class and its sub-properties as constants into an Inversify container.

**Supports**
- values
- property getters
- inherited values + property getters

# Installation
```shell
npm install inversify-config-binding
```

# Examples

Given any of these:

## Plain object
```js
    const testConfig = {
      otherSettings: {
        c: 1.2,
        d: {
          manyThings: [1, 2, 3]
        }
      },
      settings: {
        a: 1,
        b: 'name'
      }
    };
```

## ES6 class
```js
    class Config {
      get settings() {
        return {
          a: 1,
          b: 'name'
        };
      }
      public otherSettings() {
        /* istanbul ignore next */
        return {
          c: 1.2,
          d: {
            manyThings: [1, 2, 3]
          }
        };
      }
    }
    const configInstance = new Config();
```

## ES6 Class with inheritance
```js
    class GrandparentConfig {
      public get grandparentSettings() {
        return 42;
      }
    }

    class ParentConfig extends GrandparentConfig {
      public get parentSettings() {
        return 13;
      }
    }

    class Config extends ParentConfig {
      get settings() {
        return {
          a: 1,
          b: 'name'
        };
      }

    public otherSettings() {
        /* istanbul ignore next */
        return {
          c: 1.2,
          d: {
            manyThings: [1, 2, 3]
          }
        };
      }
    }
    const configInstance = new Config();

```
You may inject values by doing the following:
```typescript
@injectable()
class NeedsConfig {
    public constructor(@inject('CFG.settings') settingsObj: any, @inject('CFG.settings.a') aString: string) {
        // snip
    }
}

// ioc.ts
import { Container } from 'inversify';
import { buildInjectionModule } from 'inversify-config-binding';

const container = new Container();

// -- perform bindings --
// -- end --

container.load(buildInjectionModule(configInstance, { debug: true, prefix: 'CFG' }));

const needsConfig = container.get<NeedsConfig>(NeedsConfig)
```

## IoC creator support
If you have a complicated settings system, you may not want to instantiate your config object by hand. 
For this case, a second module is provided.

The following may be done:
```typescript
@config({excludePatterns: [/^x/], prefix: 'CFG2', serviceIdentifier: 'Config2' })
class Config2 {
  get foo() { return 'bar'; }
  get xFoo() { return 'baz'; }
}
```
Note, the options to the decorator are optional, and the default behavior will bind the class to an identifier of itself.
*eg:* `bind(Config2).to(Config2)`

You may then load all types decorated in this manner by loading the second type of module:

```typescript
container.load(buildAutoInjectionModule(container.get.bind(container)));
``` 

This module will collect and bind all classes decorated with `@config`, and it will use the `resolver` parameter passed to `buildAutoInjectionModule()` to get an instance. This can be any function which consumes an InversifyJS service identifier and produces the target type, but in practice you would pass the container's `get()` as above.

### Notes and caveats
* It is somewhat of an anti-pattern to pass the resolver into a module. To ensure this works well for you, make sure to load this module last. 
* Notice the `.bind(container)`. InversifyJS uses `this` inside the `get` call, so it is important to bind it. Alternately the following is valid: `(serviceIdentifier: interfaces.ServiceIdentifier) => container.get(serviceIdentifier)`. The arrow function will take care of that parameter.

# Configuration
In the above example we pass `{ debug: true, prefix: 'CFG' }`. These are the only two options supported at this time. 

The currently supported configuration parameters are defined here:

## Debug
If true, logs to stdout some useful info.
### example
> Binding ".settings" to "CFG.settings"

## Prefix
Sets this as the prefix for each binding. Useful to avoid property collision

## excludePatterns
Set this to a list of regular expressions. Any property matching one of these will be excluded. 
*Default*: `/^_/`, for matching fields which start with _. 
