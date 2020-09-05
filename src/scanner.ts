import { Location } from "./ast";
import { last } from "./util";

export enum TokenType {
  // Single-character tokens.
  LEFT_PAREN = "LEFT_PAREN",
  RIGHT_PAREN = "RIGHT_PAREN",
  LEFT_BRACE = "LEFT_BRACE",
  RIGHT_BRACE = "RIGHT_BRACE",
  LEFT_BRACKET = "LEFT_BRACKET",
  RIGHT_BRACKET = "RIGHT_BRACKET",
  COMMA = "COMMA",
  DOT = "DOT",
  MINUS = "MINUS",
  PLUS = "PLUS",
  SEMICOLON = "SEMICOLON",
  SLASH = "SLASH",
  STAR = "STAR",
  QUESTION_MARK = "QUESTION_MARK",
  COLON = "COLON",
  COMMENT = "COMMENT",

  // One or two character tokens.
  BANG = "BANG",
  BANG_EQUAL = "BANG_EQUAL",
  EQUAL = "EQUAL",
  EQUAL_EQUAL = "EQUAL_EQUAL",
  GREATER = "GREATER",
  GREATER_EQUAL = "GREATER_EQUAL",
  LESS = "LESS",
  LESS_EQUAL = "LESS_EQUAL",

  // Literals.
  IDENTIFIER = "IDENTIFIER",
  STRING = "STRING",
  NUMBER = "NUMBER",

  // int32, int64, string, bytes...
  PRIMITIVE_TYPE = "PRIMITIVE_TYPE",

  EOF = "EOF",
}

const PrimitiveTypes = [
  "int32",
  "int64",
  "uint32",
  "uint64",
  "sint32",
  "sint64",
  "fixed32",
  "fixed64",
  "sfixed32",
  "sfixed64",
  "bool",
  "string",
  "bytes",
] as const;

/**
 * keyword is a subset of IDENTIFIER
 */
export enum Keyword {
  SYNTAX = "syntax",
  IMPORT = "import",
  WEAK = "weak",
  PUBLIC = "public",
  PACKAGE = "package",
  OPTION = "option",
  REQUIRED = "required",
  OPTIONAL = "optional",
  REPEATED = "repeated",
  ONEOF = "oneof",
  GROUP = "group",
  MAP = "map",
  EXTENSIONS = "extensions",
  TO = "to",
  RESERVED = "reserved",
  ENUM = "enum",
  MESSAGE = "message",
  EXTEND = "extend",
  SERVICE = "service",
  RPC = "rpc",
  RETURNS = "returns",
  MAX = "max",
}

export interface Token {
  type: TokenType;
  lexeme: string;
  literal?: unknown;
  start: number;
  end: number;
  loc: {
    start: Location;
    end: Location;
  };
}

