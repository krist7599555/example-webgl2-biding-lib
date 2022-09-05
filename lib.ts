import { RecordOfVariableTypeFromShaderString } from "./type";

// prettier-ignore
const TYPECONVERT = {
  "float": { glsl_type: "float", base_type: "FLOAT", element_size: 4, element_count: 1  },
  "vec2":  { glsl_type: "vec2",  base_type: "FLOAT", element_size: 4, element_count: 2  },
  "vec3":  { glsl_type: "vec3",  base_type: "FLOAT", element_size: 4, element_count: 3  },
  "int":   { glsl_type: "int",   base_type: "INT",   element_size: 4, element_count: 1  },
  "bool":  { glsl_type: "bool",  base_type: "BOOL",  element_size: 1, element_count: 1  },
  "mat3":  { glsl_type: "mat3",  base_type: "FLOAT", element_size: 4, element_count: 9  },
  "mat4":  { glsl_type: "mat4",  base_type: "FLOAT", element_size: 4, element_count: 16 },
} as const;
type KrGlslVarType = keyof typeof TYPECONVERT;

export class KrGl<WebGlProgramVariable extends { [key: string]: KrGlslVarType }> {
  /**
   * global enum to reference GLenum
   * @see https://registry.khronos.org/OpenGL/api/GL/glext.h **/
  static _gl: WebGL2RenderingContext;
  static _program: WebGLProgram;
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  program: WebGLProgram;

  static create<VS extends string, FS extends string>(opt: {
    canvas?: HTMLCanvasElement;
    vertext_shader: VS;
    fragment_shader: FS;
  }): KrGl<RecordOfVariableTypeFromShaderString<VS | FS>> {
    return new KrGl(opt);
  }

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
  attribute_location<T extends keyof WebGlProgramVariable & string>(
    name: T,
    type: WebGlProgramVariable[T]
  ) {
    return new KrGlLocation(name, type, "attribute");
  }
}

class KrGlType<T extends KrGlslVarType> {
  constructor(public readonly type: T) {}
  get element_count(): typeof TYPECONVERT[T]["element_count"] {
    return TYPECONVERT[this.type].element_count;
  }
  get native_type(): typeof TYPECONVERT[T]["base_type"] {
    return TYPECONVERT[this.type].base_type;
  }
  get native_type_size(): typeof TYPECONVERT[T]["element_size"] {
    return TYPECONVERT[this.type].element_size;
  }
  get glenum(): WebGL2RenderingContext[typeof TYPECONVERT[T]["base_type"]] {
    return KrGl._gl[TYPECONVERT[this.type].base_type];
  }
}

type KrGlBufferString =
  | "ARRAY_BUFFER"
  | "UNIFORM_BUFFER"
  | "ELEMENT_ARRAY_BUFFER";

export class KrGlBuffer<BUFFTYPE extends KrGlBufferString> {
  webgl_buffer: WebGLBuffer;
  buffer_type: BUFFTYPE;
  constructor(buffer_type: BUFFTYPE) {
    this.buffer_type = buffer_type;
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
  TYPE extends KrGlslVarType,
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
      KrGl._gl.enableVertexAttribArray(this.location as any); // auto enable
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
