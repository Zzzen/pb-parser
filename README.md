# pb-parser

a simple protobuf parser written in typescript.

**demo** https://stackblitz.com/edit/pb-parser-demo?file=index.tsx

## Installation

```sh
npm install pb-parser
```

## Usage

```js
import { parse } from "pb-parser";

const file = parse(`syntax = "proto3";`);
console.log(file);
```

## Testing

To run the tests, run the following command:

```sh
npm test
```
