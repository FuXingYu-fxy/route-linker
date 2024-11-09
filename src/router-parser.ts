/* eslint-disable @typescript-eslint/naming-convention */
import { Node, NodePath, parseSync, traverse } from '@babel/core';
import { ArrowFunctionExpression, stringLiteral, type ObjectProperty } from '@babel/types';
import { RouterParseResult } from './types/bast';

function resolveArrowFunctionExpression(node: NodePath<ArrowFunctionExpression>) {
  const args = node.get('body').get('arguments') as NodePath<Node>[];
  const arg = args[0];
  if (arg.isStringLiteral()) {
    return arg.node.value;
  }
}

function createIsLiteralValueNodePath(name: string) {
  return function isLiteralNodePath(nodePath: NodePath<ObjectProperty>): nodePath is NodePath<ObjectProperty> {
    return nodePath.get('key').isIdentifier({name}) && nodePath.get('value').isLiteral();
  };
}

function createIsIdentifierValueNodePath(name: string) {
  return function isIdentifierNodePath(nodePath: NodePath<ObjectProperty>): nodePath is NodePath<ObjectProperty> {
    return nodePath.get('key').isIdentifier({name});
  };
} 

export function routerParser(code?: string) {
  const isPathNodePath = createIsLiteralValueNodePath('path');
  const isNameNodePath = createIsLiteralValueNodePath('name');
  const isComponentNodePath = createIsIdentifierValueNodePath('component');
  
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
        let pathNodePath: NodePath<ObjectProperty> | undefined;
        let compNodePath: NodePath<ObjectProperty> | undefined;
        let nameNodePath: NodePath<ObjectProperty> | undefined;

        for (const prop of properties) {
          if (!prop.isObjectProperty()) {
            continue;
          }
          if (isPathNodePath(prop)) {
            pathNodePath = prop;
          } else if (isComponentNodePath(prop)) {
            compNodePath = prop;
          } else if (isNameNodePath(prop)) {
            nameNodePath = prop;
          }
        }

        if (pathNodePath && compNodePath) {
          let pathValue = (pathNodePath.get('value').node as ReturnType<typeof stringLiteral>).value;
          let valuePathNode = compNodePath.get('value');
          state.parent.push(pathValue);
          pathValue = state.parent.join('/');
            // 1. Identifier
          if (valuePathNode.isIdentifier()) {
            const scopeBinding = valuePathNode.scope.getBinding(valuePathNode.node.name);
            const maybeArrowFn = (scopeBinding?.path.get('init') as NodePath<ArrowFunctionExpression>);
            valuePathNode = maybeArrowFn;
          } 
          if (valuePathNode.isArrowFunctionExpression()) {
            const ret = resolveArrowFunctionExpression(valuePathNode);
            if (ret) {
              state.result[pathValue] = ret;
            }
          }

          if (nameNodePath) {
            let nameValue = (nameNodePath.get('value').node as ReturnType<typeof stringLiteral>).value;
            state.result[nameValue] = state.result[pathValue];
          }
        }
      },
      exit(path, state) {
        const properties = path.get('properties');
        let pathNodePath: NodePath<ObjectProperty> | undefined;
        let compNodePath: NodePath<ObjectProperty> | undefined;
        for (const prop of properties) {
          if (!prop.isObjectProperty()) {
            continue;
          }
          if (isPathNodePath(prop)) {
            pathNodePath = prop;
          } else if (isComponentNodePath(prop)) {
            compNodePath = prop;
          }
          
          if (pathNodePath && compNodePath) {
            state.parent.pop();
            break;
          }
        }
      }
    }
  }, undefined, state);

  return state;
}

export function createAliasParser(paths: {[key: string]: string[]}) {
  // "@/*": ["src/*"]
  // "@/components/HelloWorld.vue" => "src/components/HelloWorld.vue"
  const patternCache = new Map<string, RegExp>();
  return function (aliasPath: string) {
    for (const [alias, targetPath] of Object.entries(paths)) {
      if (!patternCache.has(alias)) {
        patternCache.set(alias, new RegExp(`^${alias.replace('*', '(.*)')}$`));
      }
      const aliasPattern = patternCache.get(alias)!;
      if (aliasPattern.test(aliasPath)) {
        const targetPattern = targetPath[0].replace('*', '$1');
        return aliasPath.replace(aliasPattern, targetPattern);
      }
    }
    return aliasPath;
  };
}