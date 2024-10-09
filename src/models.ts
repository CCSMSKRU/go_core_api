export interface QueryParams {
    useUUIDIgnoreAgreeStorageKey?: string
    useUUIDAskAgreeFn?: (cb: (result: boolean) => void) => void;
    /**
     * Overridden from cookie by useUUIDIgnoreAgreeStorageKey
     */
    useUUIDIgnoreAgree?: boolean
    uuidAgreeStorageKey?: string
    useUUID?: boolean
    uuidStorageKey?: string
    lang?: string
    skipSetTokenOnLogin?: boolean
    loginTokenFieldName?: string
    loginObject?: string
    loginCommand?: string
    https?: boolean;
    host?: string;
    port?: number | string;
    url?: string;
    path?: string;
    useAJAX?: any;
    extraHeaders?: any;
    transports?: any;
    withCredentials?: any;
    device_type?: string;
    device_info?: any;
    env?: string;
    autoAuth?: boolean;
    authFunction?: any;
    authFn?: any;
    toMainFn?: any;
    toMainFunction?: any;
    afterInitConnect?: any;
    login?: string;
    password?: string;
    storeGetFn?: any;
    storeSetFn?: any;
    browserStorage?: string;
    tokenStorageKey?: string;
    tryAuthCount?: number;
    tryAuthPause?: number;
    tryCount?: number;
    tryPause?: number;
    debug?: any;
    debugFull?: any;
    doNotDeleteCollapseDataParam?: any;
}

export interface QueryOptions {
    path: string;
    query: {
        type?: string; // deprecated
        device_type: string;
        device_info: any;
        uuid?: string;
    };

    auth?: {
        token: string;
    };

    withCredentials?: boolean;
    extraHeaders?: any
    transports?:any
}

export interface QueryStorage {
    get(key: string): Promise<any>;

    set(key: string, val: any): Promise<void>;
}

export interface QueryItem {
    callback: Function;
    request: any;
    time: number;
}

export interface QueryStack {
    items: Record<string, QueryItem>;

    getItem(id: string): QueryItem | undefined;

    addItem(cb: Function, obj: any): string;

    removeItem(id: string): void;
}

