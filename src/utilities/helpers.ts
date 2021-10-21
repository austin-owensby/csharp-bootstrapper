import { CSharp } from './csharp';

export function getNamespaceName(documentText: string): string{
	const match = documentText.match(/namespace\s+(\w+)/);
	if(match){
		return match[1];
	}
	return '';
}

export function toLowerCase(data: string): string {
	return data.charAt(0).toLowerCase() + data.slice(1);
}

export function addNamespace(usings: string[], fileNamespace: string, newNamespace: string): void {
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

export function getPropertyString(type: CSharp.Type): string {
	// Takes in a CSharp Property object and produces a string with the correctly formatted property to use in a request model
	let result = '';

	// Basic type
	if (typeof type === "number") {
		result += CSharp.BasicType[type as CSharp.BasicType];
	}
	// User defined type
	else if (type.hasOwnProperty('name')) {
		result += (type as CSharp.UserDefinedType).name;
	}
	// Collection
	else if (type.hasOwnProperty('collectionType')) {
		result += CSharp.CollectionType[(type as CSharp.Collection).collectionType as CSharp.CollectionType];
		result += `<${getPropertyString((type as CSharp.Collection).innerType)}>`;
	}

	return result;
}