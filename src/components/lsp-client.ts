// lsp-client.ts
import * as vscode from 'vscode';
import { CloseAction, ErrorAction, MessageTransports } from 'vscode-languageclient/browser';
import { MonacoLanguageClient } from 'monaco-languageclient';
import { whenReady } from '@codingame/monaco-vscode-python-default-extension';
import {
    BrowserMessageReader,
    BrowserMessageWriter,
} from 'vscode-languageserver-protocol/browser';
import { Uri } from 'vscode';
import * as JSZip from 'jszip';

import { firmwareLoaderUrl } from '@/utils/firmware-loader';

const languageId = 'python';
let files: { [id: string]: string } = {};

/** Compare dotted version strings; returns >0 when `a` is newer than `b`. */
function compareVersions(a: string, b: string): number {
    const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
    const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const d = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (d !== 0) return d;
    }
    return 0;
}

/**
 * Resolve the URL of the newest XRPLib release's LSP zip from the firmware-loader
 * registry (boards/XRPLib/index.json). The zip is expected to already exist in
 * the release directory (boards/XRPLib/<version>/xrplib.zip).
 *
 * The language server loads XRPLib stubs before any robot is connected, so it
 * cannot know which XRPLib version is actually installed — the latest available
 * release is used as a reasonable default. Returns null if the registry can't be
 * read or has no usable versions, in which case the XRPLib stubs are skipped.
 */
async function resolveLatestXrplibZipUrl(): Promise<string | null> {
    try {
        const res = await fetch(firmwareLoaderUrl('boards/XRPLib/index.json'));
        if (!res.ok) return null;
        const json = await res.json();
        const versions: { dir?: string; version?: string }[] = Array.isArray(json?.versions)
            ? json.versions
            : [];
        let latestDir: string | undefined;
        let latestVersion: string | undefined;
        for (const v of versions) {
            if (!v?.dir || !v?.version) continue;
            if (latestVersion === undefined || compareVersions(v.version, latestVersion) > 0) {
                latestVersion = v.version;
                latestDir = v.dir;
            }
        }
        return latestDir ? firmwareLoaderUrl(`boards/XRPLib/${latestDir}/xrplib.zip`) : null;
    } catch (e) {
        console.error('resolveLatestXrplibZipUrl failed', e);
        return null;
    }
}

/**
 * read file contents from zip file using jszip
 * @param url url of the zip file
 * @returns object with file path and file contents
 */
async function readZipFile(url: string) {
    try {
        const response = await fetch(url);
        const data = await response.arrayBuffer();
        const results: { [id: string]: string } = {};
        const zip = await JSZip.loadAsync(data);
        // eslint-disable-next-line prefer-const
        for (let [filename, file] of Object.entries(zip.files)) {
            // skip directories which suffixed with '/'
            if (filename.endsWith('/')) {
                // console.info(`Skip directory ${filename}`);
                continue;
            }
            if (filename.startsWith('__MACOSX')) {
                // skip internal files
                continue;
            }
            // filename = filename.replace(/^stdlib/, '/workspace/typings');
            filename = filename.replace(/^(stdlib|stubs)/, '/$1');
            // filename = filename.replace(/^(stdlib|stubs)/, '/workspace/$1');
            //console.info(`Reading ${filename}`);
            results[filename] = await file.async('text');
        }
        console.info(`Read ${Object.keys(results).length} files`);
        // console.info(results);
        return results;
    } catch (error) {
        console.error(error);
        return {};
    }
}

export const initializedAndStartLanguageClient = async () => {
    console.log('Initialized and Start Language Client');

    let files1: { [id: string]: string } = {};
    let files2: { [id: string]: string } = {};
    files1 = await readZipFile(
        new URL('./stdlib-source-with-typeshed-pyi.zip', window.location.href).href,
    );
    const xrplibZipUrl = await resolveLatestXrplibZipUrl();
    if (xrplibZipUrl) {
        files2 = await readZipFile(xrplibZipUrl);
    }
    files = Object.assign({}, files1, files2);

    await whenReady();

    const pythonWorkerUrl = new URL(
        '@typefox/pyright-browser/dist/pyright.worker.js',
        import.meta.url,
    );
    console.info(`lsp-client.ts, pythonWorkerUrl: ${pythonWorkerUrl}`);
    const worker = new Worker(pythonWorkerUrl, { type: 'module' });
    worker.postMessage({
        type: 'browser/boot',
        mode: 'foreground',
    });
    const reader = new BrowserMessageReader(worker);
    const writer = new BrowserMessageWriter(worker);

    const languageClient = createLanguageClient({
        reader,
        writer,
    });
    languageClient.start();
    reader.onClose(() => languageClient.stop());

    const registerCommand = async (cmdName: string, handler: (...args: unknown[]) => void) => {
        // commands should not be there, but it demonstrates how to retrieve list of all external commands
        const commands = await vscode.commands.getCommands(true);
        if (!commands.includes(cmdName)) {
            vscode.commands.registerCommand(cmdName, handler);
        }
    };
    // always exectute the command with current language client
    await registerCommand('pyright.restartserver', (...args: unknown[]) => {
        languageClient.sendRequest('workspace/executeCommand', {
            command: 'pyright.restartserver',
            arguments: args,
        });
    });
    await registerCommand('pyright.organizeimports', (...args: unknown[]) => {
        languageClient.sendRequest('workspace/executeCommand', {
            command: 'pyright.organizeimports',
            arguments: args,
        });
    });
};

const createLanguageClient = (messageTransports: MessageTransports): MonacoLanguageClient => {
    return new MonacoLanguageClient({
        name: 'Python Language Client',
        clientOptions: {
            // use a language id as a document selector
            documentSelector: [languageId],
            // disable the default error handler
            errorHandler: {
                error: () => ({ action: ErrorAction.Continue }),
                closed: () => ({ action: CloseAction.DoNotRestart }),
            },
            workspaceFolder: {
                index: 0,
                name: '/',
                uri: Uri.file('/'),
            },
            synchronize: {
                fileEvents: [vscode.workspace.createFileSystemWatcher('**')],
            },
            initializationOptions: {
                files,
            },
        },
        // create a language client connection from the JSON RPC connection on demand
        messageTransports: messageTransports,
    });
};
