import { Parser } from "../src/parser";

function parse(src: string) {
  return new Parser(src).parse();
}

describe("Parser", () => {
  it("parse syntax", () => {
    expect(parse('syntax "proto2";')).toMatchSnapshot();
  });
});
