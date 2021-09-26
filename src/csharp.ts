export namespace CSharp {
	export function parseClasses(documentText: string): ParsedClass[] {
		let matches = documentText.matchAll(/public class (\w+)[^{]*{((?:[^}{]+|{(?:[^}{]+|{[^}{]*})*})*)}/g);
		return Array.from(matches).filter(matchArray => matchArray[1]).map(matchArray => <ParsedClass>{
			className: matchArray[1],
			properties: parseProperties(matchArray[2])
		});
	}

	function parseProperties(classContents: string): Property[] {
		// TODO: This doesn't catch lists of nullable types
		// TODO: Doesn't handle multiple parameters in generic, like Dictionary
		let matches = classContents.matchAll(/public ([\w<>]+)(\??) (\w+)\s?{\s?get;\s?set;\s?}/g);
		return Array.from(matches).filter(matchArray => matchArray[1] && matchArray[3]).map(matchArray => <Property>{
			type: parseType(matchArray[1]),
			nullable: matchArray[2] === "?",
			name: matchArray[3]
		});
	}

	function parseType(unparsedType: string): Type {
		let collectionMatch = unparsedType.match(`(?:${Object.keys(CollectionType).filter(k => isNaN(<any>k)).join('|')})<(.*)>$`);
		if (collectionMatch?.[0]) {
			return <Collection>{
				innerType: parseType(collectionMatch[1]),
				collectionType: CollectionType[collectionMatch[0] as keyof typeof CollectionType]
			};
		}
		return BasicType[unparsedType as keyof typeof BasicType] ?? <UserDefinedType>{
			name: unparsedType
		};
	}

	export class ParsedClass {
		className!: string;
		properties!: Property[];
	}

	export class Property {
		name!: string;
		type!: Type;
		nullable!: boolean;
	}

	export enum BasicType {
		bool,
		byte,
		sbyte,
		char,
		decimal,
		double,
		float,
		int,
		uint,
		nint,
		nuint,
		long,
		ulong,
		short,
		ushort,
		object,
		string,
		dynamic
	}

	export class UserDefinedType {
		name!: string;
		//TODO: Need any more info?
	}

	export class Collection {
		innerType!: Type;
		collectionType!: CollectionType;
		// TODO: Also handle generic types?
	}

	enum CollectionType {
		/* eslint-disable @typescript-eslint/naming-convention */
		Dictionary,
		List,
		Queue,
		SortedList,
		Stack,
		ArrayList,
		Hashtable
		/* eslint-disable @typescript-eslint/naming-convention */
	}

	type Type = BasicType | UserDefinedType | Collection;
}