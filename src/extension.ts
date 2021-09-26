import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as pluralize from 'pluralize';
import { stringify } from 'querystring';
import { CSharp } from './csharp';

export function activate(context: vscode.ExtensionContext) {
	let rootPath: string = '';
	if (vscode.workspace.workspaceFolders !== undefined) {
		rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
	}

	// Navigate to the Workspace's settings
	context.subscriptions.push(vscode.commands.registerCommand('csharp-bootstrapper.settings', () => {
		// For some reason this is really finikey and the only reliable way to trigger this
		vscode.commands.executeCommand('workbench.action.openWorkspaceSettings');
		vscode.commands.executeCommand('workbench.action.openSettings', 'C# Bootstrapper');
		vscode.commands.executeCommand('workbench.action.openWorkspaceSettings');
	}));

	// Generate a Typescript file based on the current C# model
	context.subscriptions.push(vscode.commands.registerCommand('csharp-bootstrapper.convert-model', (uri: vscode.Uri) => {
		try {
			if (uri) {
				// Get the document text
				const documentText: string = fs.readFileSync(uri.fsPath).toString();

				const parsedClasses = CSharp.parseClasses(documentText);
				if (!parsedClasses.length) {
					vscode.window.showErrorMessage('C# Bootstrapper: No class name detected.');
					return;

				}

				for (let parsedClass of parsedClasses) {
					// Generate the file path
					const frontendTargetDirectory: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.frontend.model.directory', '');
					const modelPath: string = path.join(rootPath, frontendTargetDirectory, `${parsedClass.className}.ts`);

					const fileContents: string = generateTypescriptClass(parsedClass.className);

					try {
						fs.writeFileSync(modelPath, fileContents);
						// file written successfully, navigate to it
						vscode.window.showTextDocument(vscode.Uri.file(modelPath), { preview: false });
					} catch (e) {
						vscode.window.showErrorMessage('C# Bootstrapper: Error creating typescript file.');
						console.error(e);
					}
				}
			}
			else {
				vscode.window.showErrorMessage('C# Bootstrapper: No file found.');
			}
		}
		catch (e) {
			vscode.window.showErrorMessage('C# Bootstrapper: An unknown error occured.');
			console.error(e);
		}
	}));
}

export function deactivate() { }

// Helper functions
function generateTypescriptClass(className: string): string {
	let fileContents: string = `export interface I${className} {\n`;



	fileContents += `}

export class ${className}Dto implements I${className} {
`;



	fileContents += `}

export class ${className} extends ${className}Dto {
	constructor(dto? : ${className}Dto){
		super();

		if (dto) {
			Object.assign(this, dto);
		}
	}
}
`;

	return fileContents;
}

function getLowerCaseClassName(className: string): string {
	return className.charAt(0).toLowerCase() + className.slice(1);
}