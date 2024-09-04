/* eslint-disable @typescript-eslint/naming-convention */
import { Node, NodePath, parseSync, traverse } from '@babel/core';
import { stringLiteral, type ObjectProperty } from '@babel/types';

type RouterParseResult = {
  parent: string[];
  result: Record<string, string>;
};

export function routerParser(code?: string) {
  function isPathNodePath(nodePath: NodePath<ObjectProperty>): nodePath is NodePath<ObjectProperty> {
    return nodePath.get('key').isIdentifier({name: 'path'}) && nodePath.get('value').isLiteral();
  }
  
  function isComponentNodePath(nodePath: NodePath<ObjectProperty>): nodePath is NodePath<ObjectProperty> {
    return nodePath.get('key').isIdentifier({name: 'component'});
  }
  const state: RouterParseResult = {
    parent: [],
    result: {}
  };
  if (!code) {
    return state;
  }
  const ast = parseSync(code, {sourceType: 'module' });
  if (!ast) {
    return state;
  }
  
  traverse(ast, {
    ObjectExpression: {
      enter(path, state) {
        const properties = path.get('properties');
        let kNodePath: NodePath<ObjectProperty> | undefined;
        let vNodePath: NodePath<ObjectProperty> | undefined;
        for (const prop of properties) {
          if (!prop.isObjectProperty()) {
            continue;
          }
          if (isPathNodePath(prop)) {
            kNodePath = prop;
          } else if (isComponentNodePath(prop)) {
            vNodePath = prop;
          }

          if (kNodePath && vNodePath) {
            let pathValue = (kNodePath.node.value as unknown as ReturnType<typeof stringLiteral>).value;
            let valuePathNode = vNodePath.get('value');
            state.parent.push(pathValue);
            pathValue = state.parent.join('/');
              // 1. Identifier
            if (valuePathNode.isIdentifier()) {
              state.result[pathValue] = valuePathNode.node.name;
              // 2. ArrowFunctionExpression
            } else if (valuePathNode.isArrowFunctionExpression()) {
              const args = valuePathNode.get('body').get('arguments') as NodePath<Node>[];
              const arg = args[0];
              if (arg.isStringLiteral()) {
                state.result[pathValue] = arg.node.value;
              }
            }
            break;
          }
        }
      },
      exit(path, state) {
        const properties = path.get('properties');
        let kNodePath: NodePath<ObjectProperty> | undefined;
        let vNodePath: NodePath<ObjectProperty> | undefined;
        for (const prop of properties) {
          if (!prop.isObjectProperty()) {
            continue;
          }
          if (isPathNodePath(prop)) {
            kNodePath = prop;
          } else if (isComponentNodePath(prop)) {
            vNodePath = prop;
          }
          
          if (kNodePath && vNodePath) {
            state.parent.pop();
            break;
          }
        }
      }
    }
  }, undefined, state);

  return state;
}