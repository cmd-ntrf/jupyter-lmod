export declare class Lmod {
    constructor(base_url: string);

    _available: any;
    _loaded: any;
    _savelist: any;
    url: any;
    _xsrf: any;

    avail(): any;

    list(): any;

    load(modules: any): any;

    restore(name: any): any;

    save(name: any): any;

    savelist(): any;

    show(module: any): any;

    freeze(): any;

    unload(modules: any): any;

    get(action: any, options: any): any;

    post(action: any, options: any): any;
}
