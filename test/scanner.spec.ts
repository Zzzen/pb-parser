import { Scanner, TokenType, Token } from "../src/scanner";

function scan(src: string) {
  return new Scanner(src).scanTokens();
}

describe("Scanner", () => {
  it("scan simple symbols", () => {
    const fixtures: Array<[string, Token]> = [
      [
        "(",
        { type: TokenType.LEFT_PAREN, lexeme: "(", line: 0, start: 0, end: 1 },
      ],
      [
        "{",
        { type: TokenType.LEFT_BRACE, lexeme: "{", line: 0, start: 0, end: 1 },
      ],
      [".", { type: TokenType.DOT, lexeme: ".", line: 0, start: 0, end: 1 }],
      [
        ";",
        { type: TokenType.SEMICOLON, lexeme: ";", line: 0, start: 0, end: 1 },
      ],
    ];

    for (const [text, token] of fixtures) {
      expect(scan(text).filter((t) => t.type !== TokenType.EOF)).toMatchObject([
        token,
      ]);
    }
  });

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
