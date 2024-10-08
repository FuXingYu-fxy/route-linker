
import { name } from '../package.json';
import { existsSync, readFile, readFileSync, readJSONSync } from "fs-extra";
import path from 'path';
import { JsConfig } from './types/bast';


export const info = (...args: any[]) => console.log(`[${name}] `, ...args);

export function getFilenameFromPath(path: string) {
  return path.replace(/.+[\\\/](\w+\..+)/, '$1');
}

export const RE = {
  isJs: (path: string) => /\.js$/.test(path),
  isVue: (path: string) => /\.vue$/.test(path),
};

export async function getFile(absolutePath: string) {
  try {
    const data = await readFile(absolutePath, 'utf-8');
    return data;
  } catch (error) {
    info('getFile error: ', error);
  }
}

export function getFullPath(code: string, word: string) {
  let left = code.indexOf(word);
  let right = left + word.length - 1;
  const ret: number[] = [];

  if (left === -1) {
    return ret; // 如果没有找到子字符串，返回空
  }

  // 向左查找第一个引号
  while (left >= 0 && code[left] !== '"' && code[left] !== "'") {
    left--;
  }

  // 向右查找第一个引号
  while (right < code.length && code[right] !== '"' && code[right] !== "'") {
    right++;
  }

  // 如果找到的引号是成对的，则提取中间的字符串
  if (left >= 0 && right < code.length && code[left] === code[right]) {
    ret.push(left + 1, right);
  }

  return ret; 
}


/** 读取项目根目录下的jsconfig.json或者tsconfig.json文件 */
export function getLanguageConfig(dir: string): JsConfig {
  const languageConfig = ['js', 'ts'].map(v => path.join(dir, `${v}config.json`));
  for (const config of languageConfig) {
    if (existsSync(config)) {
      return readJSONSync(config, 'utf-8');
    }
  }
  throw new Error('未找到jsconfig.json或者tsconfig.json文件');
}