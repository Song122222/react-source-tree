/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';
import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';

import {enableCache} from 'shared/ReactFeatureFlags';
import {REACT_CONTEXT_TYPE} from 'shared/ReactSymbols';

import {pushProvider, popProvider} from './ReactFiberNewContext';
import * as Scheduler from 'scheduler';

// In environments without AbortController (e.g. tests)
// replace it with a lightweight shim that only has the features we use.
const AbortControllerLocal: typeof AbortController = enableCache
  ? typeof AbortController !== 'undefined'
    ? AbortController
    : // $FlowFixMe[missing-this-annot]
      // $FlowFixMe[prop-missing]
      function AbortControllerShim() {
        const listeners = [];
        const signal = (this.signal = {
          aborted: false,
          addEventListener: (type, listener) => {
            listeners.push(listener);
          },
        });

        this.abort = () => {
          signal.aborted = true;
          listeners.forEach(listener => listener());
        };
      }
  : // $FlowFixMe[incompatible-type]
    null;

export type Cache = {
  controller: AbortController,
  data: Map<() => mixed, mixed>,
  refCount: number,
};

export type CacheComponentState = {
  +parent: Cache,
  +cache: Cache,
};

export type SpawnedCachePool = {
  +parent: Cache,
  +pool: Cache,
};

// Intentionally not named imports because Rollup would
// use dynamic dispatch for CommonJS interop named imports.
const {
  unstable_scheduleCallback: scheduleCallback,
  unstable_NormalPriority: NormalPriority,
} = Scheduler;

export const CacheContext: ReactContext<Cache> = enableCache
  ? {
      $$typeof: REACT_CONTEXT_TYPE,
      // We don't use Consumer/Provider for Cache components. So we'll cheat.
      Consumer: (null: any),
      Provider: (null: any),
      // We'll initialize these at the root.
      _currentValue: (null: any),
      _currentValue2: (null: any),
      _threadCount: 0,
      _defaultValue: (null: any),
      _globalName: (null: any),
    }
  : (null: any);

if (__DEV__ && enableCache) {
  CacheContext._currentRenderer = null;
  CacheContext._currentRenderer2 = null;
}

// Creates a new empty Cache instance with a ref-count of 0. The caller is responsible
// for retaining the cache once it is in use (retainCache), and releasing the cache
// once it is no longer needed (releaseCache).
export function createCache(): Cache {
  if (!enableCache) {
    return (null);
  }
  /* 
  ---* 疑问  选择Map结构作为对象池数据缓存的原因
  快速的查找和删除操作： Map 提供了高效的查找（O(1)时间复杂度）和删除操作，允许在常数时间内找到并移除对象。这对于对象池的高效操作非常重要，特别是在大规模应用中，需要快速地查找和获取可重用的对象。

  键值对结构： Map 是一种键值对存储的数据结构，每个键对应一个值。在对象池中，通常可以使用某个属性值作为键，以便于快速地索引和定位到特定的对象。这种键值对结构在实际应用中非常实用。

  内置去重： Map 中的键是唯一的，这就确保了对象在对象池中的唯一性。避免了存储重复的对象，保持对象池的数据的一致性。

  易于迭代： Map 提供了内置的迭代方法，比如forEach，使得在对象池中进行遍历操作更加方便。
 
  灵活性和可操作性： Map 结构提供了丰富的API，可以轻松地实现各种操作，包括添加、删除、查找等。这使得开发者能够根据具体需求灵活地操作对象池中的数据。
  */
  const cache: Cache = {
    controller: new AbortControllerLocal(),//对象池实例对象
    data: new Map(),
    refCount: 0,
  };

  return cache;
}
// 初始化对象池函数
export function retainCache(cache: Cache) {
  if (!enableCache) {
    return;
  }
  if (__DEV__) {
    if (cache.controller.signal.aborted) {
      console.warn(
        '一个缓存实例在已释放后仍被保留 ' +
          '这可能表明React中存在bug.',
      );
    }
  }
  cache.refCount++;
}

// Cleanup a cache instance, potentially freeing it if there are no more references
export function releaseCache(cache: Cache) {
  if (!enableCache) {
    return;
  }
  cache.refCount--;
  if (__DEV__) {
    if (cache.refCount < 0) {
      console.warn(
        'A cache instance was released after it was already freed. ' +
          'This likely indicates a bug in React.',
      );
    }
  }
  if (cache.refCount === 0) {
    scheduleCallback(NormalPriority, () => {
      cache.controller.abort();
    });
  }
}

export function pushCacheProvider(workInProgress: Fiber, cache: Cache) {
  if (!enableCache) {
    return;
  }
  pushProvider(workInProgress, CacheContext, cache);
}

export function popCacheProvider(workInProgress: Fiber, cache: Cache) {
  if (!enableCache) {
    return;
  }
  popProvider(CacheContext, workInProgress);
}
