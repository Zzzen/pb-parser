export interface Comment {
  type: "Comment";
  value: string;
  start: number;
  end: number;
}

export interface BaseNode {
  start: number;
  end: number;
  leadingComments?: Comment[];
  trailingComments?: Comment[];
}

export interface SyntaxStatement extends BaseNode {
  type: "SyntaxStatement";
  value: "proto2" | "proto3";
}

export interface ImportStatement extends BaseNode {
  type: "ImportStatement";
}

export interface Option extends BaseNode {
  type: "Option";
}

export type TopLevelDef = Message | Enum | Extend | Service;

export interface Message extends BaseNode {
  type: "Message";
}

export interface Enum extends BaseNode {
  type: "Enum";
}

export interface Extend extends BaseNode {
  type: "Extend";
}

export interface Service extends BaseNode {
  type: "Service";
}

export interface Field extends BaseNode {
  type: "Field";
}

export interface Extensions extends BaseNode {
  type: "Extensions";
}

export interface Group extends BaseNode {
  type: "Group";
}

export interface OneOf extends BaseNode {
  type: "OneOf";
}

export interface MapField extends BaseNode {
  type: "MapField";
}

export interface Reserved extends BaseNode {
  type: "Reserved";
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
