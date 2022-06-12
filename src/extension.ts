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
	const toggleCommand = vscode.commands.registerCommand("rstfilter.toggle", () => {
		if (client) {
			stopClient();
		}
		else {
			startClient();
		}
	});
	context.subscriptions.push(toggleCommand);
	statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
	disbaleStauts();
	statusBar.show();

	const loadOnDefault: boolean = vscode.workspace.getConfiguration("ruby-rstfilter").get("enableOnDefault") || false;
	if (loadOnDefault) {
		startClient();
	}
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

function disbaleStauts() {
	statusBar.text = "$(extensions-sync-ignored) rstfilter";
	statusBar.tooltip = "rstfilter is disabled.";
	statusBar.command = "rstfilter.toggle";
}

function enableStatus() {
	statusBar.text = "$(extensions-sync-enabled) rstfilter";
	statusBar.tooltip = `rstfilter is enabled (${rstfilterVersion}).`;
	statusBar.command = "rstfilter.toggle";
}

function runningStauts(target: string) {
	statusBar.text = "$(sync~spin) rstfilter";
	statusBar.tooltip = `target: ${target}`;
}

function errorStatus(target: string, error: string) {
	statusBar.text = "$(testing-error-icon) rstfilter";
	statusBar.tooltip = `rstfilter got an error for ${target}:\n${error}`;
}

function startClient() {
	const rstfilterPath: string = vscode.workspace.getConfiguration("ruby-rstfilter").get("rstfilterPath") || "rstfilter";

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

	  client.onNotification("rstfilter/start", (params) => {
		const uri: string = params.uri;
		runningStauts(uri);
	  });

	  client.onNotification("rstfilter/done", (params) => {
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
}

function stopClient() {
	if (!client) {
		return undefined;
	}
	client.stop();
	client = undefined;
	disbaleStauts();
}

