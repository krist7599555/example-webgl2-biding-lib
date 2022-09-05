import { LastArrayElement, Replace, Simplify, Split, Trim } from "type-fest";

type Last2<T extends string[]> = T extends [
  ...any[],
  infer T,
  infer V extends string
]
  ? { [key in Replace<V, ";", "">]: T }
  : never;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
type MergeUnionObject<U> = UnionToIntersection<U> extends infer O
  ? { [K in keyof O]: O[K] }
  : never;

// export

export type RecordOfVariableTypeFromShaderString<T extends string> =
  MergeUnionObject<
    Last2<
      Split<
        Trim<Split<T, "\n">[number]> &
          (`layout(${string}` | `in ${string}` | `uniform ${string}`),
        " "
      >
    >
  >;

// test

type AssertEq<A, B extends A> = null;
type _Test = AssertEq<
  RecordOfVariableTypeFromShaderString<`
    #version 300 es
    #pragma vscode_glsllint_stage: vert
    layout(location = 1) in float aPointSize;
    layout(location = 0) in vec2 aPosition;
    layout(location = 2) in vec3 aColor;
    out vec3 vColor;
    void main() {
        vColor = aColor;
        gl_PointSize = aPointSize;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }`>,
  { aPointSize: "float"; aPosition: "vec2"; aColor: "vec3" }
>;
