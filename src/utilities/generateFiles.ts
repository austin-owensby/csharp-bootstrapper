import * as pluralize from 'pluralize';
import * as vscode from 'vscode';
import { getLowerCaseClassName, addNamespace } from './helpers';

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

export function generateBackendService(className: string, classNamespace: string): string {
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

export function generateBackendServiceInterface(className: string, classNamespace: string){
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