import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
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
		vscode.commands.executeCommand('workbench.action.openSettings', 'csharp-bootstrapper');
		vscode.commands.executeCommand('workbench.action.openWorkspaceSettings');
	}));

	// Generate a Typescript file based on the current C# model
	context.subscriptions.push(vscode.commands.registerCommand('csharp-bootstrapper.convert-model', (uri: vscode.Uri) => {
		try {
			if (uri) {
				// Get the document text
				const documentText: string = fs.readFileSync(uri.fsPath).toString();

				const className: string = getClassName(documentText);

				if (!className) {
					vscode.window.showErrorMessage('C# Bootstrapper: No class name detected.');
					return;
				}

				// Generate the file path
				const frontendTargetDirectory: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.frontend.model.directory', '');
				const modelPath: string = path.join(rootPath, frontendTargetDirectory, `${className}.ts`);

				const fileContents: string = generateTypescriptClass(className);

				try {
					fs.writeFileSync(modelPath, fileContents);
					// file written successfully, navigate to it
					vscode.window.showTextDocument(vscode.Uri.file(modelPath), { preview: false });
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

	// Generate a the CRUD workflow for the C# model based on the configurations
	context.subscriptions.push(vscode.commands.registerCommand('csharp-bootstrapper.bootstrap-crud', (uri:vscode.Uri) => {
		try{
			if (uri) {	
				// Get the document text
				const documentText: string = fs.readFileSync(uri.path).toString();

				const className: string = getClassName(documentText);
				const namespaceName: string = getNamespaceName(documentText);

				if(!className){
					vscode.window.showErrorMessage('C# Bootstrapper: No class name detected.');
					return;
				}

				const serviceFileContents = generateBackendService(className, namespaceName);
				const backendServiceDirectory = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.directory', '');
				const backendServicePath = path.join(rootPath, backendServiceDirectory, `${className}Service.cs`);

				try {
					fs.writeFileSync(backendServicePath, serviceFileContents);
				} catch (e) {
					vscode.window.showErrorMessage('C# Bootstrapper: Error creating backend service.');
					console.error(e);
				}

				const serviceInterfaceFileContents= generateBackendServiceInterface(className, namespaceName);
				const backendServiceInterfaceDirectory = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.interface.directory', '');
				const backendServiceInterfacePath = path.join(rootPath, backendServiceDirectory, `I${className}Service.cs`);
				
				try {
					fs.writeFileSync(backendServiceInterfacePath, serviceInterfaceFileContents);
				} catch (e) {
					vscode.window.showErrorMessage('C# Bootstrapper: Error creating backend service interface.');
					console.error(e);
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

function generateBackendService(className: string, namespaceName: string): string {
	/* TODO
	 * 1. Fix assumptions about namespace structure (described in interface function)
	 * 2. Find the actual DB name in the DBContext
	 * 		a. Even if there are multiple DBContexts we should be able to used the pased in DBContext class name. 
	 * 			Maybe instead of having a DBContext name and namespace we should have a file path to it.
	 * 		b. Need to determine what to do if the are multiple DBSets for 1 class
	 * 3. Determine the Primary Key from the C# model
	 * 4. Generate Request classes based on the C# model
	 * 		a. Might need to add in a configruation on if we want to include children in the Request model
	 * 5. Add exceptions for Not Found responses
	 * 6. Will probably need to fix the assumption that we can just use Microsoft.EntityFrameworkCore as the DB context
	*/
	const dbContextNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.dbcontext.namespace', '');
	
	const usings: string[] = ['AutoMapper', 'Microsoft.EntityFrameworkCore', 'System', 'System.Collections.Generic', 'System.Threading.Tasks'];

	if(dbContextNamespace){
		usings.push(dbContextNamespace);
	}

	const dbContext: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.dbcontext.name', 'DBContext');

	const serviceNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.namespace', '');
	const serviceInterfaceNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.interface.namespace', '');

	// Only include the class namespace if its not in the service namespace's hierarchy
	if(!serviceNamespace.startsWith(namespaceName)){
		usings.push(namespaceName);
	}

	if(!serviceNamespace.startsWith(serviceInterfaceNamespace)){
		usings.push(serviceInterfaceNamespace);
	}

	// Sort and remove duplicate usings
	let serviceContents: string = usings.filter((v, i, a) => a.indexOf(v) === i).sort().map(u => `using ${u};`).join('\n') + '\n\n';

	const classContent: string = `public class ${className}Service: I${className}Service {
	private readonly IMapper mapper;
	private readonly ${dbContext} context;

	public ${className}Service(IMapper mapper, ${dbContext} context){
		this.mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
		this.context = context ?? throw new ArgumentNullException(nameof(context));
	}

	public async Task<${className}> Get${className}(int id){
		return await context.${pluralize(className)}.FindAsync(id);
	}

	public async Task<List<${className}>> Get${pluralize(className)}(){
		return await context.${pluralize(className)}.ToListAsync();
	}

	public async Task<${className}> Create${className}(Create${className}Request request){
		${className} ${getLowerCaseClassName(className)} = mapper.Map<${className}>(request);

		context.${pluralize(className)}.Add(${getLowerCaseClassName(className)});

		await context.SaveChangesAsync();

		return ${getLowerCaseClassName(className)};
	}

	public async Task<${className}> Update${className}(Update${className}Request request){
		${className} ${getLowerCaseClassName(className)} = await context.${pluralize(className)}.FindAsync(request.Id);

		${getLowerCaseClassName(className)} = mapper.Map<${className}>(request);

		await context.SaveChangesAsync();

		return ${getLowerCaseClassName(className)};
	}

	public async Task Delete${className}(int id){
		${className} ${getLowerCaseClassName(className)} = await context.${pluralize(className)}.FindAsync(id);

		context.${pluralize(className)}.Remove(${getLowerCaseClassName(className)});

		await context.SaveChangesAsync();
	}
}

public class Create${className}Request {

}

public class Update${className}Request {

}`;

	// If we have a defined namespace, tab over the class and add it
	if(serviceNamespace){
		serviceContents = `${serviceContents}namespace ${serviceNamespace} {
	${classContent.replaceAll('\n','\n\t')}
}`;
	}
	else{
		serviceContents += classContent;
	}

	return serviceContents;
}

function generateBackendServiceInterface(className: string, namespaceName: string){
	let usings: string[] = ['System.Threading.Tasks', 'System.Collections.Generic'];

	const serviceNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.namespace', '');
	const serviceInterfaceNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.interface.namespace', '');
	
	/* TODO, this would fail on the example
	 * Service Namespace: Project.Folder.Service
	 * Interface Namespace: Project.Folder.ServiceInterface
	 * I think I would need to check if the next character after the match:
	 * 		1. Does not exist
	 * 		2. Is a period
	 * Other cases may exist
	 */
	// Only include the class namespace if its not in the service interface namespace's hierarchy
	if(!serviceInterfaceNamespace.startsWith(namespaceName)){
		usings.push(namespaceName);
	}

	// Only include the service namespace if its not in the service interface namespace's hierarchy
	if(!serviceInterfaceNamespace.startsWith(serviceNamespace)){
		usings.push(serviceNamespace);
	}

	const interfaceContent: string = `public interface I${className}Service{
	public Task<${className}> Get${className}(int id);
	public Task<List<${className}>> Get${pluralize(className)}();
	public Task<${className}> Create${className}(Create${className}Request request);
	public Task<${className}> Update${className}(Update${className}Request request);
	public Task Delete${className}(int id);
}`;

	// Sort and remove duplicate usings
	let fileContents: string = usings.filter((v, i, a) => a.indexOf(v) === i).sort().map(u => `using ${u};`).join('\n') + '\n\n';

	// If we have a defined namespace, tab over the interface and add it
	if(serviceNamespace){
		fileContents = `${fileContents}namespace ${serviceInterfaceNamespace} {
	${interfaceContent.replaceAll('\n','\n\t')}
}`;
	}
	else{
		fileContents += interfaceContent;
	}

	return fileContents;
}

function getNamespaceName(documentText: string): string{
	const documentTextArray: string[] = documentText.split('namespace');
	if (documentTextArray.length <= 1) {
		return '';
	}

	return documentTextArray[1].trim().split(/\s+/)[0].trim();
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
