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
				const documentText: string = fs.readFileSync(uri.fsPath).toString();

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
				const backendServiceInterfacePath = path.join(rootPath, backendServiceInterfaceDirectory, `I${className}Service.cs`);
				
				try {
					fs.writeFileSync(backendServiceInterfacePath, serviceInterfaceFileContents);
				} catch (e) {
					vscode.window.showErrorMessage('C# Bootstrapper: Error creating backend service interface.');
					console.error(e);
				}

				const controllerFileContents= generateController(className, namespaceName);
				const backendControllerDirectory = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.controller.directory', '');
				const backendControllerPath = path.join(rootPath, backendControllerDirectory, `${className}Controller.cs`);
				
				try {
					fs.writeFileSync(backendControllerPath, controllerFileContents);
					// file written successfully, navigate to it
					vscode.window.showTextDocument(vscode.Uri.file(backendControllerPath), { preview: false });
				} catch (e) {
					vscode.window.showErrorMessage('C# Bootstrapper: Error creating backend controller.');
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

function generateBackendService(className: string, classNamespace: string): string {
	/* TODO
	 * 1. Find the actual DB name in the DBContext
	 * 		a. Even if there are multiple DBContexts we should be able to use the passed in DBContext class name. 
	 * 			Maybe instead of having a DBContext name and namespace we should have a file path to it.
	 * 		b. Need to determine what to do if the are multiple DBSets for 1 class
	 * 2. Determine the Primary Key from the C# model
	 * 3. Generate Request classes based on the C# model
	 * 		a. Might need to add in a configruation on if we want to include children in the Request model
	 * 4. Add exceptions for Not Found responses
	 * 5. Will probably need to fix the assumption that we can just use Microsoft.EntityFrameworkCore as the DB context
	 * 6. Need to consider what to do if multiple classes in same file when scaffolding CRUD, currently just take the first
	 * 7. Need to consider where AutoMapper file lives
	 * 8. Need to consider where to add service injection
	 * 9. Filename suffix schemes (Controller vs Service vs RequestHandler, etc)
	 * 10. Logging
	 * 11. Whether or not there are separate models for repo and db objects
	 * 12. Binding models vs dtos
	*/
	const dbContext: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.dbcontext.name', 'DBContext');
	const dbContextNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.dbcontext.namespace', '');
	const serviceNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.namespace', '');
	const serviceInterfaceNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.interface.namespace', '');
	
	const usings: string[] = ['AutoMapper', 'Microsoft.EntityFrameworkCore', 'System', 'System.Collections.Generic', 'System.Threading.Tasks'];

	addNamespace(usings, serviceNamespace, dbContextNamespace);
	addNamespace(usings, serviceNamespace, classNamespace);
	addNamespace(usings, serviceNamespace, serviceInterfaceNamespace);

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
		${className} ${toLowerCase(className)} = mapper.Map<${className}>(request);

		context.${pluralize(className)}.Add(${toLowerCase(className)});

		await context.SaveChangesAsync();

		return ${toLowerCase(className)};
	}

	public async Task<${className}> Update${className}(Update${className}Request request){
		${className} ${toLowerCase(className)} = await context.${pluralize(className)}.FindAsync(request.Id);

		${toLowerCase(className)} = mapper.Map<${className}>(request);

		await context.SaveChangesAsync();

		return ${toLowerCase(className)};
	}

	public async Task Delete${className}(int id){
		${className} ${toLowerCase(className)} = await context.${pluralize(className)}.FindAsync(id);

		context.${pluralize(className)}.Remove(${toLowerCase(className)});

		await context.SaveChangesAsync();
	}
}

public class Create${className}Request {

}

