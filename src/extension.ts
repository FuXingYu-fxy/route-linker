import path from 'path';
import { getFile, getFullPath } from './util';
import { routerParser } from './router-parser';
import { readJsonSync } from 'fs-extra';
import vscode from 'vscode';
const pkg = readJsonSync(path.join(__dirname, '../package.json'));

export async function activate(context: vscode.ExtensionContext) {
  const workspace = vscode.workspace.workspaceFolders;
  const workspacePath = workspace ? workspace[0].uri.fsPath : '';
  const outputChannel = vscode.window.createOutputChannel(pkg.displayName);

  const routeDefinitionPath = path.join(workspacePath, 'src/router/index.js');
  const code = await getFile(routeDefinitionPath);
  // ast编译
  const { result } = routerParser(code);
  outputChannel.appendLine(`result: ${JSON.stringify(result, null, 2)}`);
  vscode.window.showInformationMessage('插件已激活');
  

  const disposable1 = vscode.languages.registerDefinitionProvider(['javascript', 'vue'], {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
      const fileName = document.fileName;
      const workDir = path.dirname(fileName);
      const wordRange = document.getWordRangeAtPosition(position);
      const word = document.getText(wordRange);
      const line = document.lineAt(position);

      outputChannel.appendLine(`当前光标所在单词: ${word}`);
      outputChannel.appendLine(`当前光标所在行: ${line.text}`);

      const targetFile = `${path.join(workDir, 'App.vue')}`;
      const targetFileUri = vscode.Uri.file(targetFile);

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

      // 可以返回定义位置或者定义链接, 以下是返回的定义链接
      const ret: vscode.DefinitionLink = {
        originSelectionRange: range,
        targetRange: new vscode.Range(0,0,0,0),
        targetUri: targetFileUri
      };

      return [ret];
    }
  });

  context.subscriptions.push(disposable1);
}




// This method is called when your extension is deactivated
export function deactivate(context: vscode.ExtensionContext) {
  
}
