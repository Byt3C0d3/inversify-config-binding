import CaptureStdOut from 'capture-stdout';
import { expect, use as chaiUse } from 'chai';
import { Container } from 'inversify';
import * as sinon from 'sinon';

import { buildInjectionModule } from './config-module-builder';

// import 'sinon-chai';
import sinonChai = require('sinon-chai');
chaiUse(sinonChai);

describe('ConfigModuleBuilder', () => {
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
      const config = new Config();

      // Act
      const module = buildInjectionModule(config, { debug: false, prefix: 'CFG' });
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
      const config = new Config();

      // Act
      const module = buildInjectionModule(config, { debug: false, prefix: 'CFG' });
      container.load(module);

      // Assert
      expect(container.get<any>('CFG.settings')).deep.equal({ a: 1, b: 'name' });

    });
  });

});
