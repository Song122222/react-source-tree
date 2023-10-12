/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type TypeOfMode = number;
/*
react中无论是初始的渲染，还是setstate或者由hooks派发出来的更新操作，都会调用createupdate方法创建一个update对象，
不同之处是，对于更新时的update对象来说lane字段是什么，是由与之相关的fiber的mode字段决定的:
下方是mode的类型
*/
export const NoMode = /*                         */ 0b0000000;
// TODO: Remove ConcurrentMode by reading from the root tag instead
export const ConcurrentMode = /*                 */ 0b0000001;
export const ProfileMode = /*                    */ 0b0000010;
export const DebugTracingMode = /*               */ 0b0000100;
export const StrictLegacyMode = /*               */ 0b0001000;
export const StrictEffectsMode = /*              */ 0b0010000;
export const ConcurrentUpdatesByDefaultMode = /* */ 0b0100000;
export const NoStrictPassiveEffectsMode = /*     */ 0b1000000;
