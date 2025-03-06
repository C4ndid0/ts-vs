declare module 'ffi-rs' {
  export interface FfiOptions {
    library: string;
  }

  export function load(options: FfiOptions): {
    Function: <T extends (...args: any[]) => any>(returnType: string, argTypes: string[]) => T;
  };
}