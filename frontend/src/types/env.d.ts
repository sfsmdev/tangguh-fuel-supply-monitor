declare module 'next' {
  export interface Metadata {
    title?: string;
    description?: string;
    [key: string]: any;
  }
  export type NextConfig = Record<string, any>;
}

declare module 'next/server' {
  export class NextRequest extends Request {
    nextUrl: URL;
    headers: Headers;
    url: string;
    json(): Promise<any>;
  }
  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse;
  }
}

declare module 'next/server.js' {
  export { NextRequest, NextResponse } from 'next/server';
}

declare module 'next/dist/lib/metadata/types/metadata-interface.js' {
  export type ResolvingMetadata = any;
  export type ResolvingViewport = any;
}

