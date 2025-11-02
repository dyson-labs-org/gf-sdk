declare module "dotenv" {
  export interface DotenvParseOutput {
    [key: string]: string;
  }

  export function config(options?: { path?: string }): { parsed?: DotenvParseOutput };
  export function parse(src: string): DotenvParseOutput;
}

declare module "node:fs" {
  export function existsSync(path: string): boolean;
  const fs: { existsSync: typeof existsSync };
  export default fs;
}

declare module "node:fs/promises" {
  export function readFile(path: string, options?: any): Promise<string>;
  export function writeFile(path: string, data: string, options?: any): Promise<void>;
}

declare module "node:readline/promises" {
  export interface Interface {
    question(query: string): Promise<string>;
    close(): void;
  }

  export function createInterface(options: { input: any; output: any }): Interface;
}

declare module "node:process" {
  export const stdin: any;
  export const stdout: any;
}

declare var process: {
  env: Record<string, string | undefined>;
  argv: string[];
  exit(code?: number): never;
};

declare module "axios" {
  export interface AxiosResponse<T = any> {
    data: T;
  }

  export interface AxiosRequestConfig {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
  }

  export interface AxiosInstance {
    post<T = any>(url: string, data?: any, config?: { headers?: Record<string, string> }): Promise<AxiosResponse<T>>;
  }

  export function create(config?: AxiosRequestConfig): AxiosInstance;
}
