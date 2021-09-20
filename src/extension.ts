import * as vscode from 'vscode';
import * as fs from 'fs';
import * as pluralize from 'pluralize';

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
	context.subscriptions.push(vscode.commands.registerCommand('csharp-bootstrapper.convertModel', (uri: vscode.Uri) => {
		try {
			if (uri) {
				// Get the document text
				const documentText: string = fs.readFileSync(uri.fsPath).toString();

				const className: string = getClassName(documentText);
				const lowercaseClassName: string = getLowerCaseClassName(className);

				if (!lowercaseClassName) {
					vscode.window.showErrorMessage('C# Bootstrapper: No class name detected.');
					return;
				}

				// Generate the file path
				let frontendTargetDirectory = vscode.workspace.getConfiguration().get('csharp-bootstrapper.frontendModelDirectory');
				const path: string = `${rootPath}\\${frontendTargetDirectory ? `${frontendTargetDirectory}\\` : ''}${className}.ts`;
				const fileContents: string = generateTypescriptClass(className);

				try {
					fs.writeFileSync(path, fileContents);
					// file written successfully, navigate to it
					vscode.window.showTextDocument(vscode.Uri.file(path), { preview: false });
				} catch (e) {
					vscode.window.showErrorMessage('C# Bootstrapper: Error creating typescript file.');
					console.error(e);
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
	let fileContents = `export interface I${className} {\n`;



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

function getClassName(documentText: string): string {
	// TODO: Replace with regex that covers all the cases
	const documentTextArray: string[] = documentText.split('class ');
	if (documentTextArray.length <= 1) {
		vscode.window.showErrorMessage('No class name detected.');
		return '';
	}

	const textAfterClass: string = documentTextArray[1];
	// TODO: Replace with regex that covers all the cases
	return textAfterClass.trim().split(/\s+/)[0].split(':')[0].trim();
}

function getLowerCaseClassName(className: string): string {
	return className.charAt(0).toLowerCase() + className.slice(1);
}
