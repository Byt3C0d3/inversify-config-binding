// tslint:disable:no-unused-expression

import CaptureStdOut from 'capture-stdout';
import { expect, use as chaiUse } from 'chai';
import { Container, injectable } from 'inversify';
import * as sinon from 'sinon';

import { config } from '../decorators/config';
import { buildAutoInjectionModule, buildInjectionModule } from './config-module-builder';

import sinonChai = require('sinon-chai');
import { METADATA_KEY } from '../constants/constants';
chaiUse(sinonChai);

describe('ConfigModuleBuilder from IoC', () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    Reflect.deleteMetadata(METADATA_KEY.configObject, Reflect);
  });

  describe('ES6 class', () => {
    it('should be able to resolve config from class with properties', () => {
      // Arrange
      @config()
      class Config {
        get settings() {
          return {
            a: 1,
            b: 'name'
          };
        }
        get otherSettings() {
          /* istanbul ignore next */
          return {
            c: 1.2,
            d: {
              manyThings: [1, 2, 3]
            }
          };
        }
      }

      const container = new Container();
      // Act
      container.load(buildAutoInjectionModule(container.get.bind(container)));

      // Assert
      expect(container.get<Config>(Config)).to.be.instanceof(Config);
      expect(container.get<any>('CFG.settings')).deep.equal({ a: 1, b: 'name' });

    });

    it('should be handle decorators on a class already marked @injectable', () => {
      // Arrange
      @config()
      @injectable()
      class Config {
        get settings() {
          return {
            a: 1,
            b: 'name'
          };
        }
        get otherSettings() {
          /* istanbul ignore next */
          return {
            c: 1.2,
            d: {
              manyThings: [1, 2, 3]
            }
          };
        }
      }

      const container = new Container();
      // Act
      container.load(buildAutoInjectionModule(container.get.bind(container)));

      // Assert
      expect(container.get<Config>(Config)).to.be.instanceof(Config);
      expect(container.get<any>('CFG.settings')).deep.equal({ a: 1, b: 'name' });

    });

    it('should be able to resolve config from class with properties when custom settings provided', () => {
      // Arrange
      @config({excludePatterns: [/^x/], prefix: 'CFG2', serviceIdentifier: 'Config2' })
      class Config2 {
        get foo() { return 'bar'; }
        get xFoo() { return 'baz'; }
      }

      const container = new Container();
      const bindSpy = sandbox.spy(container, 'bind');
      // Act
      container.load(buildAutoInjectionModule(container.get.bind(container)));

      // Assert
      expect(container.get<Config2>('Config2')).to.be.instanceof(Config2);
      expect(container.get<any>('CFG2.foo')).equal('bar');
      expect(bindSpy).to.not.have.been.calledWith('CFG2.xFoo');
    });

    it('should be able to resolve multiple configs', () => {
      // Arrange
      @config()
      class Config {
        get settings() {
          return {
            a: 1,
            b: 'name'
          };
        }
        get otherSettings() {
          /* istanbul ignore next */
          return {
            c: 1.2,
            d: {
              manyThings: [1, 2, 3]
            }
          };
        }
      }

      @config({excludePatterns: [/^x/], prefix: 'CFG2', serviceIdentifier: 'Config2' })
      class Config2 {
        get foo() { return 'bar'; }
        get xFoo() { return 'baz'; }
      }

      const container = new Container();
      const bindSpy = sandbox.spy(container, 'bind');
      // Act
      container.load(buildAutoInjectionModule(container.get.bind(container)));

      // Assert
      expect(container.get<Config>(Config)).to.be.instanceof(Config);
      expect(container.get<any>('CFG.settings')).deep.equal({ a: 1, b: 'name' });

      expect(container.get<Config2>('Config2')).to.be.instanceof(Config2);
      expect(container.get<any>('CFG2.foo')).equal('bar');

      expect(bindSpy).to.not.have.been.calledWith('CFG2.xFoo');
    });
  });
});

