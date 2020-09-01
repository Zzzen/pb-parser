import { Parser } from "../src/parser";

function parse(src: string) {
  return new Parser(src).parse();
}

describe("Parser", () => {
  it("parse syntax", () => {
    expect(parse('syntax = "proto2";')).toMatchSnapshot();
  });

  it("parse import", () => {
    expect(
      parse(`
import "./test.proto";
import weak "./test.proto";
import public "./test.proto";
    `)
    ).toMatchSnapshot();
  });

  it("parse package", () => {
    expect(
      parse(`
package a;
package a.bc;
    `)
    ).toMatchSnapshot();
  });

  it("parse option", () => {
    expect(
      parse(`
option java_package = "com.example.foo";
option java_package = -1;
option java_package = "com.example.foo";
option (java._package) = "com.example.foo";
option java.pp.cc = "com.example.foo";
`)
    ).toMatchSnapshot();
  });

  it("parse empty statment", () => {
    expect(
      parse(`
;;;;;
    `)
    ).toMatchSnapshot();
  });

  it("parse reserved", () => {
    expect(
      parse(`
message M {
  reserved 1;
  reserved 1 to 2, 5 to max, 6;
  reserved "foo";
  reserved "foo", "bar";
}
      
      `)
    ).toMatchSnapshot();
  });

  it("parse map field", () => {
    expect(
      parse(`
message M {
  map <int32, string> f1 = 1;
  map <int32, M> f2 = 2;
  map <int32, M.foo> f3 = 3;
  map <int32, .M> f4 = 4;
  map <int32, .M.foo.bar> f5 = 5 [(custom_option) = "hello world"];
  map <int32, .M> map = 4;
}      
      
      `)
    ).toMatchSnapshot();
  });

  it("parse option field", () => {
    expect(
      parse(`
message M {
  option (my_option).a = true;
}      
      
      `)
    ).toMatchSnapshot();
  });

  it("parse oneof field", () => {
    expect(
      parse(`
message M {
  oneof foo {
      string name = 4;
      SubMessage sub_message = 9;
  }
}

      `)
    ).toMatchSnapshot();
  });

  it("parse nested message", () => {
    expect(
      parse(`
message M {
  message Inner {
    option (my_option).a = true;
  }
}

      `)
    ).toMatchSnapshot();
  });

  it("parse enum", () => {
    expect(
      parse(`
enum EnumAllowingAlias {
  option allow_alias = true;
  UNKNOWN = 0;
  STARTED = 1;
  RUNNING = 2 [(custom_option) = "hello world"];
}

message M {
  enum EnumAllowingAlias {
    option allow_alias = true;
    UNKNOWN = 0;
    STARTED = 1;
    RUNNING = 2 [(custom_option) = "hello world"];
  }
}
      `)
    ).toMatchSnapshot();
  });

  it("parse extensions", () => {
    expect(
      parse(`
message M {
  extensions 20 to 30;
}
      `)
    ).toMatchSnapshot();
  });

  it("parse example proto", () => {
    expect(
      parse(`
syntax = "proto2";
import public "other.proto";
option java_package = "com.example.foo";
    `)
    ).toMatchSnapshot();
  });
});
