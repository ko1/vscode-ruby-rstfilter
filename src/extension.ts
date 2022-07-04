// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { stat } from 'fs';
import * as vscode from 'vscode';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions
} from 'vscode-languageclient/node';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand("ruby-rstfilter.restart", () => {
		if (client) {
			stopClient();
		}
		startClient();
	}));

	context.subscriptions.push(vscode.commands.registerCommand("ruby-rstfilter.save_exec_and_show", async () => {
		if (!client) {
			client = startClient();
		}

		const editor = vscode.window.activeTextEditor;

		if (editor) {
			await editor.document.save();

			if (client && editor.document.languageId == "ruby") {
				client.sendNotification("rstfilter/start", {
					path: editor.document.uri.path
				});
			}
		}
	}));

	startClient();
}

// this method is called when your extension is deactivated
export function deactivate() {
	stopClient();
}

// control client

let client: LanguageClient | undefined;
let statusBar: vscode.StatusBarItem;
let rstfilterVersion: string;
let rstfilterOutput: vscode.OutputChannel;

function enableStatus() {
	statusBar.text = "rstfilter";
	statusBar.tooltip = `rstfilter is enabled (${rstfilterVersion}).`;
	statusBar.command = "ruby-rstfilter.save_exec_and_show";
	statusBar.show();
}

function runningStauts(target: string) {
	statusBar.text = "$(sync~spin) rstfilter";
	statusBar.tooltip = `target: ${target}`;
	statusBar.command = "ruby-rstfilter.restart";
}

function deleteStatus() {
	statusBar.hide();
	statusBar.dispose();
}

function startClient(): LanguageClient {
	statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
	statusBar.text = "$(sync~spin) rstfilter"; // loading
	statusBar.tooltip = "loading...";
	statusBar.show();

	const config = vscode.workspace.getConfiguration("ruby-rstfilter");
	const rstfilterPath: string = config.get("rstfilterLspPath") || "rstfilter-lsp";

	let serverOption: ServerOptions = {
		"command": rstfilterPath,
		"args": []
	};

	let clientOption: LanguageClientOptions = {
		documentSelector: [
			{scheme: "file", language: "ruby"}
		]
	};

	client = new LanguageClient(
		"vscode-rstfilter",
		"rstfilter extension",
		serverOption,
		clientOption
	  );

	  client.onNotification("rstfilter/version", (params) => {
		rstfilterVersion = params.version;
		enableStatus();
	  });

	  client.onNotification("rstfilter/started", (params) => {
		const uri: string = params.uri;
		runningStauts(uri);
	  });

	  client.onNotification("rstfilter/done", (_params) => {
		enableStatus();
	  });

	  client.onNotification("rstfilter/output", (params) => {
		if (!rstfilterOutput) {
			rstfilterOutput = vscode.window.createOutputChannel("rstfilter output");
		}
		rstfilterOutput.clear();
		rstfilterOutput.appendLine(params.output);
		rstfilterOutput.show(true);
	  });

	  client.start();

	  return client;
}

function stopClient() {
	if (!client) {
		return undefined;
	}
	client.stop();
	client = undefined;
	deleteStatus();
}