describe('ConfigModuleBuilder from instance', () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Plain Object', () => {
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

    const testConfigWithNulls = {
      settings: {
        thing: null
      }
    };

    it('should be able to resolve config values', () => {
      // Arrange
      const container = new Container();
      // Act
      const module = buildInjectionModule(testConfig, { debug: false, prefix: 'CFG' });
      container.load(module);

      // Assert
      expect(container.get<any>('CFG.otherSettings.c')).to.equal(1.2);
      expect(container.get<any>('CFG.settings')).to.deep.equal({ a: 1, b: 'name' });
    });

    it('should handle nulls gracefully', () => {
      // Arrange
      const container = new Container();
      // Act
      const module = buildInjectionModule(testConfigWithNulls, { debug: false, prefix: 'CFG' });
      container.load(module);

      // Assert
      expect(container.get<any>('CFG.settings')).to.not.be.null;
      expect(container.get<any>('CFG.settings.thing')).to.be.null;
    });

    it('should bind all valid types', () => {
      // Arrange
      const bindingToSyntax = { toConstantValue: sandbox.stub() };
      const bindFunc = sandbox.stub().returns(bindingToSyntax);

      const unBindFunc = sandbox.stub();
      const isBoundFunc = sandbox.stub();
      const rebindFunc = sandbox.stub();

      // Act
      const module = buildInjectionModule(testConfig);
      module.registry(bindFunc, unBindFunc, isBoundFunc, rebindFunc);
      // Assert
      expect(bindFunc).to.have.been.calledWith('CFG');
      expect(bindFunc).to.have.been.calledWith('CFG.settings');
      expect(bindFunc).to.have.been.calledWith('CFG.settings.a');
      expect(bindFunc).to.have.been.calledWith('CFG.settings.b');
      expect(bindFunc).to.have.been.calledWith('CFG.otherSettings');
      expect(bindFunc).to.have.been.calledWith('CFG.otherSettings.c');
      expect(bindFunc).to.have.been.calledWith('CFG.otherSettings.d');
      expect(bindFunc).to.have.been.calledWith('CFG.otherSettings.d.manyThings');
      expect(bindFunc).to.have.callCount(8);

      expect(bindingToSyntax.toConstantValue).to.have.callCount(8);
      expect(bindingToSyntax.toConstantValue).to.have.been.calledWith(testConfig);
      expect(bindingToSyntax.toConstantValue).to.have.been.calledWith(testConfig.settings);
      expect(bindingToSyntax.toConstantValue).to.have.been.calledWith(testConfig.settings.a);
    });

    it('should log to console', () => {
      // Arrange
      const captureStdOut = new CaptureStdOut();
      const bindingToSyntax = { toConstantValue: sandbox.stub() };
      const bindFunc = sandbox.stub().returns(bindingToSyntax);

      const unBindFunc = sandbox.stub();
      const isBoundFunc = sandbox.stub();
      const rebindFunc = sandbox.stub();

      // Act
      const module = buildInjectionModule(testConfig, { debug: true, prefix: null as any });

      captureStdOut.startCapture();
      module.registry(bindFunc, unBindFunc, isBoundFunc, rebindFunc);
      captureStdOut.stopCapture();

      const capturedText = captureStdOut.getCapturedText();
      // Assert
      expect(capturedText).to.contain('Binding "" to "CFG"');
      expect(capturedText).to.contain('Binding ".settings" to "CFG.settings"');
      expect(capturedText).to.contain('Binding ".settings.b" to "CFG.settings.b"');
      expect(capturedText).to.contain('Binding ".settings.a" to "CFG.settings.a"');
      expect(capturedText).to.contain('Binding ".otherSettings" to "CFG.otherSettings"');
      expect(capturedText).to.contain('Binding ".otherSettings.d" to "CFG.otherSettings.d"');
      expect(capturedText).to.contain('Binding ".otherSettings.d.manyThings" to "CFG.otherSettings.d.manyThings"');
      expect(capturedText).to.contain('Binding ".otherSettings.c" to "CFG.otherSettings.c"');

    });

  });

  describe('ES6 class', () => {
    class Config {
      public _lo = 'goodbye';
      private _hi = 'greeting';
      /* istanbul ignore next */
      public greet() { return this._hi; }
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

    it('should bind all valid types from a class ', () => {
      // Arrange
      const bindingToSyntax = { toConstantValue: sandbox.stub() };
      const bindFunc = sandbox.stub().returns(bindingToSyntax);

      const unBindFunc = sandbox.stub();
      const isBoundFunc = sandbox.stub();
      const rebindFunc = sandbox.stub();

      // Act
      const module = buildInjectionModule(configInstance, { debug: false, prefix: 'CFG' });
      module.registry(bindFunc, unBindFunc, isBoundFunc, rebindFunc);
      // Assert
      expect(bindFunc).to.have.been.calledWith('CFG');
      expect(bindFunc).to.have.been.calledWith('CFG.settings');
      expect(bindFunc).to.have.been.calledWith('CFG.settings.a');
      expect(bindFunc).to.have.been.calledWith('CFG.settings.b');
      expect(bindFunc).to.not.have.been.calledWith('CFG.otherSettings');
      expect(bindFunc).to.have.callCount(4);

      expect(bindingToSyntax.toConstantValue).to.have.callCount(4);
      expect(bindingToSyntax.toConstantValue).to.have.been.calledWith(configInstance);
      expect(bindingToSyntax.toConstantValue).to.have.been.calledWith(configInstance.settings);
      expect(bindingToSyntax.toConstantValue).to.have.been.calledWith(configInstance.settings.a);

    });

    it('should be able to resolve config from class with properties', () => {
      // Arrange
      const container = new Container();

      // Act
      const module = buildInjectionModule(configInstance, { debug: false, prefix: 'CFG' });
      container.load(module);

      // Assert
      expect(container.get<any>('CFG.settings')).deep.equal({ a: 1, b: 'name' });

    });
  });

  describe('ES6 class with inheritance', () => {
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

    it('should bind all valid types from a class ', () => {
      // Arrange
      const bindingToSyntax = { toConstantValue: sandbox.stub() };
      const bindFunc = sandbox.stub().returns(bindingToSyntax);

      const unBindFunc = sandbox.stub();
      const isBoundFunc = sandbox.stub();
      const rebindFunc = sandbox.stub();

      // Act
      const module = buildInjectionModule(configInstance, { debug: false, prefix: 'CFG' });
      module.registry(bindFunc, unBindFunc, isBoundFunc, rebindFunc);
      // Assert
      expect(bindFunc).to.have.been.calledWith('CFG');
      expect(bindFunc).to.have.been.calledWith('CFG.settings');
      expect(bindFunc).to.have.been.calledWith('CFG.settings.a');
      expect(bindFunc).to.have.been.calledWith('CFG.settings.b');

      expect(bindFunc).to.have.been.calledWith('CFG.parentSettings');
      expect(bindFunc).to.have.been.calledWith('CFG.grandparentSettings');
      expect(bindFunc).to.have.callCount(6);

      expect(bindingToSyntax.toConstantValue).to.have.callCount(6);
      expect(bindingToSyntax.toConstantValue).to.have.been.calledWith(configInstance);
      expect(bindingToSyntax.toConstantValue).to.have.been.calledWith(configInstance.settings.a);
      expect(bindingToSyntax.toConstantValue).to.have.been.calledWith(configInstance.settings.b);
      expect(bindingToSyntax.toConstantValue).to.have.been.calledWith(configInstance.parentSettings);
      expect(bindingToSyntax.toConstantValue).to.have.been.calledWith(configInstance.parentSettings);
      expect(bindingToSyntax.toConstantValue).to.have.been.calledWith(configInstance.grandparentSettings);

    });

    it('should be able to resolve config from class with properties', () => {
      // Arrange
      const container = new Container();

      // Act
      const module = buildInjectionModule(configInstance, { debug: false, prefix: 'CFG' });
      container.load(module);

      // Assert
      expect(container.get<any>('CFG.settings')).deep.equal({ a: 1, b: 'name' });

    });
  });

});
