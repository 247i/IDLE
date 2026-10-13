"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PythonKernelManager = void 0;
const vscode = require("vscode");
const services_1 = require("@jupyterlab/services");
class PythonKernelManager {
    constructor() {
        this.currentKernel = null;
        this.terminal = null;
        this.kernelManager = new services_1.KernelManager();
    }
    async startKernel() {
        try {
            // Start a Python kernel programmatically
            this.currentKernel = await this.kernelManager.startNew({
                name: 'python3'
            });
            // Launch IPython in terminal mode connected to this kernel
            await this.launchTerminalWithKernel();
            vscode.window.showInformationMessage('Python kernel started successfully');
            return true;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to start kernel: ${error}`);
            return false;
        }
    }
    async launchTerminalWithKernel() {
        if (!this.currentKernel)
            return;
        // Create terminal and launch IPython
        this.terminal = vscode.window.createTerminal({
            name: 'Python REPL',
            hideFromUser: false
        });
        // For now, just launch regular IPython
        // In a full implementation, you'd connect to the kernel
        this.terminal.sendText('ipython');
        this.terminal.show();
    }
    async isKernelAlive() {
        if (!this.currentKernel)
            return false;
        try {
            // Send a simple ping to check if kernel is responsive
            await this.currentKernel.requestExecute({ code: 'print("ping")' });
            return true;
        }
        catch {
            return false;
        }
    }
    async restartKernel() {
        if (this.currentKernel) {
            await this.currentKernel.restart();
            vscode.window.showInformationMessage('Kernel restarted');
        }
    }
    async shutdownKernel() {
        if (this.currentKernel) {
            await this.currentKernel.shutdown();
            this.currentKernel = null;
        }
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = null;
        }
    }
    getTerminal() {
        return this.terminal;
    }
}
exports.PythonKernelManager = PythonKernelManager;
//# sourceMappingURL=kernel-manager.js.map