/* eslint @typescript-eslint/camelcase: 0 */
import { useEffect, useCallback, useReducer, Reducer } from 'react';
import { RxCollection, RxQuery, isRxQuery, RxDocument } from 'rxdb';
import useRxCollection from './useRxCollection';

interface RxState<T> {
	result: T[] | RxDocument<T>[];
	isFetching: boolean;
	exhausted: boolean;
	limit: number;
}

interface RxData<T> extends RxState<T> {
	fetchMore: () => void;
	resetList: () => void;
}

interface RxDataJSON<T> extends RxData<T> {
	result: T[];
}

interface RxDataDoc<T> extends RxData<T> {
	result: RxDocument<T>[];
}

interface UseRxDataOptions {
	pageSize?: number;
	sortBy?: string;
	sortOrder?: 'asc' | 'desc';
	json?: boolean;
}

type QueryConstructor<T> = (
	collection: RxCollection<T>
) => RxQuery<T> | undefined;

enum ActionType {
	Reset = 'Reset',
	FetchMore = 'FetchMore',
	FetchSuccess = 'FetchSuccess',
}

interface ResetAction {
	type: ActionType.Reset;
	pageSize: number;
}

interface FetchMoreAction {
	type: ActionType.FetchMore;
	pageSize: number;
}

interface FetchSuccessAction<T> {
	type: ActionType.FetchSuccess;
	docs: T[];
}

type AnyAction<T> = ResetAction | FetchMoreAction | FetchSuccessAction<T>;

const reducer = <T>(state: RxState<T>, action: AnyAction<T>): RxState<T> => {
	switch (action.type) {
		case ActionType.Reset:
			return {
				...state,
				result: [],
				isFetching: true,
				limit: action.pageSize,
			};
		case ActionType.FetchMore:
			return {
				...state,
				isFetching: true,
				limit: state.limit + action.pageSize,
			};
		case ActionType.FetchSuccess:
			return {
				...state,
				result: action.docs,
				isFetching: false,
				exhausted: !state.limit || action.docs.length < state.limit,
			};
	}
};

function useRxData<T>(
	collectionName: string,
	queryConstructor?: QueryConstructor<T>,
	options?: UseRxDataOptions & { json: true }
): RxDataJSON<T>;

function useRxData<T>(
	collectionName: string,
	queryConstructor?: QueryConstructor<T>,
	options?: UseRxDataOptions & { json?: false }
): RxDataDoc<T>;

/**
 * Subscribes to specified query and provides results, also providing:
 *  - state indicators for fetching and list depletion
 *  - a fetchMore callback function for pagination support
 *  - a resetList callback function for conveniently reseting list data
 */
function useRxData<T>(
	collectionName: string,
	queryConstructor?: QueryConstructor<T>,
	options: UseRxDataOptions = {}
): RxData<T> {
	const { pageSize = 0, sortBy, sortOrder = 'desc', json } = options;

	const collection = useRxCollection<T>(collectionName);

	const initialState = {
		result: [],
		limit: pageSize,
		isFetching: true,
		exhausted: false,
	};

	const [state, dispatch] = useReducer<Reducer<RxState<T>, AnyAction<T>>>(
		reducer,
		initialState
	);

	const fetchMore = useCallback(() => {
		if (!state.limit || state.isFetching || state.exhausted) {
			return;
		}
		dispatch({ type: ActionType.FetchMore, pageSize });
	}, [state.limit, state.isFetching]);

	const resetList = useCallback(() => {
		if (!state.limit || state.limit <= pageSize) {
			return;
		}
		dispatch({ type: ActionType.Reset, pageSize });
	}, [pageSize, state.limit]);

	useEffect(() => {
		if (!collection || typeof queryConstructor !== 'function') {
			return;
		}

		let query = queryConstructor(collection);
		if (!isRxQuery(query)) {
			return;
		}

		if (state.limit) {
			query = query.limit(state.limit);
		}

		if (sortBy) {
			query = query.sort({
				[sortBy]: sortOrder,
			});
		}

		const sub = query.$.subscribe(
			(documents: RxDocument<T>[] | RxDocument<T>) => {
				const docs = Array.isArray(documents) ? documents : [documents];
				dispatch({
					type: ActionType.FetchSuccess,
					docs: json ? docs.map(doc => doc.toJSON()) : docs,
				});
			}
		);

		return (): void => {
			sub.unsubscribe();
		};
	}, [queryConstructor, collection, state.limit, sortBy, sortOrder]);

	return {
		...state,
		fetchMore,
		resetList,
	};
}

export default useRxData;
