export declare class Lmod {
    constructor(base_url: string);


    avail(): Promise<Array<string>>;
    list(): Promise<Array<string>>;
    load(modules: Array<string>): Promise<any>;
    restore(name: string): Promise<any>;
    save(name: string): Promise<any>;
    savelist(): Promise<any>;
    show(module: string): Promise<string>;
    freeze(): Promise<any>;
    unload(modules: Array<string>): Promise<any>;
}
