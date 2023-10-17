/**
 * 在react18中仍然保存着三种设计模型，这三种设计模型是和用户的调用方式有关系的
 * const reactDOMBolckingRoot = ReactDOM.createBlockingRoot(
     document.getElementById('root'),
    );
    // 2. 调用render
    reactDOMBolckingRoot.render(<App />); // 不支持回调   常见的调用方式，当使用这种调用方式的时候，会暴露18的部分api   17内部源码  17.02删除
 *
 * 
 * 
 *
 * @flow
 */

import type {ReactNodeList} from '../../../shared/ReactTypes';
import type {
  Container,
  PublicInstance,
} from 'react-dom-bindings/src/client/ReactFiberConfigDOM';
import type {
  RootType,
  HydrateRootOptions,
  CreateRootOptions,
} from './ReactDOMRoot';

import {
  findDOMNode,
  render,
  hydrate,
  unstable_renderSubtreeIntoContainer,
  unmountComponentAtNode,
} from './ReactDOMLegacy';
import {
  createRoot as createRootImpl,
  hydrateRoot as hydrateRootImpl,
  isValidContainer,
} from './ReactDOMRoot';
import {createEventHandle} from 'react-dom-bindings/src/client/ReactDOMEventHandle';

import {
  batchedUpdates,
  flushSync as flushSyncWithoutWarningIfAlreadyRendering,
  isAlreadyRendering,
  injectIntoDevTools,
} from '../../../react-reconciler/src/ReactFiberReconciler';
import {runWithPriority} from 'react-reconciler/src/ReactEventPriorities';
import {createPortal as createPortalImpl} from 'react-reconciler/src/ReactPortal';
import {canUseDOM} from 'shared/ExecutionEnvironment';
import ReactVersion from 'shared/ReactVersion';

import {
  getClosestInstanceFromNode,
  getInstanceFromNode,
  getNodeFromInstance,
  getFiberCurrentPropsFromNode,
} from 'react-dom-bindings/src/client/ReactDOMComponentTree';
import {
  enqueueStateRestore,
  restoreStateIfNeeded,
} from 'react-dom-bindings/src/events/ReactDOMControlledComponent';
import Internals from '../ReactDOMSharedInternals';

export {
  prefetchDNS,
  preconnect,
  preload,
  preloadModule,
  preinit,
  preinitModule,
} from '../shared/ReactDOMFloat';
export {
  useFormStatus,
  useFormState,
} from 'react-dom-bindings/src/shared/ReactDOMFormActions';

if (__DEV__) {
  if (
    typeof Map !== 'function' ||
    // $FlowFixMe[prop-missing] Flow incorrectly thinks Map has no prototype
    Map.prototype == null ||
    typeof Map.prototype.forEach !== 'function' ||
    typeof Set !== 'function' ||
    // $FlowFixMe[prop-missing] Flow incorrectly thinks Set has no prototype
    Set.prototype == null ||
    typeof Set.prototype.clear !== 'function' ||
    typeof Set.prototype.forEach !== 'function'
  ) {
    console.error(
      'React depends on Map and Set built-in types. Make sure that you load a ' +
        'polyfill in older browsers. https://reactjs.org/link/react-polyfills',
    );
  }
}

function createPortal(
  children: ReactNodeList,
  container: Element | DocumentFragment,
  key: ?string = null,
): React$Portal {
  if (!isValidContainer(container)) {
    throw new Error('Target container is not a DOM element.');
  }

  // TODO: pass ReactDOM portal implementation as third argument
  // $FlowFixMe[incompatible-return] The Flow type is opaque but there's no way to actually create it.
  return createPortalImpl(children, container, null, key);
}

function renderSubtreeIntoContainer(
  parentComponent: React$Component<any, any>,
  element: React$Element<any>,
  containerNode: Container,
  callback: ?Function,
): React$Component<any, any> | PublicInstance | null {
  return unstable_renderSubtreeIntoContainer(
    parentComponent,
    element,
    containerNode,
    callback,
  );
}
// 创建一个dom根节点   不支持ssr
function createRoot(
  container: Element | Document | DocumentFragment,
  options?: CreateRootOptions,
): RootType {
  // 区分环境
  if (__DEV__) {     
    //关于UMD
    /*
    UMD是一种通用的JavaScript模块定义规范，旨在使你的代码能够同时在不同的环境中运行，如浏览器、Nodejs和AMD/CMD 模块加载器。UMD的目标是实现模块化开发，使你的代码在各种场景下都能够正常工作
    UMD 模块通常包含以下特点:
    通用性: UMD 模块可以在不同的 JavaScript 环境中使用，不受特定模块系统的限制。
    2.判断环境: UMD 模块会检测当前代码运行的环境，通常检查全局对象(如“window或globa1) 以确定它是否在浏览器、Nodejs 或其他环境中运行。
    3.适配不同模块系统: UMD 模块可以适配不同的模块加载系统，如CommonJS、AMDES6 模块等，以便于在各种项目中使用。
    4.全局导出:UMD 模块通常会将模块的公共接口绑定到全局对象上，以便其他代码可以直4接访问。
    */ 
  // Internals.usingClientEntryPoint  -----是否为客户端导入    不应该从当前文件导入，这个函数是一个私有函数，是用来区分环境的    
    if (!Internals.usingClientEntryPoint && !__UMD__) {
      // 如果引入方式错误并不会中断程序执行，只是会打印一个红色的消息
      console.error(
        '您正在从“react-dom”导入createRoot,这是不支持的。' +
          '你应该从“react-dom/client”导入它。',
      );
    }
  }
  // Impl后缀在react中代表实现的是私有函数   
  return createRootImpl(container, options);
}

