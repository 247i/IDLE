"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JasmineAdapter = void 0;
const tslib_1 = require("tslib");
const child_process_1 = require("child_process");
const os = require("os");
const fs = require("fs-extra");
const url_1 = require("url");
const minimatch_1 = require("minimatch");
const path = require("path");
const stackTrace = require("stack-trace");
const stream = require("stream");
const vscode = require("vscode");
const vscode_test_adapter_util_1 = require("vscode-test-adapter-util");
class JasmineAdapter {
    constructor(workspaceFolder, channel, log) {
        this.workspaceFolder = workspaceFolder;
        this.channel = channel;
        this.log = log;
        this.disposables = [];
        this.testsEmitter = new vscode.EventEmitter();
        this.testStatesEmitter = new vscode.EventEmitter();
        this.autorunEmitter = new vscode.EventEmitter();
        this.nodesById = new Map();
        this.disposables.push(this.testsEmitter);
        this.disposables.push(this.testStatesEmitter);
        this.disposables.push(this.autorunEmitter);
        this.disposables.push(vscode.workspace.onDidChangeConfiguration((configChange) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.log.info('Configuration changed');
            if (configChange.affectsConfiguration('jasmineExplorer.cwd', this.workspaceFolder.uri) ||
                configChange.affectsConfiguration('jasmineExplorer.config', this.workspaceFolder.uri) ||
                configChange.affectsConfiguration('jasmineExplorer.env', this.workspaceFolder.uri) ||
                configChange.affectsConfiguration('jasmineExplorer.nodePath', this.workspaceFolder.uri) ||
                configChange.affectsConfiguration('jasmineExplorer.nodeArgv', this.workspaceFolder.uri) ||
                configChange.affectsConfiguration('jasmineExplorer.jasminePath', this.workspaceFolder.uri)) {
                this.log.info('Sending reload event');
                this.config = undefined;
                this.load();
            }
            else if (configChange.affectsConfiguration('jasmineExplorer.debuggerPort', this.workspaceFolder.uri) ||
                configChange.affectsConfiguration('jasmineExplorer.debuggerConfig', this.workspaceFolder.uri) ||
                configChange.affectsConfiguration('jasmineExplorer.breakOnFirstLine', this.workspaceFolder.uri) ||
                configChange.affectsConfiguration('jasmineExplorer.debuggerSkipFiles', this.workspaceFolder.uri)) {
                this.config = yield this.loadConfig();
            }
        })));
        this.disposables.push(vscode.workspace.onDidSaveTextDocument(document => {
            if (!this.config)
                return;
            const filename = document.uri.fsPath;
            if (this.log.enabled)
                this.log.info(`${filename} was saved - checking if this affects ${this.workspaceFolder.uri.fsPath}`);
            if (filename === this.config.configFilePath) {
                this.log.info('Sending reload event');
                this.config = undefined;
                this.load();
                return;
            }
            for (const glob of this.config.testFileGlobs) {
                if (glob.match(filename)) {
                    if (this.log.enabled)
                        this.log.info(`Sending reload event because ${filename} is a test file`);
                    this.load();
                    return;
                }
            }
            if (filename.startsWith(this.workspaceFolder.uri.fsPath)) {
                this.log.info('Sending autorun event');
                this.autorunEmitter.fire();
            }
        }));
    }
    get tests() {
        return this.testsEmitter.event;
    }
    get testStates() {
        return this.testStatesEmitter.event;
    }
    get autorun() {
        return this.autorunEmitter.event;
    }
    load() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.testsEmitter.fire({ type: 'started' });
            if (!this.config) {
                this.config = yield this.loadConfig();
            }
            const config = this.config;
            if (!config) {
                this.testsEmitter.fire({ type: 'finished', suite: undefined });
                return;
            }
            if (this.log.enabled)
                this.log.info(`Loading test files of ${this.workspaceFolder.uri.fsPath} using ${this.getConfigLog()}`);
            let rootSuite = {
                type: 'suite',
                id: 'root',
                label: 'Jasmine',
                children: []
            };
            let errorMessage;
            yield new Promise(resolve => {
                const args = [
                    config.jasminePath,
                    config.configFilePath,
                    JSON.stringify(config.testFileGlobs.map(glob => glob.pattern)),
                    JSON.stringify(this.log.enabled)
                ];
                this.stderr = Buffer.alloc(0);
                const loadingTestsProcess = (0, child_process_1.fork)(require.resolve('./worker/loadTests.js'), args, {
                    cwd: config.cwd,
                    env: config.env,
                    execPath: config.nodePath,
                    execArgv: config.nodeArgv,
                    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
                });
                this.pipeProcess(loadingTestsProcess);
                loadingTestsProcess.on('message', (message) => {
                    if (typeof message === 'string') {
                        this.log.info(`Worker: ${message}`);
                    }
                    else {
                        rootSuite = message;
                    }
                });
                loadingTestsProcess.on('exit', (code, signal) => {
                    var _a;
                    if (code || signal) {
                        errorMessage = `The Jasmine test loader worker process finished with code ${code} and signal ${signal}.\n${(_a = this.stderr) === null || _a === void 0 ? void 0 : _a.toString()}`;
                    }
                    this.log.info('Worker finished');
                    resolve();
                });
            });
            this.createFileSuites(rootSuite);
            this.nodesById.clear();
            this.collectNodesById(rootSuite);
            if (errorMessage) {
                this.testsEmitter.fire({ type: 'finished', errorMessage });
            }
            else if (rootSuite.children.length > 0) {
                this.testsEmitter.fire({ type: 'finished', suite: rootSuite });
            }
            else {
                this.testsEmitter.fire({ type: 'finished', suite: undefined });
            }
        });
    }
    run(testsToRun, execArgv = []) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const config = this.config;
            if (!config)
                return;
            if (this.log.enabled)
                this.log.info(`Running test(s) ${JSON.stringify(testsToRun)} of ${this.workspaceFolder.uri.fsPath} using ${this.getConfigLog()}`);
            this.testStatesEmitter.fire({ type: 'started', tests: testsToRun });
            const testfiles = new Map();
            for (const suiteOrTestId of testsToRun) {
                const node = this.nodesById.get(suiteOrTestId);
                if (node) {
                    this.collectTestfiles(node, testfiles);
                }
            }
            const tests = [];
            for (const test of testfiles.keys()) {
                tests.push(test);
            }
            const args = {
                jasminePath: config.jasminePath,
                configFile: config.configFilePath,
                logEnabled: this.log.enabled,
                testsToRun: tests,
            };
            return new Promise((resolve) => {
                this.stderr = Buffer.alloc(0);
                this.runningTestProcess = (0, child_process_1.fork)(require.resolve('./worker/runTests.js'), [], {
                    cwd: config.cwd,
                    env: config.env,
                    execPath: config.nodePath,
                    execArgv: execArgv.concat(config.nodeArgv),
                    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
                });
                this.pipeProcess(this.runningTestProcess);
                this.runningTestProcess.send(args);
                this.runningTestProcess.on('message', (message) => {
                    if (typeof message === 'string') {
                        this.log.info(`Worker: ${message}`);
                    }
                    else {
                        if (this.log.enabled)
                            this.log.info(`Received ${JSON.stringify(message)}`);
                        if (message.failures) {
                            message.decorations = this.createDecorations(message, testfiles);
                            delete message.failures;
                        }
                        this.testStatesEmitter.fire(message);
                    }
                });
                this.runningTestProcess.on('exit', () => {
                    this.log.info('Worker finished');
                    this.runningTestProcess = undefined;
                    this.testStatesEmitter.fire({ type: 'finished' });
                    resolve();
                });
            });
        });
    }
    debug(testsToRun) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this.config || (testsToRun.length === 0)) {
                return;
            }
            if (this.log.enabled)
                this.log.info(`Debugging test(s) ${JSON.stringify(testsToRun)} of ${this.workspaceFolder.uri.fsPath}`);
            let currentSession;
            if (this.config.breakOnFirstLine) {
                const node = this.nodesById.get(testsToRun[0]);
                if (node && node.file && node.line) {
                    const fileURI = vscode.Uri.file(node.file);
                    const breakpoint = new vscode.SourceBreakpoint(new vscode.Location(fileURI, new vscode.Position(node.line + 1, 0)));
                    vscode.debug.addBreakpoints([breakpoint]);
                    const subscription = vscode.debug.onDidTerminateDebugSession((session) => {
                        if (currentSession != session) {
                            return;
                        }
                        vscode.debug.removeBreakpoints([breakpoint]);
                        subscription.dispose();
                    });
                }
            }
            const promise = this.run(testsToRun, [`--inspect-brk=${this.config.debuggerPort}`]);
            if (!promise || !this.runningTestProcess) {
                this.log.error('Starting the worker failed');
                return;
            }
            this.log.info('Starting the debug session');
            yield vscode.debug.startDebugging(this.workspaceFolder, this.config.debuggerConfig || {
                name: 'Debug Jasmine Tests',
                type: 'pwa-node',
                request: 'attach',
                port: this.config.debuggerPort,
                continueOnAttach: true,
                autoAttachChildProcesses: false,
                skipFiles: [
                    '<node_internals>/**'
                ]
            });
            yield new Promise(resolve => setImmediate(resolve));
            currentSession = vscode.debug.activeDebugSession;
            if (!currentSession) {
                this.log.error('No active debug session - aborting');
                this.cancel();
                return;
            }
            const subscription = vscode.debug.onDidTerminateDebugSession((session) => {
                if (currentSession != session) {
                    return;
                }
                this.log.info('Debug session ended');
                this.cancel();
                subscription.dispose();
            });
            return promise;
        });
    }
    cancel() {
        if (this.runningTestProcess) {
            this.log.info('Killing running test process');
            this.runningTestProcess.kill();
        }
    }
    dispose() {
        this.cancel();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
        this.nodesById.clear();
    }
    pipeProcess(process) {
        const customStream = new stream.Writable();
        customStream._write = (data, encoding, callback) => {
            this.stderr = Buffer.concat([this.stderr, data]);
            this.channel.append(data.toString());
            callback();
        };
        process.stderr.pipe(customStream);
        process.stdout.pipe(customStream);
    }
    loadConfig() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const adapterConfig = vscode.workspace.getConfiguration('jasmineExplorer', this.workspaceFolder.uri);
            const cwd = path.resolve(this.workspaceFolder.uri.fsPath, adapterConfig.get('cwd') || '');
            const relativeConfigFilePath = adapterConfig.get('config') || 'spec/support/jasmine.json';
            const configFilePath = path.resolve(cwd, relativeConfigFilePath);
            if (this.log.enabled)
                this.log.debug(`Using config file: ${configFilePath}`);
            let jasmineConfig;
            try {
                jasmineConfig = yield fs.readJson(configFilePath);
            }
            catch (e) {
                return undefined;
            }
            const specDir = path.resolve(cwd, jasmineConfig.spec_dir);
            const specRealDir = yield fs.realpath(specDir);
            if (this.log.enabled)
                this.log.debug(`Using specDir: ${specDir}, specRealDir; ${specRealDir}`);
            const testFileGlobs = [];
            for (const relativeGlob of jasmineConfig.spec_files) {
                let absoluteGlob = path.resolve(cwd, jasmineConfig.spec_dir, relativeGlob);
                if (os.platform() === 'win32') {
                    absoluteGlob = absoluteGlob.replace(/\\/g, '/');
                }
                if (this.log.enabled)
                    this.log.debug(`Using test file glob: ${absoluteGlob}`);
                testFileGlobs.push(new minimatch_1.Minimatch(absoluteGlob));
            }
            const processEnv = process.env;
            const configEnv = adapterConfig.get('env') || {};
            if (this.log.enabled)
                this.log.debug(`Using environment variable config: ${JSON.stringify(configEnv)}`);
            const env = Object.assign({}, processEnv);
            for (const prop in configEnv) {
                const val = configEnv[prop];
                if ((val === undefined) || (val === null)) {
                    delete env.prop;
                }
                else {
                    env[prop] = String(val);
                }
            }
            let nodePath = adapterConfig.get('nodePath') || undefined;
            if (nodePath === 'default') {
                nodePath = yield (0, vscode_test_adapter_util_1.detectNodePath)();
            }
            if (this.log.enabled)
                this.log.debug(`Using nodePath: ${nodePath}`);
            let nodeArgv = adapterConfig.get('nodeArgv') || [];
            if (this.log.enabled)
                this.log.debug(`Using node arguments: ${nodeArgv}`);
            let jasminePath = adapterConfig.get('jasminePath');
            if (typeof jasminePath === 'string') {
                if (jasminePath === 'default') {
                    const localJasminePath = path.resolve(this.workspaceFolder.uri.fsPath, 'node_modules/jasmine');
                    const hasLocalJasmine = yield new Promise(resolve => {
                        fs.stat(localJasminePath, (err, stats) => {
                            resolve(!err && stats.isDirectory());
                        });
                    });
                    if (hasLocalJasmine) {
                        jasminePath = localJasminePath;
                    }
                    else {
                        jasminePath = require.resolve('jasmine');
                    }
                }
                else {
                    jasminePath = path.resolve(this.workspaceFolder.uri.fsPath, jasminePath);
                }
            }
            else {
                jasminePath = require.resolve('jasmine');
            }
            const debuggerPort = adapterConfig.get('debuggerPort') || 9229;
            const debuggerConfig = adapterConfig.get('debuggerConfig') || undefined;
            const breakOnFirstLine = adapterConfig.get('breakOnFirstLine') || false;
            if (this.log.enabled)
                this.log.debug(`Using breakOnFirstLine: ${breakOnFirstLine}`);
            const debuggerSkipFiles = adapterConfig.get('debuggerSkipFiles') || [];
            return { cwd, configFilePath, specDir, specRealDir, testFileGlobs, env, nodePath, nodeArgv, jasminePath, debuggerPort, debuggerConfig, breakOnFirstLine, debuggerSkipFiles };
        });
    }
    getConfigLog() {
        if (!this.config) {
            return "no config";
        }
        const { configFilePath, cwd, jasminePath, nodeArgv, nodePath, specDir, specRealDir } = this.config;
        return JSON.stringify({ configFilePath, cwd, jasminePath, nodeArgv, nodePath, specDir, specRealDir });
    }
    createFileSuites(rootSuite) {
        const testsByFile = {};
        const testsWithoutFile = [];
        for (const child of rootSuite.children) {
            if (!child.file) {
                testsWithoutFile.push(child);
            }
            else {
                let file = child.file;
                try {
                    file = (0, url_1.fileURLToPath)(file);
                }
                catch (_a) { }
                if (!testsByFile[file]) {
                    let baseDir = this.config.specRealDir;
                    if (file.startsWith(this.config.specDir) &&
                        !file.startsWith(this.config.specRealDir)) {
                        baseDir = this.config.specDir;
                    }
                    testsByFile[file] = {
                        type: 'suite',
                        id: file,
                        file,
                        label: file.replace(baseDir, '').replace(/^\//, ''),
                        children: [],
                    };
                }
                testsByFile[file].children.push(child);
            }
        }
        const fileSuites = [];
        Object.keys(testsByFile).sort((a, b) => {
            return a.toLocaleLowerCase() < b.toLocaleLowerCase() ? -1 : 1;
        }).forEach(file => fileSuites.push(testsByFile[file]));
        rootSuite.children = fileSuites.concat(testsWithoutFile);
    }
    collectNodesById(info) {
        this.nodesById.set(info.id, info);
        if (info.type === 'suite') {
            for (const child of info.children) {
                this.collectNodesById(child);
            }
        }
    }
    collectTestfiles(info, testfiles) {
        if (info.type === 'suite') {
            for (const child of info.children) {
                this.collectTestfiles(child, testfiles);
            }
        }
        else {
            if (info.file) {
                testfiles.set(info.id, info.file);
            }
        }
    }
    createDecorations(event, testfiles) {
        const testfile = testfiles.get(event.test);
        const decorations = [];
        if (testfile && event.failures) {
            if (this.log.enabled)
                this.log.info(`Adding ${event.failures.length} failure decorations to ${testfile}`);
            for (const failure of event.failures) {
                const decoration = this.createDecoration(failure, testfile);
                if (decoration) {
                    decorations.push(decoration);
                }
            }
        }
        return decorations;
    }
    createDecoration(failure, testfile) {
        if (this.log.enabled)
            this.log.debug(`Trying to parse stack trace: ${JSON.stringify(failure.stack)}`);
        const error = { name: '', message: '', stack: failure.stack };
        const stackFrames = stackTrace.parse(error);
        for (const stackFrame of stackFrames) {
            if (stackFrame.getFileName() === testfile) {
                return {
                    line: stackFrame.getLineNumber() - 1,
                    message: failure.message
                };
            }
        }
        this.log.debug('No matching stack frame found');
        return undefined;
    }
}
exports.JasmineAdapter = JasmineAdapter;
//# sourceMappingURL=adapter.js.map