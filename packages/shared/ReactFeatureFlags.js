/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// -----------------------------------------------------------------------------
// Land or remove (zero effort)
//
// Flags that can likely be deleted or landed without consequences
// -----------------------------------------------------------------------------

export const enableComponentStackLocations = true;

// -----------------------------------------------------------------------------
// Killswitch
//
// Flags that exist solely to turn off a change in case it causes a regression
// when it rolls out to prod. We should remove these as soon as possible.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Land or remove (moderate effort)
//
// Flags that can be probably deleted or landed, but might require extra effort
// like migrating internal callers or performance testing.
// -----------------------------------------------------------------------------

// TODO: Finish rolling out in www
export const enableClientRenderFallbackOnTextMismatch = true;
export const enableFormActions = true;
export const enableAsyncActions = true;

// Not sure if www still uses this. We don't have a replacement but whatever we
// replace it with will likely be different than what's already there, so we
// probably should just delete it as long as nothing in www relies on it.
export const enableSchedulerDebugging = false;

// Need to remove didTimeout argument from Scheduler before landing
export const disableSchedulerTimeoutInWorkLoop = false;

// This will break some internal tests at Meta so we need to gate this until
// those can be fixed.
export const enableDeferRootSchedulingToMicrotask = true;

// -----------------------------------------------------------------------------
// Slated for removal in the future (significant effort)
//
// These are experiments that didn't work out, and never shipped, but we can't
// delete from the codebase until we migrate internal callers.
// -----------------------------------------------------------------------------

// Add a callback property to suspense to notify which promises are currently
// in the update queue. This allows reporting and tracing of what is causing
// the user to see a loading state.
//
// Also allows hydration callbacks to fire when a dehydrated boundary gets
// hydrated or deleted.
//
// enableSuspenseCallback用于启用或禁用React的新特性——suspense callback。
/* 
默认情况下，enableSuspenseCallback常量的值为false，即suspense callback特性被禁用。如果需要启用suspense callback特性，可以在应用程序的根组件中将enableSuspenseCallback常量的值设置为true。
启用suspense callback后，开发者可以使用新的React API来处理异步数据的加载，
例如React.useDeferredValue和React.useTransition。这些API可以帮助开发者更好地控制数据加载过程中的UI展示，并提供更好的用户体验。
*/
export const enableSuspenseCallback = false;

// Experimental Scope support.
export const enableScopeAPI = false;

// Experimental Create Event Handle API.
export const enableCreateEventHandleAPI = false;

// Support legacy Primer support on internal FB www
export const enableLegacyFBSupport = false;

// -----------------------------------------------------------------------------
/*
enableCache 选项被用于控制 React 是否启用一些缓存机制，以提高组件的渲染效率。当 enableCache 为 false 时，React 将禁用一些内部的缓存优化，可能会导致渲染性能下降。

以下是一些可能的使用场景：

调试模式：在调试 React 的内部工作原理时，可能会将 enableCache 设置为 false，以便更好地理解 React 的渲染过程和行为。

性能分析：在性能分析和优化 React 应用程序时，可能会禁用 enableCache，以便更好地评估组件渲染的性能瓶颈和优化效果。

*/

export const enableCache = true;//是否启用缓存
export const enableLegacyCache = __EXPERIMENTAL__;
export const enableCacheElement = __EXPERIMENTAL__;
export const enableFetchInstrumentation = true;

export const enableBinaryFlight = __EXPERIMENTAL__;

export const enableTaint = __EXPERIMENTAL__;

export const enablePostpone = __EXPERIMENTAL__;
/* 
enableTransitionTracing 是React中的一个开发者工具标志，它用于启用或禁用React的过渡追踪（Transition Tracing）特性。Transition Tracing 是React的一个性能工具，用于帮助开发者追踪组件渲染的过程，了解组件的挂载、更新和卸载等阶段所花费的时间。

在React的开发模式下，你可以通过设置 enableTransitionTracing 为 true 来启用过渡追踪。当它被启用时，React会在组件的挂载、更新和卸载等阶段记录时间戳，开发者可以通过React DevTools等工具查看这些时间戳，从而了解各个阶段的性能情况。
*/
export const enableTransitionTracing = false;

// No known bugs, but needs performance testing
export const enableLazyContextPropagation = false;

// FB-only usage. The new API has different semantics.
export const enableLegacyHidden = false;

// Enables unstable_avoidThisFallback feature in Fiber
export const enableSuspenseAvoidThisFallback = false;
// Enables unstable_avoidThisFallback feature in Fizz
export const enableSuspenseAvoidThisFallbackFizz = false;

export const enableCPUSuspense = __EXPERIMENTAL__;

export const enableHostSingletons = true;

export const enableFloat = true;

// Enables unstable_useMemoCache hook, intended as a compilation target for
// auto-memoization.
export const enableUseMemoCacheHook = __EXPERIMENTAL__;

