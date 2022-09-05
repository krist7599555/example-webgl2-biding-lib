export class KrGl {
  /**
   * global enum to reference GLenum
   * @see https://registry.khronos.org/OpenGL/api/GL/glext.h **/
  static _gl: WebGL2RenderingContext;
  static _program: WebGLProgram;

  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  constructor(opt: {
    canvas?: HTMLCanvasElement;
    vertext_shader: string;
    fragment_shader: string;
  }) {
    this.canvas = opt.canvas ?? document.createElement("canvas");
    const gl = this.canvas.getContext("webgl2")!;
    this.gl = gl;
    this.program = createProgram(
      gl,
      createShader(gl, gl.VERTEX_SHADER, opt.vertext_shader.trim())!,
      createShader(gl, gl.FRAGMENT_SHADER, opt.fragment_shader.trim())!
    )!;
    KrGl._gl = this.gl;
    KrGl._program = this.program;
    this.useprogram(); // auto use program
  }
  useprogram() {
    this.gl.useProgram(this.program);
    return this;
  }
  attribute(name: string) {}
}

type KrGlTypeString =
  | `FLOAT${"" | `_${"VEC" | "MAT"}${"2" | "3" | "4"}`}`
  | `BOOL${"" | `_VEC${"2" | "3" | "4"}`}`
  | `INT${"" | `_VEC${"2" | "3" | "4"}`}`;

// prettier-ignore
type KrGlTypeElementCount<T extends KrGlTypeString> = 
  T extends `${string}_VEC2` ? 2 :
  T extends `${string}_VEC3` ? 3 :
  T extends `${string}_VEC4` ? 4 :
  T extends `${string}_MAT2` ? 4 :
  T extends `${string}_MAT3` ? 9 :
  T extends `${string}_MAT4` ? 16 :
  1;
class KrGlType<T extends KrGlTypeString> {
  type: T;
  constructor(type: T) {
    this.type = type;
  }
  get element_count(): KrGlTypeElementCount<T> {
    const type = this.type.split("_")[1] ?? null;
    // @ts-ignore
    if (type == null) return 1;
    const num = +type.slice(-1);
    const square = type.includes("MAT");
    // @ts-ignore
    return square ? num * num : num;
  }
  get native_type(): T extends `${infer I}_${string}` ? I : T {
    return this.type.split("_")[0] as any;
  }
  get native_type_size(): KrGlType<T>["native_type"] extends "FLOAT"
    ? 4
    : KrGlType<T>["native_type"] extends "INT"
    ? 4
    : KrGlType<T>["native_type"] extends "BOOL"
    ? 1
    : never {
    return {
      FLOAT: 4,
      INT: 4,
      BOOL: 1,
    }[this.native_type] as any;
  }
  get glenum(): WebGL2RenderingContext[T] {
    return KrGl._gl[this.type];
  }
}
const a = new KrGlType("FLOAT_MAT4");

type KrGlBufferString =
  | "ARRAY_BUFFER"
  | "UNIFORM_BUFFER"
  | "ELEMENT_ARRAY_BUFFER";
export class KrGlBuffer<
  BUFFTYPE extends KrGlBufferString,
  ELETYPE extends "FLOAT" | "INT" | "BOOL"
> {
  webgl_buffer: WebGLBuffer;
  buffer_type: BUFFTYPE;
  element_type: KrGlType<ELETYPE>;
  constructor(buffer_type: BUFFTYPE, element_type: ELETYPE) {
    this.buffer_type = buffer_type;
    this.element_type = new KrGlType(element_type);
    this.webgl_buffer = KrGl._gl.createBuffer()!;
  }
  bind(fn: () => void = () => {}) {
    KrGl._gl.bindBuffer(KrGl._gl[this.buffer_type], this.webgl_buffer);
    fn();
    return this;
  }
  data(inp: BufferSource) {
    this.bind();
    KrGl._gl.bufferData(KrGl._gl[this.buffer_type], inp, KrGl._gl.STATIC_DRAW);
    return this;
  }
}

type KrGlLocationUniformOrAttribute = "uniform" | "attribute";
type KrGlLocationNativeLocationType<T extends KrGlLocationUniformOrAttribute> =
  T extends "uniform"
    ? Exclude<ReturnType<WebGL2RenderingContext["getUniformLocation"]>, null>
    : T extends "attribute"
    ? Exclude<ReturnType<WebGL2RenderingContext["getAttribLocation"]>, null>
    : never;
export class KrGlLocation<
  NAME extends string,
  TYPE extends KrGlTypeString,
  UA extends KrGlLocationUniformOrAttribute
> {
  name: NAME;
  element_type: KrGlType<TYPE>;
  location: KrGlLocationNativeLocationType<UA>;
  location_type: UA;
  constructor(name: NAME, item_type: TYPE, location_type: UA) {
    this.name = name;
    this.element_type = new KrGlType(item_type);
    this.location_type = location_type;
    if (location_type == "uniform") {
      this.location = KrGl._gl.getUniformLocation(KrGl._program, name)! as any;
    } else {
      this.location = KrGl._gl.getAttribLocation(KrGl._program, name)! as any;
      KrGl._gl.enableVertexAttribArray(this.location as any);
    }
    if (
      (typeof this.location != "number" && !this.location) ||
      (typeof this.location == "number" && this.location < 0)
    ) {
      throw new Error(`gl location is not valid for ${this.name}`);
    }
  }
  enable() {
    if (this.location_type == "attribute") {
      KrGl._gl.enableVertexAttribArray(
        this.location as KrGlLocationNativeLocationType<"attribute">
      );
    } else {
      throw new Error("uniform can not enable");
    }
    return this;
  }
  set_attrib(
    opt: {
      strip?: number;
      offset?: number;
      normalized?: boolean;
    } = {}
  ) {
    if (this.location_type == "attribute" && typeof this.location == "number") {
      KrGl._gl.vertexAttribPointer(
        this.location,
        this.element_type.element_count,
        KrGl._gl[this.element_type.native_type],
        opt.normalized ?? false,
        opt.strip ?? 0,
        opt.offset ?? 0
      );
    } else {
      throw new Error("uniform can not set atttribte pointer");
    }
  }
}

function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) {
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}
