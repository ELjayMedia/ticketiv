#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { inspect } from 'node:util';

const require = Module.createRequire(import.meta.url);

function registerTypeScriptLoader() {
  const extensions = ['.ts', '.tsx'];
  for (const ext of extensions) {
    Module._extensions[ext] = (module, filename) => {
      const source = fs.readFileSync(filename, 'utf8');
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true,
          sourceMap: false,
          jsx: ts.JsxEmit.React,
          target: ts.ScriptTarget.ES2020,
        },
        fileName: filename,
      });
      module._compile(outputText, filename);
    };
  }
}

registerTypeScriptLoader();

process.env.NODE_ENV ??= 'test';

function createSuite(name, parent = null) {
  return {
    name,
    parent,
    tests: [],
    children: [],
    beforeEachHooks: [],
    afterEachHooks: [],
  };
}

const rootSuite = createSuite('(root)');
const suiteStack = [rootSuite];

function currentSuite() {
  return suiteStack[suiteStack.length - 1];
}

function pushSuite(suite) {
  suiteStack.push(suite);
}

function popSuite() {
  suiteStack.pop();
}

function ensureFunction(name, fn) {
  if (typeof fn !== 'function') {
    throw new TypeError(`${name} expects a function but received ${typeof fn}`);
  }
}

function registerGlobals() {
  globalThis.describe = (name, fn) => {
    ensureFunction('describe', fn);
    const parent = currentSuite();
    const suite = createSuite(name, parent);
    parent.children.push(suite);
    pushSuite(suite);
    try {
      fn();
    } finally {
      popSuite();
    }
  };

  const addTest = (name, fn) => {
    ensureFunction('it', fn);
    currentSuite().tests.push({ name, fn });
  };

  globalThis.it = addTest;
  globalThis.test = addTest;

  globalThis.beforeEach = (fn) => {
    ensureFunction('beforeEach', fn);
    currentSuite().beforeEachHooks.push(fn);
  };

  globalThis.afterEach = (fn) => {
    ensureFunction('afterEach', fn);
    currentSuite().afterEachHooks.push(fn);
  };

  globalThis.expect = (received) => createExpectation(received);
}

function formatValue(value) {
  return typeof value === 'string' ? `"${value}"` : inspect(value, { depth: 4 });
}

function createExpectation(received) {
  const makeAssertion = (passes, message) => {
    if (!passes) {
      throw new assert.AssertionError({
        message,
        actual: received,
      });
    }
  };

  const toBe = (expected) => {
    makeAssertion(Object.is(received, expected), `Expected ${formatValue(received)} to be ${formatValue(expected)}`);
  };

  const toEqual = (expected) => {
    assert.deepStrictEqual(received, expected);
  };

  const toBeTruthy = () => {
    makeAssertion(Boolean(received), `Expected ${formatValue(received)} to be truthy`);
  };

  const toBeFalsy = () => {
    makeAssertion(!received, `Expected ${formatValue(received)} to be falsy`);
  };

  const toContain = (item) => {
    if (typeof received === 'string' || Array.isArray(received)) {
      makeAssertion(received.includes(item), `Expected ${formatValue(received)} to contain ${formatValue(item)}`);
      return;
    }
    if (received instanceof Set) {
      makeAssertion(received.has(item), `Expected set to contain ${formatValue(item)}`);
      return;
    }
    throw new TypeError('toContain is only supported for strings, arrays, and sets');
  };

  const toHaveLength = (length) => {
    if (received == null || typeof received.length !== 'number') {
      throw new TypeError('toHaveLength expects a value with a length property');
    }
    makeAssertion(received.length === length, `Expected length ${received.length} to be ${length}`);
  };

  const matchers = { toBe, toEqual, toBeTruthy, toBeFalsy, toContain, toHaveLength };
  const inverted = {};
  for (const [key, matcher] of Object.entries(matchers)) {
    inverted[key] = (...args) => {
      try {
        matcher(...args);
      } catch (error) {
        return;
      }
      throw new assert.AssertionError({
        message: `Expected matcher ${key} to fail`,
        actual: received,
      });
    };
  }

  return { ...matchers, not: inverted };
}

registerGlobals();

function gatherBeforeEach(suites) {
  const hooks = [];
  for (const suite of suites) {
    hooks.push(...suite.beforeEachHooks);
  }
  return hooks;
}

function gatherAfterEach(suites) {
  const hooks = [];
  for (let i = suites.length - 1; i >= 0; i -= 1) {
    hooks.push(...suites[i].afterEachHooks);
  }
  return hooks;
}

function formatSuitePath(ancestors, name) {
  const parts = ancestors.filter((segment) => segment !== '(root)');
  if (name && name !== '(root)') {
    parts.push(name);
  }
  return parts.join(' > ');
}

async function runTest(test, suiteChain, reporter) {
  const befores = gatherBeforeEach(suiteChain);
  const afters = gatherAfterEach(suiteChain);
  for (const hook of befores) {
    await hook();
  }

  try {
    await test.fn();
    reporter.pass(test, suiteChain);
  } catch (error) {
    reporter.fail(test, suiteChain, error);
  }

  for (const hook of afters) {
    try {
      await hook();
    } catch (error) {
      reporter.hookError('afterEach', suiteChain, error);
    }
  }
}

async function runSuite(suite, ancestors, reporter) {
  const chain = [...ancestors, suite];
  for (const test of suite.tests) {
    await runTest(test, chain, reporter);
  }
  for (const child of suite.children) {
    await runSuite(child, chain, reporter);
  }
}

function createReporter() {
  let total = 0;
  let failed = 0;

  return {
    pass(test, suiteChain) {
      total += 1;
      console.log(`\u2714 ${formatSuitePath(suiteChain.map((s) => s.name), test.name)}`);
    },
    fail(test, suiteChain, error) {
      total += 1;
      failed += 1;
      console.error(`\u2716 ${formatSuitePath(suiteChain.map((s) => s.name), test.name)}`);
      console.error(error?.stack ?? error);
    },
    hookError(type, suiteChain, error) {
      failed += 1;
      console.error(`Hook ${type} failed in ${formatSuitePath(suiteChain.map((s) => s.name))}`);
      console.error(error?.stack ?? error);
    },
    summary() {
      const passed = total - failed;
      if (failed === 0) {
        console.log(`\n${passed}/${total} tests passed`);
      } else {
        console.error(`\n${passed}/${total} tests passed`);
      }
      return { total, failed };
    },
  };
}

const args = process.argv.slice(2);
if (args[0] === 'run') {
  args.shift();
}

if (args.length === 0) {
  console.error('No test files provided.');
  process.exit(1);
}

const resolvedFiles = args.map((file) => {
  const absolutePath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Test file not found: ${file}`);
    process.exitCode = 1;
  }
  return absolutePath;
}).filter(Boolean);

if (resolvedFiles.length === 0) {
  process.exit(process.exitCode ?? 1);
}

for (const file of resolvedFiles) {
  require(file);
}

const reporter = createReporter();
await runSuite(rootSuite, [], reporter);
const { failed } = reporter.summary();
if (failed > 0) {
  process.exit(1);
}
