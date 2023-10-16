/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import ReactVersion from 'shared/ReactVersion';

import type {ReactNodeList} from 'shared/ReactTypes';

import {
  createRequest,
  startWork,
  startFlowing,
  abort,
} from '../../../react-server/src/ReactFizzServer';

import {
  createResumableState,
  createRenderState,
  createRootFormatContext,
} from 'react-dom-bindings/src/server/ReactFizzConfigDOMLegacy';

type ServerOptions = {
  identifierPrefix?: string,
};

function onError() {
  // Non-fatal errors are ignored.
}
// 服务器端私有函数  dom转换字符串的私有函数   /.私有函数
function renderToStringImpl(
  children: ReactNodeList,
  options: void | ServerOptions,
  generateStaticMarkup: boolean,
  abortReason: string,
): string {
  let didFatal = false;
  let fatalError = null;
  let result = '';
  const destination = {
    // $FlowFixMe[missing-local-annot]
    push(chunk) {
      if (chunk !== null) {
        result += chunk;
      }
      return true;
    },
    // $FlowFixMe[missing-local-annot]
    destroy(error) {
      didFatal = true;
      fatalError = error;
    },
  };

  let readyToStream = false;
  function onShellReady() {
    readyToStream = true;
  }
  const resumableState = createResumableState(
    options ? options.identifierPrefix : undefined,
    undefined,
  );
  const request = createRequest(
    children,
    resumableState,
    createRenderState(resumableState, generateStaticMarkup),
    createRootFormatContext(),
    Infinity,
    onError,
    undefined,
    onShellReady,
    undefined,
    undefined,
    undefined,
  );
  startWork(request);
  // If anything suspended and is still pending, we'll abort it before writing.
  // That way we write only client-rendered boundaries from the start.
  abort(request, abortReason);
  startFlowing(request, destination);
  if (didFatal && fatalError !== abortReason) {
    throw fatalError;
  }

  if (!readyToStream) {
    // Note: This error message is the one we use on the client. It doesn't
    // really make sense here. But this is the legacy server renderer, anyway.
    // We're going to delete it soon.
    throw new Error(
      '在响应同步输入时挂起的组件。这将导致UI被一个加载指示器取代。要修复挂起的更新，应该用startTransition包装'
    );
  }

  return result;
}

export {renderToStringImpl, ReactVersion as version};
