import { Scanner, TokenType, Token } from "../src/scanner";

function scan(src: string) {
  return new Scanner(src).scanTokens();
}

describe("Scanner", () => {
  it("scan combinations of simple symbols", () => {
    expect(scan("{}")).toMatchSnapshot();
    expect(scan("[]")).toMatchSnapshot();
  });

  it("scan comments", () => {
    const lineComments = `
//comment1
// comment2
`;
    expect(scan(lineComments)).toMatchSnapshot();

    const blockComments = `
/**
 * comment1
 * comment2
 */
        `;

    expect(scan(blockComments)).toMatchSnapshot();
  });

  it("scan numbers", () => {
    const code = `
23
234.35
0x43
0345
1e3
        `;
    expect(scan(code)).toMatchSnapshot();
  });

  it("scan identifiers", () => {
    const code = `
foo
bar
_foo
package foo;
import
        `;

    expect(scan(code)).toMatchSnapshot();
  });
});
