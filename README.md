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

In the above example we pass `{ debug: true, prefix: 'CFG' }`. These are the only two options supported at this time. 

## Debug
If true, logs to stdout some useful info.
### example
> Binding ".settings" to "CFG.settings"

## Prefix
Sets this as the prefix for each binding. Useful to avoid property collision