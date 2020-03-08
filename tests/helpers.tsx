import React, { FC } from 'react';
import RxDB, { RxDatabase } from 'rxdb';
import memoryAdapter from 'pouchdb-adapter-memory';

RxDB.plugin(memoryAdapter);

export interface Character {
	name: string;
	affiliation: string;
}

export const setup = async (
	documents: Character[],
	collectionName = 'test_collection'
): Promise<RxDatabase> => {
	const db = await RxDB.create({
		name: 'test_database',
		adapter: 'memory',
	});
	const collection = await db.collection({
		name: collectionName,
		schema: {
			title: 'characters',
			version: 0,
			type: 'object',
			properties: {
				_id: {
					type: 'string',
					primary: true,
				},
				name: {
					type: 'string',
					index: true,
				},
				affiliation: {
					type: 'string',
				},
			},
		},
	});
	await collection.bulkInsert(documents);
	return db;
};

export const teardown = async (db: RxDatabase): Promise<void> => {
	if (RxDB.isRxDatabase(db)) {
		db.remove();
	}
};

interface ConsumerProps {
	characters: Character[];
	isFetching: boolean;
	exhausted: boolean;
	resetList?: () => void;
	fetchMore?: () => void;
}

export const Consumer: FC<ConsumerProps> = ({
	characters,
	isFetching,
	exhausted,
	resetList,
	fetchMore,
}) => {
	const handleReset = (): void => {
		if (typeof resetList === 'function') {
			resetList();
		}
	};

	const handleMore = (): void => {
		if (typeof fetchMore === 'function') {
			fetchMore();
		}
	};

	return (
		<div>
			<ul>
				{characters.map((character, index) => (
					<li key={index} data-index={index}>
						{character.name}
					</li>
				))}
			</ul>
			<div>{exhausted ? 'exhausted' : null}</div>
			<div>{isFetching ? 'loading' : null}</div>
			<button onClick={handleReset}>reset</button>
			<button onClick={handleMore}>more</button>
		</div>
	);
};

export const sortByNameAsc = (a: Character, b: Character): number => {
	if (a.name < b.name) {
		return -1;
	}
	if (a.name > b.name) {
		return 1;
	}
	return 0;
};

export const sortByNameDesc = (a: Character, b: Character): number => {
	if (a.name < b.name) {
		return 1;
	}
	if (a.name > b.name) {
		return -1;
	}
	return 0;
};

export default RxDB;
