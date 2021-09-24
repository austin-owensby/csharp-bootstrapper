namespace CSharp {
	export function parseClasses(documentText: string): ParsedClass[] {
		let matches = documentText.matchAll(/public class (\w+)[^{]*{((?:[^}{]+|{(?:[^}{]+|{[^}{]*})*})*)}/g);
		return Array.from(matches).filter(matchArray => matchArray[1]).map(matchArray => <ParsedClass>{
			className: matchArray[1],
			properties: parseProperties(matchArray[2])
		});
	}

	function parseProperties(classContents: string): Property[] {
		let matches = classContents.matchAll(/public (\w+)(\??) (\w+)\s?{\s?get;\s?set;\s?}/g);
		return Array.from(matches).filter(matchArray => matchArray[1] && matchArray[3]).map(matchArray => <Property>{
			name: matchArray[1],
			nullable: matchArray[2] === "?",
			type: parseType(matchArray[3])
		});
	}

	function parseType(unparsedType: string): Type {
		//TODO
		return BasicType.bool;
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
		dictionary,
		list,
		queue,
		sortedList,
		stack,
		arrayList,
		hashtable
	}

	type Type = BasicType | UserDefinedType | Collection;
}