export const enableUseEffectEventHook = __EXPERIMENTAL__;

// Test in www before enabling in open source.
// Enables DOM-server to stream its instruction set as data-attributes
// (handled with an MutationObserver) instead of inline-scripts
export const enableFizzExternalRuntime = true;

export const alwaysThrottleRetries = true;

export const useMicrotasksForSchedulingInFabric = false;

// -----------------------------------------------------------------------------
// Chopping Block
//
// Planned feature deprecations and breaking changes. Sorted roughly in order of
// when we plan to enable them.
// -----------------------------------------------------------------------------

// This flag enables Strict Effects by default. We're not turning this on until
// after 18 because it requires migration work. Recommendation is to use
// <StrictMode /> to gradually upgrade components.
// If TRUE, trees rendered with createRoot will be StrictEffectsMode.
// If FALSE, these trees will be StrictLegacyMode.
export const createRootStrictEffectsByDefault = false;

export const disableModulePatternComponents = false;

export const disableLegacyContext = false;

export const enableUseRefAccessWarning = false;

// Enables time slicing for updates that aren't wrapped in startTransition.
export const forceConcurrentByDefaultForTesting = false;

export const enableUnifiedSyncLane = __EXPERIMENTAL__;

// Adds an opt-in to time slicing for updates that aren't wrapped in startTransition.
export const allowConcurrentByDefault = false;

// -----------------------------------------------------------------------------
// React DOM Chopping Block
//
// Similar to main Chopping Block but only flags related to React DOM. These are
// grouped because we will likely batch all of them into a single major release.
// -----------------------------------------------------------------------------

// Disable support for comment nodes as React DOM containers. Already disabled
// in open source, but www codebase still relies on it. Need to remove.
export const disableCommentsAsDOMContainers = true;

// Disable javascript: URL strings in href for XSS protection.
export const disableJavaScriptURLs = false;

export const enableTrustedTypesIntegration = false;

// Prevent the value and checked attributes from syncing with their related
// DOM properties
export const disableInputAttributeSyncing = false;

// Remove IE and MsApp specific workarounds for innerHTML
export const disableIEWorkarounds = __EXPERIMENTAL__;

// Filter certain DOM attributes (e.g. src, href) if their values are empty
// strings. This prevents e.g. <img src=""> from making an unnecessary HTTP
// request for certain browsers.
export const enableFilterEmptyStringAttributesDOM = __EXPERIMENTAL__;

// Changes the behavior for rendering custom elements in both server rendering
// and client rendering, mostly to allow JSX attributes to apply to the custom
// element's object properties instead of only HTML attributes.
// https://github.com/facebook/react/issues/11347
export const enableCustomElementPropertySupport = __EXPERIMENTAL__;

// Disables children for <textarea> elements
export const disableTextareaChildren = false;

// -----------------------------------------------------------------------------
// Debugging and DevTools
// -----------------------------------------------------------------------------

// Adds user timing marks for e.g. state updates, suspense, and work loop stuff,
// for an experimental timeline tool.
export const enableSchedulingProfiler = __PROFILE__;

// Helps identify side effects in render-phase lifecycle hooks and setState
// reducers by double invoking them in StrictLegacyMode.
export const debugRenderPhaseSideEffectsForStrictMode = __DEV__;

// To preserve the "Pause on caught exceptions" behavior of the debugger, we
// replay the begin phase of a failed component inside invokeGuardedCallback.
export const replayFailedUnitOfWorkWithInvokeGuardedCallback = __DEV__;

// Gather advanced timing metrics for Profiler subtrees.
export const enableProfilerTimer = __PROFILE__;

// Record durations for commit and passive effects phases.
export const enableProfilerCommitHooks = __PROFILE__;

// Phase param passed to onRender callback differentiates between an "update" and a "cascading-update".
export const enableProfilerNestedUpdatePhase = __PROFILE__;

// Adds verbose console logging for e.g. state updates, suspense, and work loop
// stuff. Intended to enable React core members to more easily debug scheduling
// issues in DEV builds.
export const enableDebugTracing = false;

// Track which Fiber(s) schedule render work.
export const enableUpdaterTracking = __PROFILE__;

export const enableServerContext = true;

// Internal only.
export const enableGetInspectorDataForInstanceInProduction = false;

// Profiler API accepts a function to be called when a nested update is scheduled.
// This callback accepts the component type (class instance or function) the update is scheduled for.
export const enableProfilerNestedUpdateScheduledHook = false;

export const consoleManagedByDevToolsDuringStrictMode = true;

// Modern <StrictMode /> behaviour aligns more with what components
// components will encounter in production, especially when used With <Offscreen />.
// TODO: clean up legacy <StrictMode /> once tests pass WWW.
export const useModernStrictMode = false;
export const enableDO_NOT_USE_disableStrictPassiveEffect = false;
