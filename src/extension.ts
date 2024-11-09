import path from 'path';
import { getFile, getFullPath, getLanguageConfig } from './util';
import { createAliasParser, routerParser } from './router-parser';
import { readJsonSync } from 'fs-extra';
import vscode from 'vscode';
const pkg = readJsonSync(path.join(__dirname, '../package.json'));

const defaultRoutePath = 'src/router/index.js';
export async function activate(context: vscode.ExtensionContext) {
  const workspace = vscode.workspace.workspaceFolders;
  const projectDir = workspace ? workspace[0].uri.fsPath : '';
  const outputChannel = vscode.window.createOutputChannel(pkg.displayName);
  let languageConfig;

  languageConfig = getLanguageConfig(projectDir);
  const aliasParser = createAliasParser(languageConfig.compilerOptions.paths);
  // 获取vscode配置文件定义的路由位置
  const routePath: string = vscode.workspace.getConfiguration(`${pkg.name}`).get('routeFile') ?? defaultRoutePath;

  const routeDefinitionPath = path.join(projectDir, routePath);
  const code = await getFile(routeDefinitionPath);
  // ast编译
  const { result } = routerParser(code);

  const disposable1 = vscode.languages.registerDefinitionProvider(['javascript', 'vue'], {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
      const wordRange = document.getWordRangeAtPosition(position);
      const word = document.getText(wordRange);
      const line = document.lineAt(position);

      outputChannel.appendLine(`当前光标所在单词: ${word}`);
      outputChannel.appendLine(`当前光标所在行: ${line.text}`);


      // 获取高亮文本的范围
      if (!word) {
        return ;
      }

      // 将单词补全, 高亮整个字符串, 而不是单词
      const [start, end] = getFullPath(line.text, word);
      const targetStr = line.text.slice(start, end);
      outputChannel.appendLine(`当前光标所在行的字符串: ${targetStr}`);
      if (!result[targetStr]) {
        return ;
      }
      const range = new vscode.Range(
        new vscode.Position(position.line, start),
        new vscode.Position(position.line, end)
      );

      
      const targetFile = path.join(projectDir, aliasParser(result[targetStr]));
      outputChannel.appendLine(`当前光标所在行的字符串对应的文件: ${result[targetStr]}`);
      outputChannel.appendLine(`当前光标所在行的字符串对应的文件的绝对路径: ${targetFile}`);

      const targetFileUri = vscode.Uri.file(targetFile);

      // 可以返回定义位置或者定义链接, 以下是返回的定义链接
      const ret: vscode.DefinitionLink = {
        originSelectionRange: range,
        targetRange: new vscode.Range(0,0,0,0),
        targetUri: targetFileUri
      };

      return [ret];
    }
  });

  const disposable2 = vscode.commands.registerCommand(`${pkg.name}.showRouteOutputChannel`, () => {
    outputChannel.appendLine(`result: ${JSON.stringify(result, null, 2)}`);
  });

  context.subscriptions.push(disposable1, disposable2);
}




// This method is called when your extension is deactivated
export function deactivate(context: vscode.ExtensionContext) {
  
}
