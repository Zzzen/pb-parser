import { Scanner, Token, TokenType, Keyword } from "./scanner";
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
  TopLevelDef,
  Message,
  Reserved,
  MessageBody,
  MapField,
  ValueType,
} from "./ast";
import { last } from "./util";

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
    if (this.checkKeyword(Keyword.SYNTAX)) {
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
      if (this.checkKeyword(Keyword.IMPORT)) {
        topLevelDirectives.push(this.parseImport());
        continue;
      } else if (this.checkKeyword(Keyword.PACKAGE)) {
        topLevelDirectives.push(this.parsePackage());
        continue;
      } else if (this.checkKeyword(Keyword.OPTION)) {
        topLevelDirectives.push(this.parseOption());
        continue;
      } else if (this.match(TokenType.SEMICOLON)) {
        continue;
      } else if (
        this.peek().type === TokenType.IDENTIFIER &&
        [
          Keyword.MESSAGE,
          Keyword.ENUM,
          Keyword.EXTEND,
          Keyword.SERVICE,
        ].includes(this.peek().lexeme as any)
      ) {
        topLevelDirectives.push(this.parseTopLevelDef());
        continue;
      }

      this.error(this.peek(), `unexpected token`);
    }

    return topLevelDirectives;
  }

  /**
   * topLevelDef = message | enum | extend | service
   */
  parseTopLevelDef(): TopLevelDef {
    if (this.checkKeyword(Keyword.MESSAGE)) {
      return this.parseMessage();
    }

    this.error(this.peek(), "");
  }

  /**
   * message = "message" messageName messageBody
   * messageBody = "{" { field | enum | message | extend | extensions | group |
   *   option | oneof | mapField | reserved | emptyStatement } "}"
   */
  parseMessage(): Message {
    const messageToken = this.consumeKeyword(Keyword.MESSAGE);
    const name = this.consume(TokenType.IDENTIFIER).lexeme as string;
    this.consume(TokenType.LEFT_BRACE);
    const body = this.parseMessageBody();
    const end = this.consume(TokenType.RIGHT_BRACE);

    return {
      type: "Message",
      start: messageToken.start,
      end: end.end,
      body,
      name,
    };
  }

  parseMessageBody(): MessageBody[] {
    const body: MessageBody[] = [];
    while (!this.check(TokenType.RIGHT_BRACE)) {
      if (this.checkKeyword(Keyword.RESERVED)) {
        body.push(this.parserReserved());
        continue;
      } else if (this.checkKeyword(Keyword.MAP)) {
        body.push(this.parseMapField());
        continue;
      } else if (this.checkKeyword(Keyword.OPTION)) {
        body.push(this.parseOption());
        continue;
      }

      // emptyStatement
      if (this.match(TokenType.SEMICOLON)) {
        continue;
      }

      this.error(this.peek());
    }
    return body;
  }

  /**
   * mapField = "map" "<" keyType "," type ">" mapName "=" fieldNumber [ "[" fieldOptions "]" ] ";"
   * keyType = "int32" | "int64" | "uint32" | "uint64" | "sint32" | "sint64" |
   *          "fixed32" | "fixed64" | "sfixed32" | "sfixed64" | "bool" | "string"
   */

  parseMapField(): MapField {
    const start = this.consumeKeyword(Keyword.MAP);
    this.consume(TokenType.LESS);
    // keyType
    const keyToken = this.consume(TokenType.PRIMITIVE_TYPE);
    this.consume(TokenType.COMMA);

    const value = this.parseValueType();

    this.consume(TokenType.GREATER);

    const id = this.consume(TokenType.IDENTIFIER);

    this.consume(TokenType.EQUAL);

    const numberToken = this.consume(TokenType.NUMBER);

    let options: Option[] = [];
    if (this.match(TokenType.LEFT_BRACKET)) {
      options = this.parseFieldOptions();
      this.consume(TokenType.RIGHT_BRACKET);
    }

    const end = this.consume(TokenType.SEMICOLON);

    return {
      type: "MapField",
      start: start.start,
      end: end.end,
      valueType: value,
      keyType: keyToken.lexeme,
      mapName: id.lexeme,
      fieldNumber: Number(numberToken.lexeme),
      options,
    };
  }

  /**
   * type = "double" | "float" | "int32" | "int64" | "uint32" | "uint64"
   *   | "sint32" | "sint64" | "fixed32" | "fixed64" | "sfixed32" | "sfixed64"
   *   | "bool" | "string" | "bytes" | messageType | enumType
   *
   *
   * messageType = [ "." ] { ident "." } messageName
   * enumType = [ "." ] { ident "." } enumName
   */
  parseValueType(): ValueType {
    if (this.match(TokenType.PRIMITIVE_TYPE)) {
      const token = this.previous();
      return {
        type: "ValueType",
        start: token.start,
        end: token.end,
        value: token.lexeme,
      };
    } else {
      const leadingDot = this.check(TokenType.DOT) ? this.advance() : undefined;
      const idents = [] as Token[];
      while (this.check(TokenType.IDENTIFIER)) {
        idents.push(this.advance());
        if (!this.match(TokenType.DOT)) {
          break;
        }
      }

      return {
        type: "ValueType",
        start: leadingDot ? leadingDot.start : idents[0].start,
        end: last(idents).end,
        value:
          (leadingDot ? "." : "") + idents.map((id) => id.lexeme).join("."),
      };
    }
  }

  /**
   * reserved = "reserved" ( ranges | fieldNames ) ";"
   * ranges = range { "," range }
   * range =  intLit [ "to" ( intLit | "max" ) ]
   * fieldNames = fieldName { "," fieldName }
   */
  parserReserved(): Reserved {
    const reserved = this.consumeKeyword(Keyword.RESERVED);
    if (this.check(TokenType.STRING)) {
      // fieldNames
      const ids = [this.advance()];
      while (this.match(TokenType.COMMA)) {
        ids.push(this.consume(TokenType.STRING));
      }

      const end = this.consume(TokenType.SEMICOLON);
      return {
        type: "Reserved",
        ranges: undefined,
        fieldName: ids.map((x) => x.literal as string),
        start: reserved.start,
        end: end.end,
      };
    } else {
      // ranges
      const ranges = [this.parseRange()];
      while (this.match(TokenType.COMMA)) {
        ranges.push(this.parseRange());
      }

      const end = this.consume(TokenType.SEMICOLON);
      return {
        type: "Reserved",
        ranges: ranges,
        fieldName: undefined,
        start: reserved.start,
        end: end.end,
      };
    }
  }

  parseRange(): [number, number | "max"] | [number] {
    const lit = this.consume(TokenType.NUMBER);
    const value = lit.literal as number;
    if (this.matchKeyword(Keyword.TO)) {
      if (this.matchKeyword(Keyword.MAX)) {
        return [value, "max"];
      } else {
        const toValue = this.consume(TokenType.NUMBER).literal as number;
        return [value, toValue];
      }
    } else {
      return [value];
    }
  }

  /**
   * option = "option" optionName  "=" constant ";"
   */
  parseOption(): Option {
    const start = this.consumeKeyword(Keyword.OPTION);

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
   * fieldOptions = fieldOption { ","  fieldOption }
   */
  parseFieldOptions() {
    const opts = [this.parseFieldOption()];
    while (this.match(TokenType.COMMA)) {
      opts.push(this.parseFieldOption());
    }

    return opts;
  }

  /**
   * fieldOption = optionName "=" constant
   */
  parseFieldOption(): Option {
    const name = this.parseOptionName();
    this.consume(TokenType.EQUAL);
    const constant = this.parseConstant();
    return {
      type: "Option",
      start: name.start,
      end: constant.end,
      value: constant,
      name: name,
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
    const packageToken = this.consumeKeyword(Keyword.PACKAGE);

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
    const importToken = this.consumeKeyword(Keyword.IMPORT);
    let modifier: Token | undefined;
    if (this.checkKeyword(Keyword.WEAK) || this.checkKeyword(Keyword.PUBLIC)) {
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

  /**
   * proto = syntax { import | package | option | topLevelDef | emptyStatement }
   */
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

  checkKeyword(type: Keyword) {
    if (this.isAtEnd()) return false;
    return (
      this.peek().type == TokenType.IDENTIFIER && this.peek().lexeme === type
    );
  }

  checkNext(type: TokenType) {
    return this.tokens[this.current + 1]?.type === type;
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

  matchKeyword(...types: Keyword[]) {
    for (const type of types) {
      if (this.checkKeyword(type)) {
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

  private consumeKeyword(type: Keyword) {
    if (this.checkKeyword(type)) return this.advance();

    const current = this.tokens[this.current];
    const errorMessage = `expected ${type}, but got ${current.type} at line ${current.line}`;

    throw this.error(this.peek(), errorMessage);
  }

  private error(token: Token, message?: string): never {
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
