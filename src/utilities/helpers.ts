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
		if (fileNamespace?.startsWith(newNamespace)) {
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

export function arrangeIntoTree(paths: string[][]): any[] {
    // Adapted from http://brandonclapp.com/arranging-an-array-of-flat-paths-into-a-json-tree-like-structure/
    let tree: any[] = [];

    for (var i = 0; i < paths.length; i++) {
        var path = paths[i];
        var currentLevel = tree;
        for (var j = 0; j < path.length; j++) {
            var part = path[j];

            var existingPath = findWhere(currentLevel, 'name', part);

            if (existingPath) {
                currentLevel = existingPath.children;
            } else {
                const newPart = {
                    name: part,
                    children: [],
                };

                currentLevel.push(newPart);
                currentLevel = newPart.children;
            }
        }
    }
    return tree;

	function findWhere(array: any[], key: string, value: string) {
		// Adapted from https://stackoverflow.com/questions/32932994/findwhere-from-underscorejs-to-jquery
		let t = 0; // t is used as a counter
		while (t < array.length && array[t][key] !== value) { t++; }; // find the index where the id is the as the aValue

		if (t < array.length) {
			return array[t];
		} else {
			return false;
		}
	}
}

export function printTree(branch: any): string {
	let treeHtml: string = '';

	if (branch.children.length > 0){
		treeHtml += `<li>${branch.name}</li>`;
		treeHtml += '<ul>';
	  
		for (let child of branch.children){
			treeHtml += printTree(child);
		}

		treeHtml += '</ul>';
	}
	else{
		treeHtml += `<li class="file">${branch.name}</li>`;
	}

	return treeHtml;
}