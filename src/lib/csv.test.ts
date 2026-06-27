import { test, expect } from "vitest";
import { toCsv } from "./csv";

test("plain values join with commas and CRLF rows", () => {
  expect(toCsv(["a", "b"], [["1", "2"], ["3", "4"]])).toBe("a,b\r\n1,2\r\n3,4");
});

test("quotes fields containing comma, quote or newline", () => {
  expect(toCsv(["x"], [['a,b'], ['he said "hi"'], ["line\nbreak"]]))
    .toBe('x\r\n"a,b"\r\n"he said ""hi"""\r\n"line\nbreak"');
});

test("null becomes empty field", () => {
  expect(toCsv(["a", "b"], [[null, "v"]])).toBe("a,b\r\n,v");
});
