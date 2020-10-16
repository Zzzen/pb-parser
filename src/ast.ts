import { Token } from "./scanner";

export interface Comment {
  type: "Comment";
  value: string;
  start: number;
  end: number;
}

export interface Location {
  // starts from 1
  line: number;
  // starts from 0
  column: number;
}

export interface WithFullLocation {
  start: number;
  end: number;
  loc: {
    start: Location;
    end: Location;
  };
}

export interface BaseNode extends WithFullLocation {
  leadingComments?: Comment[];
  trailingComments?: Comment[];
  startToken: Token;
  endToken: Token;
}

export interface SyntaxStatement extends BaseNode {
  type: "SyntaxStatement";
  value: "proto2" | "proto3";
}

export interface ImportStatement extends BaseNode {
  type: "ImportStatement";
  file: string;
  modifier: "weak" | "public";
}

export type Label = "required" | "optional" | "repeated";

export interface Option extends BaseNode {
  type: "Option";
  name: OptionName;
  value: Constant;
}

export interface ProtoFile extends BaseNode {
  type: "ProtoFile";
  syntax?: SyntaxStatement;
  body: TopLevelDirective[];
  tokens: Token[];
}

export type TopLevelDirective =
  | ImportStatement
  | Package
  | Option
  | TopLevelDef
  | EmptyStatement;

export type TopLevelDef = Message | Enum | Extend | Service;

export interface Package extends BaseNode {
  type: "Package";
  name: FullIdentifier;
}

export interface FullIdentifier extends BaseNode {
  type: "FullIdentifier";
  value: string;
}

export interface OptionName extends BaseNode {
  type: "OptionName";
  value: string;
}

export type Constant = FullIdentifier | Literal;

export interface Literal extends BaseNode {
  type: "Literal";
  value: string | number | boolean;
}

export interface Message extends BaseNode {
  type: "Message";
  name: string;
  body: MessageBody[];
}

export type MessageBody =
  | Field
  | Enum
  | Message
  | Extend
  | Extensions
  | Group
  | Option
  | OneOf
  | MapField
  | Reserved;

export interface Enum extends BaseNode {
  type: "Enum";
  name: string;
  options: Option[];
  fields: Field[];
}

export interface Extend extends BaseNode {
  type: "Extend";
}

export interface Service extends BaseNode {
  type: "Service";
}

export interface Field extends BaseNode {
  type: "Field";
  name: string;
  label?: "repeated" | "optional" | "required";
  fieldType?: ValueType;
  fieldNumber: number;
  fieldOptions: Option[];
}

export interface Extensions extends BaseNode {
  type: "Extensions";
  ranges: Array<[number, number | "max"] | [number]> | undefined;
}

export interface Group extends BaseNode {
  type: "Group";
  label: Label;
  groupName: string;
  fieldNumber: number;
  body: MessageBody[];
}

export interface OneOf extends BaseNode {
  type: "OneOf";
  oneofName: string;
  options: Option[];
  fields: Field[];
}

export interface MapField extends BaseNode {
  type: "MapField";
  keyType: string;
  valueType: ValueType;
  fieldNumber: number;
  mapName: string;
  options: Option[];
}

export interface ValueType extends BaseNode {
  type: "ValueType";
  value: string;
}

export interface Reserved extends BaseNode {
  type: "Reserved";
  ranges: Array<[number, number | "max"] | [number]> | undefined;
  fieldName: string[] | undefined;
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export interface EnumField extends BaseNode {
  type: "EnumField";
}

export interface EnumValueOption extends BaseNode {
  type: "EnumValueOption";
}

export interface EnumBody extends BaseNode {
  type: "EnumBody";
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}
