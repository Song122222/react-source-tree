/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList} from 'shared/ReactTypes';

import {version, renderToStringImpl} from './ReactDOMLegacyServerImpl';
import {
  renderToNodeStream,
  renderToStaticNodeStream,
} from './ReactDOMLegacyServerNodeStream';

type ServerOptions = {
  identifierPrefix?: string,
};
// jsx语法转换成js语言的编译阶段    
function renderToString(
  children: ReactNodeList,
  options?: ServerOptions,
): string {
  return renderToStringImpl(
    children,
    options,
    false,
    '服务器使用“renderToString”，它不支持Suspense。如果您打算让这个Suspense边界在服务器上呈现回退内容，请考虑在Suspense边界内的某个地方抛出一个错误。如果你想让服务器等待挂起的组件，请切换到“ renderToPipeableStream ”，它在服务器上支持挂起',
  );
}

function renderToStaticMarkup(
  children: ReactNodeList,
  options?: ServerOptions,
): string {
  return renderToStringImpl(
    children,
    options,
    true,
    'The server used "renderToStaticMarkup" which does not support Suspense. If you intended to have the server wait for the suspended component please switch to "renderToPipeableStream" which supports Suspense on the server',
  );
}

export {
  renderToString,
  renderToStaticMarkup,
  renderToNodeStream,
  renderToStaticNodeStream,
  version,
};
