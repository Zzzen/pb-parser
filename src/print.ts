import { ASTNode, Extensions } from "./ast";
import { UnreachableCaseError } from "./util";

export function print(node: ASTNode | undefined): string {
  return str(node, 0);

  function str(
    node: ASTNode | undefined,
    indent: number,
    opt?: { expression: boolean }
  ) {
    if (node == undefined) {
      return "";
    }

    const isExpression = opt?.expression;
    const EOL = "\n";

    let output = "";
    switch (node.type) {
      case "ProtoFile":
        writeText(str(node.syntax, indent));
        writeStrNodes(node.body, indent);
        break;
      case "Comment":
        writeWithIndent(`/* ${node.value} */` + EOL);
        break;
      case "SyntaxStatement":
        writeWithIndent(`syxtax = "${node.value}";` + EOL);
        break;
      case "ImportStatement":
        writeWithIndent(`import ${node.modifier || ""} "${node.file}";` + EOL);
        break;
      case "Option":
        writeWithIndent(
          `option ${str(node.name, 0)} = ${str(node.value, 0)}${
            isExpression ? "" : ";\n"
          }`
        );
        break;
      case "Package":
        writeWithIndent(`package ${str(node.name, 0)};` + EOL);
        break;
      case "FullIdentifier":
        writeText(`${node.value}`);
        break;
      case "OptionName":
        writeText(`${node.value}`);
        break;
      case "Literal":
        writeText(JSON.stringify(node.value));
        break;
      case "Message":
        writeWithIndent(`message ${node.name} {` + EOL);
        writeStrNodes(node.body, indent + 1);
        writeWithIndent(`}`);
        break;
      case "Enum":
        writeWithIndent(`enum ${node.name} {` + EOL);
        writeStrNodes(node.options, indent + 1);
        writeStrNodes(node.fields, indent + 1);
        writeWithIndent(`}`);
        break;
      case "Extend":
        throw new Error(`unsupported type`);
      case "Service":
        writeWithIndent(`service ${node.name} {` + EOL);
        writeStrNodes(node.body, indent + 1);
        writeWithIndent(`}`);
        break;
      case "Field":
        const hasOption = node.fieldOptions.length > 0;
        const options = hasOption
          ? `[${node.fieldOptions.map(
              (field) => `${str(field, 0, { expression: true })}`
            )}]`
          : "";
        writeWithIndent(
          `${node.label || ""}  ${str(node.fieldType, 0)} ${node.name} = ${
            node.fieldNumber
          } ${options};` + EOL
        );
        break;
      case "Extensions":
        writeWithIndent(`extensions ${formatRange(node.ranges)} ;` + EOL);
        break;
      case "Group":
        throw new Error(`unsupported type`);
      case "OneOf":
        writeWithIndent(`oneof ${node.oneofName}` + EOL);
        writeStrNodes(node.options, indent + 1);
        writeStrNodes(node.fields, indent + 1);
        writeWithIndent(`}`);
        break;
      case "MapField":
        const hasMapOption = node.options.length > 0;
        const mapOptions = hasMapOption
          ? `[${node.options.map(
              (field) => `${str(field, 0, { expression: true })}`
            )}]`
          : "";
        writeWithIndent(
          `map<${node.keyType}, ${str(node.valueType, 0, {
            expression: true,
          })}> ${node.mapName} = ${node.fieldNumber} ${mapOptions};` + EOL
        );
        break;
      case "ValueType":
        writeText(node.value);
        break;
      case "Reserved":
        writeWithIndent(
          `reserved ${formatRange(node.ranges)} ${node.fieldName?.join(", ")};`
        );
        break;
      case "RPC":
        const hasRPCOptions = node.options.length > 0;
        writeWithIndent(
          `rpc ${node.name} (${node.streamInput ? "stream" : ""} ${str(
            node.input,
            0
          )}) returns (${node.streamOutput ? "stream" : ""} ${str(
            node.output,
            0
          )})${hasRPCOptions ? "{" : ";"}` + EOL
        );
        if (hasRPCOptions) {
          writeStrNodes(node.options, indent + 1);
          writeWithIndent(`}`);
        }
        break;
      case "Service":
        writeWithIndent(`service ${node.name} {` + EOL);
        writeStrNodes(node.body, indent + 1);
        writeWithIndent(`}`);
        break;
      default:
        throw new UnreachableCaseError(node);
    }

    return output;

    function writeStrNodes(nodes: ASTNode[], indent: number) {
      writeText(nodes.map((node) => str(node, indent)).join("\n"));
    }

    function writeWithIndent(t: string) {
      output += "\t".repeat(indent) + t;
    }
    function writeText(t: string) {
      output += t;
    }

    function formatRange(ranges: Extensions["ranges"]) {
      if (!ranges) {
        throw new Error("unexpected range");
      }

      if (ranges.length === 0) {
        return "";
      }

      return ranges
        .map((range) => {
          if (range.length === 1) {
            return range[0];
          } else {
            return range.join(" to ");
          }
        })
        .join(", ");
    }
  }
}
