/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import  {ReactNodeList, ReactFormState} from '../../../shared/ReactTypes';
import  {
  FiberRoot,
  TransitionTracingCallbacks,
} from '../../../react-reconciler/src/ReactInternalTypes';

import {ReactDOMClientDispatcher} from 'react-dom-bindings/src/client/ReactFiberConfigDOM';
import {queueExplicitHydrationTarget} from 'react-dom-bindings/src/events/ReactDOMEventReplaying';
import {REACT_ELEMENT_TYPE} from '../../../shared/ReactSymbols';
import {
  enableFloat,
  enableHostSingletons,
  allowConcurrentByDefault,
  disableCommentsAsDOMContainers,
  enableAsyncActions,
  enableFormActions,
} from '../../../shared/ReactFeatureFlags';

import ReactDOMSharedInternals from '../ReactDOMSharedInternals';
const {Dispatcher} = ReactDOMSharedInternals;
if (enableFloat && typeof document !== 'undefined') {
  // Set the default dispatcher to the client dispatcher
  Dispatcher.current = ReactDOMClientDispatcher;
}
// 根节点类型
export type RootType = {
  render(children: ReactNodeList): void,//根节点的render方法   
  unmount(): void,//卸载时调用   并检查、更新节点状态，并最后在ReactDOM树中取消标记其为Root节点。
  _internalRoot: FiberRoot | null,//Fiber根节点   -也会同时创建   在react18中仍然使用这种方式去做数据对比更新，在这个方法中仍然是这样，高并发模式下个人认为应该不会传入这个根节点了
  
};
export type CreateRootOptions = {
  unstable_strictMode?: boolean,
  unstable_concurrentUpdatesByDefault?: boolean,
  unstable_transitionCallbacks?: TransitionTracingCallbacks,
  identifierPrefix?: string,
  onRecoverableError?: (error: mixed) => void,
};

export type HydrateRootOptions = {
  // Hydration options
  onHydrated?: (suspenseNode: Comment) => void,
  onDeleted?: (suspenseNode: Comment) => void,
  // Options for all roots
  unstable_strictMode?: boolean,
  unstable_concurrentUpdatesByDefault?: boolean,
  unstable_transitionCallbacks?: TransitionTracingCallbacks,
  identifierPrefix?: string,
  onRecoverableError?: (error: mixed) => void,
  formState?: ReactFormState<any, any> | null,
  
};

import {
  isContainerMarkedAsRoot,
  markContainerAsRoot,
  unmarkContainerAsRoot,
} from '../../../react-dom-bindings/src/client/ReactDOMComponentTree';
import {listenToAllSupportedEvents} from 'react-dom-bindings/src/events/DOMPluginEventSystem';
import {
  ELEMENT_NODE,
  COMMENT_NODE,
  DOCUMENT_NODE,
  DOCUMENT_FRAGMENT_NODE,
} from '../../../react-dom-bindings/src/client/HTMLNodeType';

import {
  createContainer,
  createHydrationContainer,
  updateContainer,
  findHostInstanceWithNoPortals,
  flushSync,
  isAlreadyRendering,
} from '../../../react-reconciler/src/ReactFiberReconciler';
import {ConcurrentRoot} from 'react-reconciler/src/ReactRootTags';

/* global reportError */
const defaultOnRecoverableError =
  typeof reportError === 'function'
    ? // In modern browsers, reportError will dispatch an error event,
      // emulating an uncaught JavaScript error.
      reportError
    : (error) => {
        // In older browsers and test environments, fallback to console.error.
        // eslint-disable-next-line react-internal/no-production-logging
        console['error'](error);
      };

// $FlowFixMe[missing-this-annot]
function ReactDOMRoot(internalRoot: FiberRoot) {
  this._internalRoot = internalRoot;
}

// $FlowFixMe[prop-missing] found when upgrading Flow
ReactDOMHydrationRoot.prototype.render = ReactDOMRoot.prototype.render =
  // $FlowFixMe[missing-this-annot]
  function (children: ReactNodeList): void {
    const root = this._internalRoot;
    if (root === null) {
      throw new Error('Cannot update an unmounted root.');
    }

    if (__DEV__) {
      if (typeof arguments[1] === 'function') {
        console.error(
          'render(...): does not support the second callback argument. ' +
            'To execute a side effect after rendering, declare it in a component body with useEffect().',
        );
      } else if (isValidContainer(arguments[1])) {
        console.error(
          'You passed a container to the second argument of root.render(...). ' +
            "You don't need to pass it again since you already passed it to create the root.",
        );
      } else if (typeof arguments[1] !== 'undefined') {
        console.error(
          'You passed a second argument to root.render(...) but it only accepts ' +
            'one argument.',
        );
      }

      const container = root.containerInfo;

      if (
        !enableFloat &&
        !enableHostSingletons &&
        container.nodeType !== COMMENT_NODE
      ) {
        const hostInstance = findHostInstanceWithNoPortals(root.current);
        if (hostInstance) {
          if (hostInstance.parentNode !== container) {
            console.error(
              'render(...): It looks like the React-rendered content of the ' +
                'root container was removed without using React. This is not ' +
                'supported and will cause errors. Instead, call ' +
                "root.unmount() to empty a root's container.",
            );
          }
        }
      }
    }
    updateContainer(children, root, null, null);
  };

