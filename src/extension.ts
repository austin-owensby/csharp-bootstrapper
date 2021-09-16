import * as vscode from 'vscode';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand("test-extension.convertModel", () => {
		try{
			// Get the active text editor
			const editor = vscode.window.activeTextEditor;
	
			if (editor) {
				let document = editor.document;
	
				// Get the document text
				const documentText = document.getText();
	
				// Get class name from the document
				const documentTextArray = documentText.split("class ");
				if(documentTextArray.length < 1){
					vscode.window.showErrorMessage("No class name detected.");
					return;
				}
	
				const textAfterClass = documentText.split("class ")[1];
				let className = textAfterClass.split(" ")[0].split(":")[0];
	
				// Generate the filename
				const lowercaseClassName = className.charAt(0).toLowerCase() + className.slice(1);
	
				if(!lowercaseClassName){
					vscode.window.showErrorMessage("No class name detected.");
					return;
				}
	
				const outputFilename = `${lowercaseClassName}.ts`;
	
				// Generate the file path
				let path = document.uri.path;
				let pathSplit = path.split("/");
				pathSplit[pathSplit.length - 1] = outputFilename;
				path = pathSplit.join("/");
	
				// Generate the file contents
				let fileContents = `export interface I${className} {\n`;
				fileContents += "}\n";
	
				try {
					fs.writeFileSync(path, fileContents);
					// file written successfully, navigate to it
					let newUri = document.uri.with({ path: path });
					vscode.window.showTextDocument(newUri, { preview: false });
				} catch (e) {
					vscode.window.showErrorMessage("Error creating typescript file.");
					console.error(e);
				}
			}
			else{
				vscode.window.showErrorMessage("No active file.");
			}
		}
		catch (e) {
			vscode.window.showErrorMessage("An unknown error occured.");
			console.error(e);
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