public class Update${className}Request {

}`;

	// If we have a defined namespace, tab over the class and add it
	if (serviceNamespace) {
		serviceContents = `${serviceContents}namespace ${serviceNamespace} {
	${classContent.replaceAll('\n','\n\t')}
}`;
	}
	else {
		serviceContents += classContent;
	}

	return serviceContents;
}

function generateBackendServiceInterface(className: string, classNamespace: string): string {
	const serviceNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.namespace', '');
	const serviceInterfaceNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.interface.namespace', '');
	
	let usings: string[] = ['System.Threading.Tasks', 'System.Collections.Generic'];

	addNamespace(usings, serviceInterfaceNamespace, classNamespace);
	addNamespace(usings, serviceInterfaceNamespace, serviceNamespace);

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
	if (serviceNamespace) {
		fileContents = `${fileContents}namespace ${serviceInterfaceNamespace} {
	${interfaceContent.replaceAll('\n','\n\t')}
}`;
	}
	else {
		fileContents += interfaceContent;
	}

	return fileContents;
}

function generateController(className: string, classNamespace: string): string {
	const controllerNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.controller.namespace', '');
	const serviceNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.namespace', '');
	const serviceInterfaceNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.interface.namespace', '');
	
	let usings: string[] = ['System', 'System.Threading.Tasks', 'System.Collections.Generic', 'Microsoft.AspNetCore.Mvc'];

	addNamespace(usings, controllerNamespace, classNamespace);
	addNamespace(usings, controllerNamespace, serviceNamespace);
	addNamespace(usings, controllerNamespace, serviceInterfaceNamespace);

	const classContent: string = `[ApiController]
[Route("[controller]")]
public class ${pluralize(className)}Controller: ControllerBase {

	private readonly I${className}Service ${toLowerCase(className)}Service;

	public ${pluralize(className)}Controller(I${className}Service ${toLowerCase(className)}Service){
		this.${toLowerCase(className)}Service = ${toLowerCase(className)}Service ?? throw new ArgumentNullException(nameof(${toLowerCase(className)}Service));
	}

	[HttpGet("{id}")]
	public async Task<${className}> Get${className}(int id){
		return await ${toLowerCase(className)}Service.Get${className}(id);
	}

	[HttpGet]
	public async Task<List<${className}>> Get${pluralize(className)}(){
		return await ${toLowerCase(className)}Service.Get${pluralize(className)}();
	}

	[HttpPost]
	public async Task<${className}> Create${className}([FromBody] Create${className}Request request){
		return Created(await ${toLowerCase(className)}Service.Create${className}(request));
	}

	[HttpPut("{id}")]
	public async Task<ActionResult<${className}>> Update${className}([FromBody] Update${className}Request request, int id){
		if(request.Id != id){
			return BadRequest();
		}

		return await ${toLowerCase(className)}Service.Update${className}(request);
	}

	[HttpDelete("{id}")]
	public async Task<IActionResult> Delete${className}(int id){
		await ${toLowerCase(className)}Service.Delete${className}(id);
		return NoContent();
	}
}`;

	// Sort and remove duplicate usings
	let fileContents: string = usings.filter((v, i, a) => a.indexOf(v) === i).sort().map(u => `using ${u};`).join('\n') + '\n\n';

	// If we have a defined namespace, tab over the class and add it
	if (controllerNamespace) {
		fileContents = `${fileContents}namespace ${controllerNamespace} {
	${classContent.replaceAll('\n','\n\t')}
}`;
	}
	else {
		fileContents += classContent;
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

function toLowerCase(data: string): string {
	return data.charAt(0).toLowerCase() + data.slice(1);
}

function addNamespace(usings: string[], fileNamespace: string, newNamespace: string): void {
	if (newNamespace) {
		// Add the new namespace if it doesn't start with the file's namespace
		if (fileNamespace.startsWith(newNamespace)) {
			if (newNamespace.length > fileNamespace.length) {
				if (newNamespace[fileNamespace.length] !== '.') {
					/* This logic handles cases like
					*	File namespace: Project.File.Service
					*	New  namespace: Project.File.ServiceInterface
					*/
					usings.push(newNamespace);
				}
			}
		}
		else {
			usings.push(newNamespace);
		}
	}
}