// $FlowFixMe[prop-missing] found when upgrading Flow
ReactDOMHydrationRoot.prototype.unmount = ReactDOMRoot.prototype.unmount =
  // $FlowFixMe[missing-this-annot]
  function () {
    if (__DEV__) {
      if (typeof arguments[0] === 'function') {
        console.error(
          'unmount(...): does not support a callback argument. ' +
            'To execute a side effect after rendering, declare it in a component body with useEffect().',
        );
      }
    }
    const root = this._internalRoot;
    if (root !== null) {
      this._internalRoot = null;
      const container = root.containerInfo;
      if (__DEV__) {
        if (isAlreadyRendering()) {
          console.error(
            'Attempted to synchronously unmount a root while React was already ' +
              'rendering. React cannot finish unmounting the root until the ' +
              'current render has completed, which may lead to a race condition.',
          );
        }
      }
      flushSync(() => {
        updateContainer(null, root, null, null);
      });
      unmarkContainerAsRoot(container);
    }
  };
// 创建根节点的方法   真正的创建根节点的方法   外部包裹了一个私有函数用来区分环境
export function createRoot(
  // 类型  Element | Document | DocumentFragment
  container,//传入的根节点
    // 类型CreateRootOptions
  options,
) {
  // 判断目标根节点是否为根节点的方法
  if (!isValidContainer(container)) {
    throw new Error('目标容器不是一个DOM元素。');
  }
// 检索节点是否为遵循react渲染原则
  warnIfReactDOMContainerInDEV(container);

  let isStrictMode = false;
  let concurrentUpdatesByDefaultOverride = false;
  let identifierPrefix = '';
  let onRecoverableError = defaultOnRecoverableError;
  let transitionCallbacks = null;

  if (options !== null && options !== undefined) {
    if (__DEV__) {
      // hydrate  复用已经存在的dom节点 减少重新生成节点以及删除原本 DOM 节点的开销，来加速初次渲染的功能。 但是这里因为是初次创建dom节点，所以会有一个warring   react不建议这个做
      if ((options).hydrate) {
        console.warn(
          '不赞成通过createRoot进行水合。 Use ReactDOMClient.hydrateRoot(container, <App />) instead.',
        );
      } else {
        // 这里的意义是根节点不能传入一个jsx文件，通过REACT_ELEMENT_TYPE来判断是否为一个ReactDom元素   根节点必须为dom元素
        if (
          typeof options === 'object' &&
          options !== null &&
          (options).$$typeof === REACT_ELEMENT_TYPE
        ) {
          console.error(
            '您将JSX元素传递给createRoot。你可能是有意的 ' +
              'call root.render instead. ' +
              'Example usage:\n\n' +
              '  let root = createRoot(domContainer);\n' +
              '  root.render(<App />);',
          );
        }
      }
    }
    // 看不懂
    if (options.unstable_strictMode === true) {
      isStrictMode = true;
    }
    if (
      allowConcurrentByDefault &&
      options.unstable_concurrentUpdatesByDefault === true
    ) {
      concurrentUpdatesByDefaultOverride = true;
    }
    if (options.identifierPrefix !== undefined) {
      identifierPrefix = options.identifierPrefix;
    }
    if (options.onRecoverableError !== undefined) {
      onRecoverableError = options.onRecoverableError;
    }
    if (options.unstable_transitionCallbacks !== undefined) {
      transitionCallbacks = options.unstable_transitionCallbacks;
    }
  }

  const root = createContainer(
    container,
    ConcurrentRoot,
    null,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks,
  );
  markContainerAsRoot(root.current, container);
  Dispatcher.current = ReactDOMClientDispatcher;
// 类型 : Document | Element | DocumentFragment
  const rootContainerElement =
    container.nodeType === COMMENT_NODE //注释节点
      ? (container.parentNode)//父节点
      : container;//自身
  listenToAllSupportedEvents(rootContainerElement);

  //类型 RootType
  return new ReactDOMRoot(root);
}

// $FlowFixMe[missing-this-annot]
function ReactDOMHydrationRoot(internalRoot) {
  // 根节点替换成当前节点
  this._internalRoot = internalRoot;
}
function scheduleHydration(target) {
  if (target) {
    queueExplicitHydrationTarget(target);
  }
}
// $FlowFixMe[prop-missing] found when upgrading Flow
ReactDOMHydrationRoot.prototype.unstable_scheduleHydration = scheduleHydration;
// 服务器端渲染 

