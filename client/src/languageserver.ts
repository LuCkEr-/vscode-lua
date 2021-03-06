import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { workspace, ExtensionContext, env } from 'vscode';

let patch = require("./patch");

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
} from 'vscode-languageclient/node';
import { commands } from 'vscode';

let client: LanguageClient;

function registerCustomCommands(context: ExtensionContext) {
    context.subscriptions.push(commands.registerCommand('lua.config', (data) => {
        let config = workspace.getConfiguration()
        if (data.action == 'add') {
            let value: any[] = config.get(data.key);
            value.push(data.value);
            config.update(data.key, value);
            return;
        }
        if (data.action == 'set') {
            config.update(data.key, data.value);
            return;
        }
    }))
}

export function activate(context: ExtensionContext) {
    let language = env.language;

    // Options to control the language client
    let clientOptions: LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: [{ scheme: 'file', language: 'lua' }],
        synchronize: {
            // Notify the server about file changes to '.clientrc files contained in the workspace
            fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
        }
    };

    let beta: boolean = workspace.getConfiguration().get("Lua.zzzzzz.cat");
    //let beta: boolean = false;
    let develop: boolean = workspace.getConfiguration().get("Lua.develop.enable");
    let debuggerPort: number = workspace.getConfiguration().get("Lua.develop.debuggerPort");
    let debuggerWait: boolean = workspace.getConfiguration().get("Lua.develop.debuggerWait");
    let command: string;
    let platform: string = os.platform();
    switch (platform) {
        case "win32":
            command = context.asAbsolutePath(
                path.join(
                    'server',
                    'bin',
                    'Windows',
                    'lua-language-server.exe'
                )
            );
            break;
        case "linux":
            command = context.asAbsolutePath(
                path.join(
                    'server',
                    'bin',
                    'Linux',
                    'lua-language-server'
                )
            );
            fs.chmodSync(command, '777');
            break;
        case "darwin":
            command = context.asAbsolutePath(
                path.join(
                    'server',
                    'bin',
                    'macOS',
                    'lua-language-server'
                )
            );
            fs.chmodSync(command, '777');
            break;
    }

    let serverOptions: ServerOptions = {
        command: command,
        args: [
            '-E',
            '-e',
            `LANG="${language}";DEVELOP=${develop};DBGPORT=${debuggerPort};DBGWAIT=${debuggerWait}`,
            context.asAbsolutePath(path.join(
                'server',
                beta ? 'main-beta.lua' : 'main.lua',
            ))
        ]
    };

    client = new LanguageClient(
        'Lua',
        'Lua',
        serverOptions,
        clientOptions
    );

    client.registerProposedFeatures();
    registerCustomCommands(context);

    patch.patch(client);

    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
