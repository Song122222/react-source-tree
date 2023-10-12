/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList, ReactFormState} from 'shared/ReactTypes';
import type {
  FiberRoot,
  SuspenseHydrationCallbacks,
  TransitionTracingCallbacks,
} from './ReactInternalTypes';
import type {RootTag} from './ReactRootTags';
import type {Cache} from './ReactFiberCacheComponent';
import type {Container} from './ReactFiberConfig';

import {noTimeout} from './ReactFiberConfig';
import {createHostRootFiber} from './ReactFiber';
import {
  NoLane,
  NoLanes,
  NoTimestamp,
  TotalLanes,
  createLaneMap,
} from './ReactFiberLane';
import {
  enableSuspenseCallback,
  enableCache,
  enableProfilerCommitHooks,
  enableProfilerTimer,
  enableUpdaterTracking,
  enableTransitionTracing,
} from '../../shared/ReactFeatureFlags';
import {initializeUpdateQueue} from './ReactFiberClassUpdateQueue';
import {LegacyRoot, ConcurrentRoot} from './ReactRootTags';
import {createCache, retainCache} from './ReactFiberCacheComponent';

export type RootState = {
  element: any,
  isDehydrated: boolean,
  cache: Cache,
};
// fiber 绑定关系  将dom节点绑定到fiber上  ---*真正的开始创建节点
function FiberRootNode(
  this: $FlowFixMe,
  containerInfo: any,
  // $FlowFixMe[missing-local-annot]
  tag,
  hydrate: any,
  identifierPrefix: any,
  onRecoverableError: any,
  formState: ReactFormState<any, any> | null,
) {
  this.tag = tag;
  this.containerInfo = containerInfo;
  this.pendingChildren = null;
  this.current = null;
  this.pingCache = null;
  this.finishedWork = null;
  this.timeoutHandle = noTimeout;
  this.cancelPendingCommit = null;
  this.context = null;
  this.pendingContext = null;
  this.next = null;
  this.callbackNode = null;
  this.callbackPriority = NoLane;
  this.expirationTimes = createLaneMap(NoTimestamp);

  this.pendingLanes = NoLanes;
  this.suspendedLanes = NoLanes;
  this.pingedLanes = NoLanes;
  this.expiredLanes = NoLanes;
  this.finishedLanes = NoLanes;
  this.errorRecoveryDisabledLanes = NoLanes;
  this.shellSuspendCounter = 0;

  this.entangledLanes = NoLanes;
  this.entanglements = createLaneMap(NoLanes);

  this.hiddenUpdates = createLaneMap(null);

  this.identifierPrefix = identifierPrefix;
  this.onRecoverableError = onRecoverableError;

  if (enableCache) {
    this.pooledCache = null;//内部缓存
    this.pooledCacheLanes = NoLanes;
  }

  if (enableSuspenseCallback) {
    this.hydrationCallbacks = null;
  }

  this.formState = formState;

  this.incompleteTransitions = new Map();
  if (enableTransitionTracing) {
    this.transitionCallbacks = null;
    const transitionLanesMap = (this.transitionLanes = []);
    for (let i = 0; i < TotalLanes; i++) {
      transitionLanesMap.push(null);
    }
  }

  if (enableProfilerTimer && enableProfilerCommitHooks) {
    this.effectDuration = 0;
    this.passiveEffectDuration = 0;
  }

  if (enableUpdaterTracking) {
    this.memoizedUpdaters = new Set();
    const pendingUpdatersLaneMap = (this.pendingUpdatersLaneMap = []);
    for (let i = 0; i < TotalLanes; i++) {
      pendingUpdatersLaneMap.push(new Set());
    }
  }

  if (__DEV__) {
    switch (tag) {
      case ConcurrentRoot:
        this._debugRootType = hydrate ? 'hydrateRoot()' : 'createRoot()';
        break;
      case LegacyRoot:
        this._debugRootType = hydrate ? 'hydrate()' : 'render()';
        break;
    }
  }
}
// 创建根节点内部操作函数
export function createFiberRoot(
  containerInfo: Container,
  tag: RootTag,
  hydrate: boolean,
  initialChildren: ReactNodeList,
  hydrationCallbacks: null | SuspenseHydrationCallbacks,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: null | boolean,
  // TODO: 我们有几个这样的论证它们在概念上是主要配置，我们必须进行threadhost配置，但因为它们是在运行时传入的，我们必须执行线程它们通过根构造函数 也许我们应该把它们都放进
  //单一类型，比如由渲染器定义的 DynamicHostConfig 。
  identifierPrefix: string,
  onRecoverableError: null | ((error: mixed) => void),
  transitionCallbacks: null | TransitionTracingCallbacks,
  formState: ReactFormState<any, any> | null,
): FiberRoot {
  // $FlowFixMe[invalid-constructor] Flow no longer supports calling new on functions
  const root: FiberRoot = (new FiberRootNode(
    containerInfo,
    tag,
    hydrate,
    identifierPrefix,
    onRecoverableError,
    formState,
  ));//生成实力化对象
  if (enableSuspenseCallback) {
    root.hydrationCallbacks = hydrationCallbacks;
  }

  if (enableTransitionTracing) {
    root.transitionCallbacks = transitionCallbacks;
  }

  // 重点    这里将current挂在到对应的fiber节点上，使current属性指向fiber节点中的stateNode属性， 也就是dom节点    全局搜索---*
  const uninitializedFiber = createHostRootFiber(
    tag,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
  );
  // 挂载
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;

  if (enableCache) {
    const initialCache = createCache();
    retainCache(initialCache);

    // pooledCache 是一个临时使用的新缓存实例用于在渲染期间新安装的边界 在一般情况下 pooledCache总是在渲染结束时从根目录中清除 它要么在渲染提交时被释放，要么在渲染挂起时被移到屏幕外的组件。
    // 因为池缓存的生命周期与主记忆状态是不同的缓存，它必须单独保留。
    root.pooledCache = initialCache;
    retainCache(initialCache);
    const initialState: RootState = {
      element: initialChildren,
      isDehydrated: hydrate,
      cache: initialCache,
    };
    uninitializedFiber.memoizedState = initialState;
  } else {
    const initialState: RootState = {
      element: initialChildren,
      isDehydrated: hydrate,
      cache: (null), // not enabled yet
    };
    uninitializedFiber.memoizedState = initialState;
  }

  initializeUpdateQueue(uninitializedFiber);

  return root;
}
/* 
重点    关于 pooledCache    ---*   
    
在 React 源码中，pooledCache 代表一个对象池，用于重用对象以提高性能和减少内存分配。这个对象池是由 ReactPooledCache 类实现的。

React 在内部使用对象池技术来管理一些常用的对象，以避免频繁地创建和销毁对象，从而提高性能。这些对象可以是 React 组件实例、事件对象、DOM 节点对象等等。  
*****需要注意的是：在 React 中，pooledCache 中的 release 方法是在 useEffect 函数调用 return 之前被调用的。
当使用 useEffect 定义副作用时，可以在函数体中返回一个清除函数。这个返回的函数会在组件卸载之前被调用，用于清理副作用相关的资源。
在这个返回的函数中， pooledCache  的 release 方法可以被调用以释放相应的资源，使其可以在需要时被重用。
---* 总结: 个人理解，在pooledCache的 release 方法调用之后才会调用react中effect函数的return 所以组件还是被销毁的，但是因为调用了release 所以当前组件会被缓存，
再次进行路由切换的时候会在对象池中拿到当前回到初始状态的对象，不会重新创建


pooledCache 的主要作用是在需要使用这些对象时，从对象池中获取已经存在的对象，而不是每次都创建新的对象。这样可以减少垃圾回收的压力，并且复用已有对象可以提供更高的性能。

对象池的实现通常包括两个主要操作：

get ：从对象池中获取一个对象。如果对象池中没有可用的对象，会根据需要创建新的对象。

release ：将一个对象释放回对象池中，以便以后复用。释放的对象会经过一些清理操作，以确保对象的状态符合对象池的要求。

通过使用对象池，React 可以避免反复创建和销毁对象，减少了系统开销，并提高了整体性能。对象池的使用是 React 内部的一种优化技术，对于一般的 React 开发者来说，不需要直接关注和使用对象池。


**********************************************************************************************************************************************************

在 React 的源码中，pooledCache 中的 release 操作主要在以下几个场景下被调用：

React 组件的卸载（unmount）：当一个组件被卸载时，React 会调用 release 操作将组件实例释放回 pooledCache 对象池中。这样可以在需要时再次复用该组件实例，而不必每次都重新创建新的组件实例。

事件处理：在处理 DOM 事件时，React 会创建事件对象并将其传递给事件处理函数。在事件处理完成之后，React 会调用 release 操作将事件对象释放回 pooledCache 对象池中，以便重用。

其他内部操作：pooledCache 可能还在其他内部操作中使用，例如处理一些常用对象的创建和释放。具体的实现细节可能因 React 版本和功能的不同而有所变化。

在 React 的源码中，pooledCache 中的 get 操作主要在以下几个场景下被调用：

创建组件实例：当需要创建一个新的 React 组件实例时，React 会调用 get 操作从 pooledCache 对象池中获取可用的组件实例。这样可以避免每次都需要创建新的组件实例，而是从对象池中复用已有的实例。

事件处理：在处理 DOM 事件时，React 可能会调用 get 操作从 pooledCache 对象池中获取可用的事件对象。这样可以避免每次都需要创建新的事件对象，而是从对象池中复用已有的对象。

其他内部操作：pooledCache 可能还在其他内部操作中使用，例如处理一些常用对象的创建和复用。具体的实现细节可能因 React 版本和功能的不同而有所变化。

在组件的生命周期中，release 方法会在以下情况下被调用：

组件卸载：当一个组件被卸载时（例如通过路由切换离开当前页面），React 会调用 release 方法将该组件的实例释放回 pooledCache 对象池中。这样可以在需要时再次复用该组件实例，而不必每次都重新创建新的组件实例。

特定的内部操作：在 React 内部的一些特定操作中，可能会调用 release 方法将对象释放回 pooledCache 对象池中。这些操作通常与 React 的实现细节相关，对于一般的 React 开发者来说，并不需要直接操作和管理 pooledCache。





**********************************************************************************************************************************************************

pooledCache 生成原理

React 的 pooledCache 对象池是通过 ReactPooledCache 类来实现的。它的生成原理可以简单概括为：

创建对象池的构造函数：React 使用 ReactPooledCache 类来创建对象池。这个构造函数会初始化一些对象池需要的属性和状态。

对象池的初始化：在初始化阶段，React 会创建一定数量的对象，然后将这些对象添加到对象池中。这些对象可以是 React 组件实例、事件对象或其他常用的对象。

对象的获取与释放：当需要使用一个对象时，React 会调用 get 方法从对象池中获取一个可用的对象。如果对象池中没有可用的对象，它会根据需要创建新的对象。

当对象不再使用时，React 会调用 release 方法将对象释放回对象池中，以便以后复用。

对象的重置和清理：在对象被复用之前，React 会确保对象的状态符合对象池的要求。这可能涉及一些对象属性的重置、清理或初始化操作。

通过对象池的生成和管理，React 可以在需要对象时快速获取并重用对象，而不是每次都创建新的对象。这样可以减少垃圾回收的开销和提高性能。

**********************************************************************************************************************************************************

对比与react17中的 pooledCache 发生了哪些变化

性能优化：React 不断致力于改进性能，并且可能在 React 18 中对 pooledCache 进行了一些优化。这可能包括改进对象池的内部实现、调整对象池的大小或缓存策略，以及提供更高效的对象获取和释放方法。

新的对象池类型：React 18 可能引入了新的对象池类型，以适应新的功能或改进现有功能。这可能涉及到新的对象池构造函数、初始化方式和对象的获取与释放方式。

内存管理：React 18 可能对内存管理进行了一些改进，以更好地管理对象池中的对象。这可能包括更精细的对象状态的重置和清理机制，以及更好的内存回收策略。


*/