/*
如果container是document则rootElement是html，否则是他的第一个子节点。看到这里就需要注意我们为什么不推荐使用document来作为container了，因为他会直接把html覆盖。
*/
export function hydrateRoot(
  container,//dom元素容器 
  initialChildren,//可以接受第二个参数  接受原生 JSX 作为第二个参数。这是因为初始客户端渲染是特殊的，需要与服务器树匹配。
  options,
) {
  // 判断节点是否为dom节点  
  if (!isValidContainer(container)) {   
    throw new Error('目标元素必须为dom节点');
  }
// 接受一个根节点  检索节点是否为遵循react渲染原则
  warnIfReactDOMContainerInDEV(container);

  if (__DEV__) {
    // 是否为必传
    if (initialChildren === undefined) {
      console.error(
        '必须为hydrateRoot提供初始子元素作为第二个参数。 ' +
          'Example usage: hydrateRoot(domContainer, <App />)',
      );
    }
  }

  // For now we reuse the whole bag of options since they contain
  // the hydration callbacks.
  const hydrationCallbacks = options != null ? options : null;

  let isStrictMode = false;
  let concurrentUpdatesByDefaultOverride = false;
  let identifierPrefix = '';
  let onRecoverableError = defaultOnRecoverableError;
  let transitionCallbacks = null;
  let formState = null;
  if (options !== null && options !== undefined) {
    if (options.unstable_strictMode === true) {
      isStrictMode = true;
    }
    if (
      allowConcurrentByDefault &&
      options.unstable_concurrentUpdatesByDefault === true
    ) {
      concurrentUpdatesByDefaultOverride = true;
    }
    if (options.identifierPrefix !== undefined) {
      identifierPrefix = options.identifierPrefix;
    }
    if (options.onRecoverableError !== undefined) {
      onRecoverableError = options.onRecoverableError;
    }
    if (options.unstable_transitionCallbacks !== undefined) {
      transitionCallbacks = options.unstable_transitionCallbacks;
    }
    if (enableAsyncActions && enableFormActions) {
      if (options.formState !== undefined) {
        formState = options.formState;
      }
    }
  }
// 根节点
  const root = createHydrationContainer(
    initialChildren,
    null,
    container,
    ConcurrentRoot,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks,
    formState,
  );
  markContainerAsRoot(root.current, container);
  Dispatcher.current = ReactDOMClientDispatcher;
  // This can't be a comment node since hydration doesn't work on comment nodes anyway.
  listenToAllSupportedEvents(container);

  // 返回值类型 RootType
  return new ReactDOMHydrationRoot(root);
}
// 判断是否container是否为一个dom元素
export function isValidContainer(node) {
  return !!(
    node &&
    (node.nodeType === ELEMENT_NODE ||
      node.nodeType === DOCUMENT_NODE ||
      node.nodeType === DOCUMENT_FRAGMENT_NODE ||
      (!disableCommentsAsDOMContainers &&
        node.nodeType === COMMENT_NODE &&//react中的注释节点
        (node).nodeValue === 'react-mount-point-unstable '))
  );
}

//判断是否为html元素函数  react17
export function isValidContainerLegacy(node) {
  return !!(
    node &&
    (node.nodeType === ELEMENT_NODE ||
      node.nodeType === DOCUMENT_NODE ||
      node.nodeType === DOCUMENT_FRAGMENT_NODE ||
      (node.nodeType === COMMENT_NODE && //react中的注释节点
        (node).nodeValue === 'react-mount-point-unstable'))
  );
}
// 接受一个根节点  检索节点是否为遵循react渲染原则
function warnIfReactDOMContainerInDEV(container) {
  if (__DEV__) {
    if (
      !enableHostSingletons &&
      container.nodeType === ELEMENT_NODE &&   //DOM.nodeType为节点的类型  当为1 的时候就是一个dom节点
      ((container)).tagName &&  //判断是否为dom节点   通过tagName判断是否为标签
      ((container)).tagName.toUpperCase() === 'BODY'  // react不支持根节点为body节点
    ) {
      console.error(
        'createRoot():直接用文档创建根。身体是' +  
          '根节点不能直接创建到body上 ' + // react不支持根节点为body节点
          'scripts and browser extensions. This may lead to subtle ' +
          'reconciliation issues. 尝试使用创建的容器元素 ' //没有创建容器元素   DOM.nodeType为节点的类型  当为1 的时候就是一个dom节点
      );
    }
    if (isContainerMarkedAsRoot(container)) {
      if (container._reactRootContainer) {
        // container必须为dom标签，而不是react节点
        console.error(
          '在之前的容器上调用ReactDOMClient.createRoot()' +
            '传递给ReactDOM.render()。这是不支持的.',
        );
      } else {
        console.error(
          'You are calling ReactDOMClient.createRoot() on a container that ' +
            'has already been passed to createRoot() before. Instead, call ' +
            'root.render() on the existing root instead if you want to update it.',
        );
      }
    }
  }
}