function hydrateRoot(
  container: Document | Element,
  initialChildren: ReactNodeList,
  options?: HydrateRootOptions,
): RootType {
  if (__DEV__) {
    if (!Internals.usingClientEntryPoint && !__UMD__) {
      console.error(
        '您正在从“react-dom”导入createRoot,这是不支持的。' +
          '你应该从“react-dom/client”导入它。',
      );
    }
  }
  return hydrateRootImpl(container, initialChildren, options);
}

// declare声明全局的一些东西
declare function flushSync<R>(fn: () => R): R;
// eslint-disable-next-line no-redeclare
declare function flushSync(): void;
/* 
*  flushSync是一个用于立即执行排队的更新的方法。通常情况下，React会批量处理组件的状态和属性更新，以提高性能。但是，有时候您可能希望立即执行更新，而不是等待React的下一次渲染周期。
* 让setState变成同步的一个方法
*/
// 如果在本地开发模式下，如果在生命周期方法中调用了这个函数，会有报错
function flushSync<R>(fn: (() => R) | void): R | void {
  if (__DEV__) {
    if (isAlreadyRendering()) {
      console.error(
        'flushSync 从生命周期方法内部调用。不能反应 ' +
          'flush when React is already rendering. Consider moving this call to ' +
          'a scheduler task or micro task.',
      );
    }
  }
  // 同步处理状态的时候调用这个方法
  return flushSyncWithoutWarningIfAlreadyRendering(fn);
}

export {
  createPortal,
  batchedUpdates as unstable_batchedUpdates,
  flushSync,
  ReactVersion as version,
  // Disabled behind disableLegacyReactDOMAPIs
  findDOMNode,
  hydrate,
  render,
  unmountComponentAtNode,
  // exposeConcurrentModeAPIs
  createRoot,
  hydrateRoot,
  // Disabled behind disableUnstableRenderSubtreeIntoContainer
  renderSubtreeIntoContainer as unstable_renderSubtreeIntoContainer,
  // enableCreateEventHandleAPI
  createEventHandle as unstable_createEventHandle,
  // TODO: Remove this once callers migrate to alternatives.
  // This should only be used by React internals.
  runWithPriority as unstable_runWithPriority,
};

// Keep in sync with ReactTestUtils.js.
// This is an array for better minification.
Internals.Events = [
  getInstanceFromNode,
  getNodeFromInstance,
  getFiberCurrentPropsFromNode,
  enqueueStateRestore,
  restoreStateIfNeeded,
  batchedUpdates,
];

const foundDevTools = injectIntoDevTools({
  findFiberByHostInstance: getClosestInstanceFromNode,
  bundleType: __DEV__ ? 1 : 0,
  version: ReactVersion,
  rendererPackageName: 'react-dom',
});

if (__DEV__) {
  if (!foundDevTools && canUseDOM && window.top === window.self) {
    // If we're in Chrome or Firefox, provide a download link if not installed.
    if (
      (navigator.userAgent.indexOf('Chrome') > -1 &&
        navigator.userAgent.indexOf('Edge') === -1) ||
      navigator.userAgent.indexOf('Firefox') > -1
    ) {
      const protocol = window.location.protocol;
      // Don't warn in exotic cases like chrome-extension://.
      if (/^(https?|file):$/.test(protocol)) {
        // eslint-disable-next-line react-internal/no-production-logging
        console.info(
          '%cDownload the React DevTools ' +
            'for a better development experience: ' +
            'https://reactjs.org/link/react-devtools' +
            (protocol === 'file:'
              ? '\nYou might need to use a local HTTP server (instead of file://): ' +
                'https://reactjs.org/link/react-devtools-faq'
              : ''),
          'font-weight:bold',
        );
      }
    }
  }
}