const base10Re = /^[1-9][0-9]*/;
// const base10NegRe = /^-?[1-9][0-9]*/
const base16Re = /^0[xX][0-9a-fA-F]+/;
// const base16NegRe = /^-?0[x][0-9a-fA-F]+/
const base8Re = /^0[0-7]+/;
// const base8NegRe = /^-?0[0-7]+/
const numberRe = /^(?![eE])[0-9]*(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?/;
const nameRe = /^[a-zA-Z_][a-zA-Z_0-9]*/;
// const typeRefRe = /^(?:\.?[a-zA-Z_][a-zA-Z_0-9]*)(?:\.[a-zA-Z_][a-zA-Z_0-9]*)*/;
// const fqTypeRefRe = /^(?:\.[a-zA-Z_][a-zA-Z_0-9]*)+/;

export class Scanner {
  current = 0;
  start = 0;
  line = 0;
  tokens: Token[] = [];
  lineStarts: number[] = [];

  constructor(readonly source: string) {
    let start = "";
    source.split(/\r?\n/g).forEach((line) => {
      this.lineStarts.push(start.length);
      start += line;
    });
  }

  getLocOfIndex(indexOfString: number): Location {
    const getLineOfIndex = (index: number) => {
      for (let i = 0; i < this.lineStarts.length - 1; i++) {
        if (this.lineStarts[i] < index && index < this.lineStarts[i + 1]) {
          return i;
        }
      }
      return last(this.lineStarts);
    };
    const line = getLineOfIndex(indexOfString);
    const column = indexOfString - this.lineStarts[line];
    return {
      line: line + 1,
      column: column - 1,
    };
  }

  scanTokens() {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push({
      type: TokenType.EOF,
      lexeme: "",
      start: this.start,
      end: this.current,
      loc: {
        start: {
          line: this.line + 1,
          column: this.source.length - last(this.lineStarts) - 1,
        },
        end: {
          line: this.line + 1,
          column: this.source.length - last(this.lineStarts) - 1,
        },
      },
    });

    return this.tokens;
  }

  scanToken() {
    const char = this.advance();

    switch (char) {
      case "(":
        this.addToken(TokenType.LEFT_PAREN);
        break;
      case ")":
        this.addToken(TokenType.RIGHT_PAREN);
        break;
      case "{":
        this.addToken(TokenType.LEFT_BRACE);
        break;
      case "}":
        this.addToken(TokenType.RIGHT_BRACE);
        break;
      case "[":
        this.addToken(TokenType.LEFT_BRACKET);
        break;
      case "]":
        this.addToken(TokenType.RIGHT_BRACKET);
        break;
      case ",":
        this.addToken(TokenType.COMMA);
        break;
      case ".":
        this.addToken(TokenType.DOT);
        break;
      case "-":
        this.addToken(TokenType.MINUS);
        break;
      case "+":
        this.addToken(TokenType.PLUS);
        break;
      case ";":
        this.addToken(TokenType.SEMICOLON);
        break;
      case "*":
        this.addToken(TokenType.STAR);
        break;
      case "?":
        this.addToken(TokenType.QUESTION_MARK);
        break;
      case ":":
        this.addToken(TokenType.COLON);
        break;

      case "!":
        this.addToken(this.match("=") ? TokenType.BANG_EQUAL : TokenType.BANG);
        break;
      case "=":
        this.addToken(
          this.match("=") ? TokenType.EQUAL_EQUAL : TokenType.EQUAL
        );
        break;
      case "<":
        this.addToken(this.match("=") ? TokenType.LESS_EQUAL : TokenType.LESS);
        break;
      case ">":
        this.addToken(
          this.match("=") ? TokenType.GREATER_EQUAL : TokenType.GREATER
        );
        break;

      case "/":
        // TODO: support triple slash comments
        if (this.match("/")) {
          // A comment goes until the end of the line.
          while (this.peek() != "\n" && !this.isAtEnd()) this.advance();
          this.addToken(
            TokenType.COMMENT,
            this.source.slice(this.start + 2, this.current)
          );
        } else if (this.match("*")) {
          while (
            !(this.peek() === "*" && this.source[this.current + 1] === "/") &&
            !this.isAtEnd()
          )
            this.advance();
          this.advance();
          this.advance();
          this.addToken(
            TokenType.COMMENT,
            this.source.slice(this.start + 2, this.current - 2)
          );
        } else {
          this.addToken(TokenType.SLASH);
        }
        break;

      case " ":
      case "\r":
      case "\t":
        // Ignore whitespace.
        break;

      case "\n":
        this.line++;
        break;

      case `'`:
      case `"`:
        this.string(char);
        break;

      default:
        if (this.isDigit(char)) {
          this.number();
        } else if (this.isAlpha(char)) {
          this.identifier();
        } else {
          this.error(this.line, `unexpected char ${char}`);
        }
    }
  }

  private match(expected: string) {
    if (this.isAtEnd()) return false;
    if (this.source.charAt(this.current) != expected) return false;

    this.current++;
    return true;
  }

  private peek() {
    if (this.isAtEnd()) return "\0";
    return this.source.charAt(this.current);
  }

  advance() {
    this.current++;
    return this.source[this.current - 1];
  }

  addToken(type: TokenType, literal?: unknown) {
    this.tokens.push({
      type,
      literal,
      lexeme: this.source.slice(this.start, this.current),
      start: this.start,
      end: this.current,
      loc: {
        start: this.getLocOfIndex(this.start),
        end: this.getLocOfIndex(this.current),
      },
    });
  }

  private isAtEnd() {
    return this.current >= this.source.length;
  }

  private error(line: number, message: string): never {
    throw new Error(`line ${line}: ${message}`);
  }

  private string(quote: `"` | `'`) {
    while (this.peek() !== quote && !this.isAtEnd()) {
      this.advance();
    }

    if (this.isAtEnd() || this.peek() === "\n") {
      this.error(this.line, "Unterminated string.");
      return;
    }

    // The closing ".
    this.advance();

    const value = this.source.slice(this.start + 1, this.current - 1);
    this.addToken(TokenType.STRING, value);
  }

  private number() {
    const str = this.source.slice(this.start);
    let matched: RegExpMatchArray | null;
    let val: number;
    if ((matched = str.match(base16Re))) {
      val = Number(matched[0]);
    } else if ((matched = str.match(base8Re))) {
      val = parseInt(matched[0], 8);
    } else if ((matched = str.match(numberRe))) {
      val = Number(matched[0]);
    } else if ((matched = str.match(base10Re))) {
      val = Number(matched[0]);
    } else {
      throw new Error("should not happend");
    }

    this.current = this.start + matched[0].length;
    this.addToken(TokenType.NUMBER, val);
  }

  private identifier() {
    const str = this.source.slice(this.start);
    const matched = str.match(nameRe);
    if (!matched) {
      this.error(this.line, "should have matched id");
    }
    this.current = this.start + matched[0].length;

    if (PrimitiveTypes.includes(matched[0] as any)) {
      this.addToken(TokenType.PRIMITIVE_TYPE, matched[0]);
    } else {
      this.addToken(TokenType.IDENTIFIER, matched[0]);
    }
  }

  private isAlpha(c: string) {
    return /[a-zA-Z_]/.test(c);
  }

  private isDigit(c: string) {
    return c >= "0" && c <= "9";
  }
}
