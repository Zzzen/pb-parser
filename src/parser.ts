import { Scanner, Token, TokenType } from "./scanner";
import { Comment, SyntaxStatement } from "./ast";

export class Parser {
  pendingComments: Comment[] = [];
  current = 0;
  tokens: Token[] = [];

  constructor(private readonly source: string) {}

  handleComments() {
    while (this.check(TokenType.COMMENT)) {
      const token = this.peek();
      this.pendingComments.push({
        type: "Comment",
        value: token.literal as string,
        start: token.start,
        end: token.end,
      });
    }
  }

  parse() {
    this.tokens = new Scanner(this.source).scanTokens();
    return this.parseRoot();
  }

  parseSyntax(): SyntaxStatement | undefined {
    this.handleComments();
    if (this.check(TokenType.SYNTAX)) {
      const syntax = this.advance();
      this.handleComments();
      const proto = this.consume(TokenType.STRING, "expected syntax value");
      const semicolon = this.consume(TokenType.SEMICOLON, "expected colon");
      return {
        type: "SyntaxStatement",
        value: proto.literal as "proto2" | "proto3",
        start: syntax.start,
        end: semicolon.end,
      };
    }
  }

  parseRoot() {
    return this.parseSyntax();
  }

  private previous() {
    return this.tokens[this.current - 1];
  }

  check(type: TokenType) {
    if (this.isAtEnd()) return false;
    return this.peek().type == type;
  }

  match(...types: TokenType[]) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private consume(type: TokenType, message: string) {
    if (this.check(type)) return this.advance();

    throw this.error(this.peek(), message);
  }

  private error(token: Token, message: string) {
    throw new Error(
      `parsing Error: unexpect token ${token.type}(${token.lexeme}), ${message}`
    );
  }

  private advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  private peek() {
    return this.tokens[this.current];
  }
}
