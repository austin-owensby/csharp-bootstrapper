import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SettingsPanel } from './panels/settingsPanel';
import { CSharp } from './utilities/csharp';
import { getNamespaceName } from './utilities/helpers';
import { generateTypescriptClass, generateController , generateBackendService, generateBackendServiceInterface } from './utilities/generateFiles';

export function activate(context: vscode.ExtensionContext) {
	let rootPath: string = '';
	if (vscode.workspace.workspaceFolders !== undefined) {
		rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
	}

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

	// Generate a the CRUD workflow for the C# model based on the configurations
	context.subscriptions.push(vscode.commands.registerCommand('csharp-bootstrapper.bootstrap-crud', (uri:vscode.Uri) => {
		try{
			if (uri) {	
				// Get the document text
				const documentText: string = fs.readFileSync(uri.fsPath).toString();

				const namespaceName: string = getNamespaceName(documentText);
				const parsedClasses = CSharp.parseClasses(documentText);
				if (!parsedClasses.length) {
					vscode.window.showErrorMessage('C# Bootstrapper: No class name detected.');
					return;
				}

				// For each class, generate a controller, service, and service interface
				for (let parsedClass of parsedClasses) {
					// Backend service
					const serviceFileContents = generateBackendService(parsedClass, namespaceName);
					const backendServiceDirectory = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.directory', '');
					const backendServicePath = path.join(rootPath, backendServiceDirectory, `${parsedClass.className}Service.cs`);

					try {
						fs.writeFileSync(backendServicePath, serviceFileContents);
						// file written successfully, open it
						vscode.window.showTextDocument(vscode.Uri.file(backendServicePath), { preview: false, preserveFocus: true });
					} catch (e) {
						vscode.window.showErrorMessage('C# Bootstrapper: Error creating backend service.');
						console.error(e);
					}

					// Backend service interface
					const serviceInterfaceFileContents = generateBackendServiceInterface(parsedClass, namespaceName);
					const backendServiceInterfaceDirectory = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.interface.directory', '');
					const backendServiceInterfacePath = path.join(rootPath, backendServiceInterfaceDirectory, `I${parsedClass.className}Service.cs`);
					
					try {
						fs.writeFileSync(backendServiceInterfacePath, serviceInterfaceFileContents);
						// file written successfully, open it
						vscode.window.showTextDocument(vscode.Uri.file(backendServiceInterfacePath), { preview: false, preserveFocus: true });
					} catch (e) {
						vscode.window.showErrorMessage('C# Bootstrapper: Error creating backend service interface.');
						console.error(e);
					}				
					
					// Controller
					const controllerFileContents= generateController(parsedClass.className, namespaceName);
					const backendControllerDirectory = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.controller.directory', '');
					const backendControllerPath = path.join(rootPath, backendControllerDirectory, `${parsedClass.className}Controller.cs`);
					
					try {
						fs.writeFileSync(backendControllerPath, controllerFileContents);
						// file written successfully, navigate to it
						vscode.window.showTextDocument(vscode.Uri.file(backendControllerPath), { preview: false });
					} catch (e) {
						vscode.window.showErrorMessage('C# Bootstrapper: Error creating backend controller.');
						console.error(e);
					}
				}
			}
			else{
				vscode.window.showErrorMessage('C# Bootstrapper: No file found.');
			}
		}
		catch (e) {
			vscode.window.showErrorMessage('C# Bootstrapper: An unknown error occured.');
			console.error(e);
		}
	}));

	// Display a WebView to edit settings through a more focused GUI
	context.subscriptions.push(vscode.commands.registerCommand('csharp-bootstrapper.settings', () => {
		SettingsPanel.render(context.extensionUri);
	}));
}
 
export function deactivate() { }
