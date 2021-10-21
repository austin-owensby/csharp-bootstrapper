import * as pluralize from 'pluralize';
import * as vscode from 'vscode';
import { toLowerCase, addNamespace, getPropertyString } from './helpers';
import { CSharp } from './csharp';

export function generateTypescriptClass(className: string): string {
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

export function generateBackendService(parsedClass: CSharp.ParsedClass, classNamespace: string): string {
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

	const className: string = parsedClass.className;
	// Assume that the first property is the primary key
	const primaryKey: CSharp.Property = parsedClass.properties[0];

	// Sort and remove duplicate usings
	let serviceContents: string = usings.filter((v, i, a) => a.indexOf(v) === i).sort().map(u => `using ${u};`).join('\n') + '\n\n';

	const classContent: string = `public class ${className}Service: I${className}Service {
	private readonly IMapper mapper;
	private readonly ${dbContext} context;
	public ${className}Service(IMapper mapper, ${dbContext} context){
		this.mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
		this.context = context ?? throw new ArgumentNullException(nameof(context));
	}
	public async Task<${className}> Get${className}(${CSharp.BasicType[primaryKey.type as CSharp.BasicType]} ${toLowerCase(primaryKey.name)}){
		return await context.${pluralize(className)}.FindAsync(${toLowerCase(primaryKey.name)});
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
		${className} ${toLowerCase(className)} = await context.${pluralize(className)}.FindAsync(request.${primaryKey.name});
		${toLowerCase(className)} = mapper.Map<${className}>(request);
		await context.SaveChangesAsync();
		return ${toLowerCase(className)};
	}
	public async Task Delete${className}(${CSharp.BasicType[primaryKey.type as CSharp.BasicType]} ${toLowerCase(primaryKey.name)}){
		${className} ${toLowerCase(className)} = await context.${pluralize(className)}.FindAsync(${toLowerCase(primaryKey.name)});
		context.${pluralize(className)}.Remove(${toLowerCase(className)});
		await context.SaveChangesAsync();
	}
}
public class Create${className}Request {
${parsedClass.properties.slice(1).map(p => `\tpublic ${getPropertyString(p.type)}${p.nullable ? '?' : ''} ${p.name} { get; set; }`).join('\n')}
}
public class Update${className}Request {
${parsedClass.properties.map(p => `\tpublic ${getPropertyString(p.type)}${p.nullable ? '?' : ''} ${p.name} { get; set; }`).join('\n')}
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

export function generateBackendServiceInterface(parsedClass: CSharp.ParsedClass, classNamespace: string){
	const serviceNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.namespace', '');
	const serviceInterfaceNamespace: string = vscode.workspace.getConfiguration().get('csharp-bootstrapper.backend.service.interface.namespace', '');
	
	let usings: string[] = ['System.Threading.Tasks', 'System.Collections.Generic'];

	addNamespace(usings, serviceInterfaceNamespace, classNamespace);
	addNamespace(usings, serviceInterfaceNamespace, serviceNamespace);

	const className: string = parsedClass.className;
	// Assume that the first property is the primary key
	const primaryKey: CSharp.Property = parsedClass.properties[0];

	// If the first field in a basic type and starts with a capital letter, we will need to include the System namespace
	if (typeof primaryKey.type === "number") {
		const firstCharCode: number = CSharp.BasicType[primaryKey.type as CSharp.BasicType].charCodeAt(0);
		if ("A".charCodeAt(0) <= firstCharCode && firstCharCode <= "Z".charCodeAt(0)) {
			usings.push('System');
		}
	}

	const interfaceContent: string = `public interface I${className}Service{
	Task<${className}> Get${className}(${CSharp.BasicType[primaryKey.type as CSharp.BasicType]} ${toLowerCase(primaryKey.name)});
	Task<List<${className}>> Get${pluralize(className)}();
	Task<${className}> Create${className}(Create${className}Request request);
	Task<${className}> Update${className}(Update${className}Request request);
	Task Delete${className}(${CSharp.BasicType[primaryKey.type as CSharp.BasicType]} ${toLowerCase(primaryKey.name)});
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

export function generateController(className: string, classNamespace: string): string {
	/*
		TODO
		1. Add option for ProducesResponseType attributes
		2. Sync vs. Async option, will affect service too
		3. More options about response types (CreatedAtAction vs. Created vs. a normal 200 respones)
	*/
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
	public async Task<ActionResult<${className}>> Create${className}([FromBody] Create${className}Request request){
		${className} ${toLowerCase(className)} = await ${toLowerCase(className)}Service.Create${className}(request);
		return CreatedAtAction(nameof(Get${className}), new {id = ${toLowerCase(className)}.Id}, ${toLowerCase(className)});
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