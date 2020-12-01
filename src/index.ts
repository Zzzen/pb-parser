import { Parser } from "./parser";

export function parse(src: string) {
  return new Parser(src).parse();
}

export * from "./parser";
export * from "./scanner";
export * from "./ast";
export * from "./print";
