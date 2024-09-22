export interface JsConfig {
  compilerOptions: {
    baseUrl: string;
    paths: {
      [key: string]: string[];
    };
  };
  include: string[];
}

export interface RouterParseResult {
  parent: string[];
  result: Record<string, string>;
};