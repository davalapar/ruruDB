declare module 'what-the-pack' {
  interface MessagePackFunctions {
    encode: (value: any) => Buffer; // eslint-disable-line
    decode: (buffer: Buffer) => any; // eslint-disable-line
    register: (...strings: string[]) => void;
  }
  export const initialize: (tempBufferLength: number, logFunction ?: Function) => MessagePackFunctions;
}