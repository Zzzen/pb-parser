import { Scanner, Token, TokenType } from "./scanner";
import {
  Comment,
  SyntaxStatement,
  ProtoFile,
  TopLevelDirective,
  ImportStatement,
  Package,
  FullIdentifier,
  Option,
  OptionName,
  Constant,
} from "./ast";

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
      this.consume(TokenType.EQUAL);
      const proto = this.consume(TokenType.STRING);
      const semicolon = this.consume(TokenType.SEMICOLON);
      return {
        type: "SyntaxStatement",
        value: proto.literal as "proto2" | "proto3",
        start: syntax.start,
        end: semicolon.end,
      };
    }
  }

  parseTopLevelDirectives(): TopLevelDirective[] {
    const topLevelDirectives: TopLevelDirective[] = [];
    while (!this.isAtEnd()) {
      if (this.check(TokenType.IMPORT)) {
        topLevelDirectives.push(this.parseImport());
        continue;
      } else if (this.check(TokenType.PACKAGE)) {
        topLevelDirectives.push(this.parsePackage());
        continue;
      } else if (this.check(TokenType.OPTION)) {
        topLevelDirectives.push(this.parseOption());
        continue;
      } else if (this.match(TokenType.SEMICOLON)) {
        continue;
      }

      this.error(this.peek(), `unexpected token`);
    }

    return topLevelDirectives;
  }

  /**
   * option = "option" optionName  "=" constant ";"
   */
  parseOption(): Option {
    const start = this.consume(TokenType.OPTION);

    const optionName = this.parseOptionName();

    this.consume(TokenType.EQUAL);

    const constant = this.parseConstant();

    const end = this.consume(TokenType.SEMICOLON);

    return {
      type: "Option",
      name: optionName,
      value: constant,
      start: start.start,
      end: end.end,
    };
  }

  /**
   * optionName = ( ident | "(" fullIdent ")" ) { "." ident }
   */
  parseOptionName(): OptionName {
    let name = "";
    const start = this.peek();
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.consume(TokenType.IDENTIFIER).lexeme;
    } else {
      this.consume(TokenType.LEFT_PAREN);
      name += "(";

      const fullId = this.parseFullIdentifier();
      name += fullId.value;

      this.consume(TokenType.RIGHT_PAREN);
      name += ")";
    }

    while (this.match(TokenType.DOT)) {
      name += ".";
      name += this.consume(TokenType.IDENTIFIER).lexeme;
    }

    return {
      type: "OptionName",
      value: name,
      start: start.start,
      end: this.previous().end,
    };
  }

  /**
   * constant = fullIdent | ( [ "-" | "+" ] intLit ) | ( [ "-" | "+" ] floatLit ) |
   *                 strLit | boolLit
   */
  parseConstant(): Constant {
    if (this.check(TokenType.IDENTIFIER)) {
      return this.parseFullIdentifier();
    } else {
      let symbol: Token;
      if (this.check(TokenType.MINUS) || this.check(TokenType.PLUS)) {
        symbol = this.advance();
        const isMinue = symbol.type === TokenType.MINUS;
        return {
          type: "Literal",
          value:
            (isMinue ? -1 : +1) *
            (this.consume(TokenType.NUMBER).literal as number),
          start: symbol.start,
          end: symbol.end,
        };
      } else {
        const token = this.consume(TokenType.STRING);
        return {
          type: "Literal",
          value: token.literal as string,
          start: token.start,
          end: token.end,
        };
      }
    }
  }

  parsePackage(): Package {
    const packageToken = this.consume(TokenType.PACKAGE);

    const name = this.parseFullIdentifier();

    const end = this.consume(TokenType.SEMICOLON);

    return {
      type: "Package",
      name,
      start: packageToken.start,
      end: end.end,
    };
  }

  parseFullIdentifier(): FullIdentifier {
    const ids = [this.consume(TokenType.IDENTIFIER)];
    while (this.match(TokenType.DOT)) {
      ids.push(this.consume(TokenType.IDENTIFIER));
    }

    const fullId = ids.map((id) => id.lexeme).join(".");

    return {
      type: "FullIdentifier",
      value: fullId,
      start: ids[0].start,
      end: ids[ids.length - 1].end,
    };
  }

  parseImport(): ImportStatement {
    const importToken = this.consume(TokenType.IMPORT);
    let modifier: Token | undefined;
    if (this.check(TokenType.WEAK) || this.check(TokenType.PUBLIC)) {
      modifier = this.advance();
    }

    const strLit = this.consume(TokenType.STRING);

    const end = this.consume(TokenType.SEMICOLON);

    return {
      type: "ImportStatement",
      file: strLit.literal as string,
      modifier: modifier?.lexeme as "weak" | "public",
      start: importToken.start,
      end: end.end,
    };
  }

  parseRoot(): ProtoFile {
    const syntax = this.parseSyntax();
    const body = this.parseTopLevelDirectives();
    return {
      type: "ProtoFile",
      syntax,
      body,
      start: this.tokens[0].start,
      end: this.tokens[this.tokens.length - 1].end,
    };
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

  private consume(type: TokenType) {
    if (this.check(type)) return this.advance();

    const current = this.tokens[this.current];
    const errorMessage = `expected ${type}, but got ${current.type} at line ${current.line}`;

    throw this.error(this.peek(), errorMessage);
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
